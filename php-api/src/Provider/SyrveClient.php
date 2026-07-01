<?php

declare(strict_types=1);

namespace Vivien\Api\Provider;

use DateTimeImmutable;
use DateTimeZone;
use GuzzleHttp\ClientInterface;
use GuzzleHttp\Exception\GuzzleException;
use Vivien\Api\Config;

final class SyrveClient implements SyrveGateway
{
    private ?string $token = null;
    private ?DateTimeImmutable $tokenExpiresAt = null;

    /** @var array<string, array{wallet: string, balance: int, transactions: list<string>}> */
    private array $mockCustomers = [];

    public function __construct(
        private readonly ClientInterface $http,
        private readonly Config $config,
    ) {
    }

    public function createCustomer(
        string $barcode,
        string $firstName,
        string $lastName,
        string $serial,
        ?string $email = null,
        ?string $birthday = null,
    ): string {
        if ($this->isMock()) {
            $id = $this->mockUuid("customer:{$barcode}");
            $this->mockCustomers[$id] ??= [
                'wallet' => $this->mockUuid("wallet:{$id}"),
                'balance' => 0,
                'transactions' => [],
            ];
            return $id;
        }
        $payload = [
            'cardTrack' => $barcode,
            'cardNumber' => $barcode,
            'name' => $firstName,
            'surName' => $lastName,
            'consentStatus' => 0,
            'shouldReceiveLoyaltyInfo' => false,
            'shouldReceivePromoActionsInfo' => false,
            'organizationId' => $this->config->string('SYRVE_ORGANIZATION_ID'),
            'userData' => $serial,
        ];
        if ($email !== null && $email !== '') {
            $payload['email'] = $email;
        }
        if ($birthday !== null && $birthday !== '') {
            $payload['birthday'] = $birthday . ' 00:00:00.000';
        }
        $data = $this->post($this->loyaltyBase() . '/customer/create_or_update', $payload);
        if (empty($data['id'])) {
            throw new ProviderException('Syrve create customer response is missing id');
        }
        return (string) $data['id'];
    }

    public function defaultWalletId(string $customerId): string
    {
        if ($this->isMock()) {
            return $this->mockCustomers[$customerId]['wallet'];
        }
        $info = $this->customerInfo($customerId);
        $wallets = $info['walletBalances'] ?? $info['wallet_balances'] ?? [];
        $preferred = array_values(array_filter(
            $wallets,
            static fn (array $wallet): bool =>
                (int) ($wallet['type'] ?? -1) === 1
                || str_contains(strtolower((string) ($wallet['name'] ?? '')), 'vivien loyalty general'),
        ));
        $selected = $preferred[0] ?? (count($wallets) === 1 ? $wallets[0] : null);
        if (!is_array($selected) || empty($selected['id'])) {
            throw new ProviderException('Unable to identify the Syrve wallet for web gift cards');
        }
        return (string) $selected['id'];
    }

    public function topUp(
        string $customerId,
        string $walletId,
        int $amountCents,
        string $comment,
    ): void {
        if ($this->isMock()) {
            if (!in_array($comment, $this->mockCustomers[$customerId]['transactions'], true)) {
                $this->mockCustomers[$customerId]['balance'] += $amountCents;
                $this->mockCustomers[$customerId]['transactions'][] = $comment;
            }
            return;
        }
        $this->post($this->loyaltyBase() . '/customer/wallet/topup', [
            'customerId' => $customerId,
            'walletId' => $walletId,
            'sum' => $amountCents / 100,
            'comment' => $comment,
            'organizationId' => $this->config->string('SYRVE_ORGANIZATION_ID'),
        ], true);
    }

    public function chargeOff(
        string $customerId,
        string $walletId,
        int $amountCents,
        string $comment,
    ): void {
        if ($this->isMock()) {
            if (!in_array($comment, $this->mockCustomers[$customerId]['transactions'], true)) {
                $this->mockCustomers[$customerId]['balance'] -= $amountCents;
                $this->mockCustomers[$customerId]['transactions'][] = $comment;
            }
            return;
        }
        $this->post($this->loyaltyBase() . '/customer/wallet/chargeoff', [
            'customerId' => $customerId,
            'walletId' => $walletId,
            'sum' => $amountCents / 100,
            'comment' => $comment,
            'organizationId' => $this->config->string('SYRVE_ORGANIZATION_ID'),
        ], true);
    }

    public function balanceCents(string $customerId, string $walletId): int
    {
        if ($this->isMock()) {
            return $this->mockCustomers[$customerId]['balance'];
        }
        $info = $this->customerInfo($customerId);
        foreach ($info['walletBalances'] ?? $info['wallet_balances'] ?? [] as $wallet) {
            if ((string) ($wallet['id'] ?? '') === $walletId) {
                return (int) round(((float) ($wallet['balance'] ?? 0)) * 100);
            }
        }
        throw new ProviderException('Configured Syrve wallet was not found on customer');
    }

    public function hasTransaction(string $customerId, string $comment): bool
    {
        if ($this->isMock()) {
            return in_array($comment, $this->mockCustomers[$customerId]['transactions'], true);
        }
        $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
        for ($page = 0; $page < 10; $page++) {
            $data = $this->post($this->loyaltyBase() . '/customer/transactions/by_date', [
                'customerId' => $customerId,
                'dateFrom' => $now->modify('-7 days')->format(DATE_ATOM),
                'dateTo' => $now->modify('+5 minutes')->format(DATE_ATOM),
                'pageNumber' => $page,
                'pageSize' => 100,
                'organizationId' => $this->config->string('SYRVE_ORGANIZATION_ID'),
            ]);
            $transactions = $data['transactions'] ?? [];
            foreach ($transactions as $transaction) {
                if (($transaction['comment'] ?? null) === $comment) {
                    return true;
                }
            }
            if (count($transactions) < 100) {
                return false;
            }
        }
        return false;
    }

    public function deleteCustomer(string $customerId): void
    {
        if ($this->isMock()) {
            unset($this->mockCustomers[$customerId]);
            return;
        }
        try {
            $this->post($this->loyaltyBase() . '/delete_customers', [
                'customerIds' => [$customerId],
                'organizationId' => $this->config->string('SYRVE_ORGANIZATION_ID'),
            ]);
        } catch (ProviderException $error) {
            if (!str_contains($error->getMessage(), 'CustomerNotFound')
                && !str_contains($error->getMessage(), 'There is no user with id')) {
                throw $error;
            }
        }
    }

    /** @return array<string, mixed> */
    private function customerInfo(string $customerId): array
    {
        return $this->post($this->loyaltyBase() . '/customer/info', [
            'type' => 'id',
            'id' => $customerId,
            'organizationId' => $this->config->string('SYRVE_ORGANIZATION_ID'),
        ]);
    }

    /** @param array<string, mixed> $payload @return array<string, mixed> */
    private function post(string $path, array $payload, bool $ambiguous = false): array
    {
        try {
            $response = $this->http->request(
                'POST',
                rtrim($this->config->string('SYRVE_BASE_URL', 'https://api-eu.syrve.live'), '/') . $path,
                [
                    'json' => $payload,
                    'headers' => ['Authorization' => 'Bearer ' . $this->accessToken()],
                    'http_errors' => false,
                    'timeout' => 20,
                ],
            );
        } catch (GuzzleException $error) {
            throw new ProviderException('Syrve request failed: ' . $error->getMessage(), $ambiguous);
        }
        $status = $response->getStatusCode();
        $body = (string) $response->getBody();
        if ($status < 200 || $status >= 300) {
            throw new ProviderException("Syrve failed ({$status}): " . substr($body, 0, 500));
        }
        $data = $body === '' ? [] : json_decode($body, true);
        if (!is_array($data)) {
            throw new ProviderException('Syrve returned invalid JSON');
        }
        if (!empty($data['errorDescription'])
            || (int) ($data['httpStatusCode'] ?? 0) >= 400
            || !empty($data['errorCode'])) {
            throw new ProviderException(
                'Syrve error: ' . (string) (
                    $data['message']
                    ?? $data['description']
                    ?? $data['errorDescription']
                    ?? $data['errorCode']
                ),
            );
        }
        return $data;
    }

    private function accessToken(): string
    {
        if ($this->isMock()) {
            return 'mock-token';
        }
        $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
        if ($this->token && $this->tokenExpiresAt && $this->tokenExpiresAt > $now) {
            return $this->token;
        }
        $login = $this->config->string('SYRVE_API_LOGIN');
        if ($login === '') {
            throw new ProviderException('SYRVE_API_LOGIN is not configured');
        }
        try {
            $response = $this->http->request(
                'POST',
                rtrim($this->config->string('SYRVE_BASE_URL', 'https://api-eu.syrve.live'), '/')
                    . '/api/1/access_token',
                ['json' => ['apiLogin' => $login], 'http_errors' => false, 'timeout' => 20],
            );
        } catch (GuzzleException $error) {
            throw new ProviderException('Syrve token request failed: ' . $error->getMessage());
        }
        $data = json_decode((string) $response->getBody(), true);
        if ($response->getStatusCode() < 200
            || $response->getStatusCode() >= 300
            || !is_array($data)
            || empty($data['token'])) {
            throw new ProviderException('Syrve token request failed');
        }
        $this->token = (string) $data['token'];
        $this->tokenExpiresAt = $now->modify('+10 minutes');
        return $this->token;
    }

    private function loyaltyBase(): string
    {
        return '/api/1/loyalty/' . $this->config->string('SYRVE_LOYALTY_PREFIX', 'syrve');
    }

    private function isMock(): bool
    {
        return $this->config->string('SYRVE_MODE', 'mock') === 'mock';
    }

    private function mockUuid(string $value): string
    {
        $hex = substr(hash('sha256', $value), 0, 32);
        return sprintf(
            '%s-%s-4%s-8%s-%s',
            substr($hex, 0, 8),
            substr($hex, 8, 4),
            substr($hex, 13, 3),
            substr($hex, 17, 3),
            substr($hex, 20, 12),
        );
    }
}
