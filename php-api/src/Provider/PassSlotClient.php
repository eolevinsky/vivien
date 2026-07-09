<?php

declare(strict_types=1);

namespace Vivien\Api\Provider;

use DateTimeImmutable;
use DateTimeZone;
use GuzzleHttp\ClientInterface;
use GuzzleHttp\Exception\GuzzleException;
use Vivien\Api\Config;

final class PassSlotClient implements PassSlotGateway
{
    public function __construct(
        private readonly ClientInterface $http,
        private readonly Config $config,
    ) {
    }

    public function createPass(
        string $cardNumber,
        string $firstName,
        string $lastName,
        int $amountCents,
        ?string $email = null,
    ): array {
        if ($this->config->string('PASSSLOT_MODE', 'mock') === 'mock') {
            return $this->mockPass($cardNumber);
        }
        $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
        $payload = [
            'cardNumber' => $cardNumber,
            'firstName' => $firstName,
            'lastName' => $lastName,
            'memberSince' => $now->format('d.m.Y'),
            'joinedAt' => $now->format('Y-m-d'),
            $this->config->string('PASSSLOT_BALANCE_FIELD', 'points') => $amountCents / 100,
            'email' => $email ?? '',
            'phoneNumber' => '',
            'offersUrl' => '',
            'message' => '',
            'referUrl' => '',
            'profileUrl' => '',
        ];
        $data = $this->request(
            'POST',
            sprintf(
                'templates/%s/pass',
                rawurlencode($this->config->string('PASSSLOT_TEMPLATE_ID', '6670122238476288')),
            ),
            ['json' => $payload],
            true,
        );
        foreach (['serialNumber', 'passTypeIdentifier', 'url'] as $field) {
            if (empty($data[$field])) {
                throw new ProviderException("PassSlot create response is missing {$field}");
            }
        }
        $this->assertHttpsUrl((string) $data['url']);
        return $data;
    }

    public function values(string $passType, string $serial, string $fallbackCardNumber): array
    {
        if ($this->config->string('PASSSLOT_MODE', 'mock') === 'mock') {
            return [
                'cardNumber' => $fallbackCardNumber,
                'barcode' => ['message' => $fallbackCardNumber],
            ];
        }
        $values = $this->request(
            'GET',
            sprintf('passes/%s/%s/values', rawurlencode($passType), rawurlencode($serial)),
        );
        $cardNumber = (string) ($values['cardNumber'] ?? $fallbackCardNumber);
        $values['barcode'] = ['message' => $cardNumber];
        return $values;
    }

    public function findByCardNumber(string $cardNumber): ?array
    {
        if ($this->config->string('PASSSLOT_MODE', 'mock') === 'mock') {
            return $this->mockPass($cardNumber);
        }
        $data = $this->request('GET', 'passes');
        $passes = array_is_list($data) ? $data : ($data['passes'] ?? []);
        foreach ($passes as $pass) {
            if (!is_array($pass) || empty($pass['passTypeIdentifier']) || empty($pass['serialNumber'])) {
                continue;
            }
            $values = $this->values(
                (string) $pass['passTypeIdentifier'],
                (string) $pass['serialNumber'],
                '',
            );
            if ((string) ($values['cardNumber'] ?? '') === $cardNumber) {
                if (empty($pass['url'])) {
                    $url = $this->request(
                        'GET',
                        sprintf(
                            'passes/%s/%s/url',
                            rawurlencode((string) $pass['passTypeIdentifier']),
                            rawurlencode((string) $pass['serialNumber']),
                        ),
                    );
                    $pass['url'] = $url['url'] ?? null;
                }
                $this->assertHttpsUrl((string) ($pass['url'] ?? ''));
                return $pass;
            }
        }
        return null;
    }

    public function updateBalance(string $passType, string $serial, int $balanceCents): void
    {
        if ($this->config->string('PASSSLOT_MODE', 'mock') === 'mock') {
            return;
        }
        $this->request(
            'PUT',
            sprintf(
                'passes/%s/%s/values/%s',
                rawurlencode($passType),
                rawurlencode($serial),
                rawurlencode($this->config->string('PASSSLOT_BALANCE_FIELD', 'points')),
            ),
            ['json' => ['value' => $balanceCents / 100]],
            true,
        );
    }

    public function deletePass(string $passType, string $serial): void
    {
        if ($this->config->string('PASSSLOT_MODE', 'mock') === 'mock') {
            return;
        }
        $this->request(
            'DELETE',
            sprintf('passes/%s/%s', rawurlencode($passType), rawurlencode($serial)),
            [],
            false,
            [200, 204, 404],
        );
    }

    /** @return array<string, mixed> */
    private function mockPass(string $cardNumber): array
    {
        $serial = 'mock-' . substr(hash('sha256', $cardNumber), 0, 20);
        return [
            'serialNumber' => $serial,
            'passTypeIdentifier' => $this->config->string(
                'PASSSLOT_EXPECTED_TYPE_IDENTIFIER',
                'pass.loyalty',
            ),
            'url' => "https://example.test/wallet/{$serial}",
        ];
    }

    /**
     * @param array<string, mixed> $options
     * @param list<int> $accepted
     * @return array<string, mixed>
     */
    private function request(
        string $method,
        string $path,
        array $options = [],
        bool $ambiguous = false,
        array $accepted = [],
    ): array {
        $key = $this->config->string('PASSSLOT_API_KEY');
        if ($key === '') {
            throw new ProviderException('PASSSLOT_API_KEY is not configured');
        }
        $options += [
            'auth' => [$key, ''],
            'headers' => ['Accept' => 'application/json'],
            'http_errors' => false,
            'timeout' => 20,
        ];
        try {
            $response = $this->http->request(
                $method,
                'https://api.passslot.com/v1/' . ltrim($path, '/'),
                $options,
            );
        } catch (GuzzleException $error) {
            throw new ProviderException(
                'PassSlot request failed: ' . $error->getMessage(),
                $ambiguous,
            );
        }
        $status = $response->getStatusCode();
        $accepted = $accepted ?: range(200, 299);
        if (!in_array($status, $accepted, true)) {
            throw new ProviderException(
                sprintf('PassSlot failed (%d): %s', $status, substr((string) $response->getBody(), 0, 500)),
            );
        }
        $body = trim((string) $response->getBody());
        if ($body === '') {
            return [];
        }
        $decoded = json_decode($body, true);
        if (!is_array($decoded)) {
            throw new ProviderException('PassSlot returned invalid JSON');
        }
        return $decoded;
    }

    private function assertHttpsUrl(string $url): void
    {
        if (!filter_var($url, FILTER_VALIDATE_URL) || parse_url($url, PHP_URL_SCHEME) !== 'https') {
            throw new ProviderException('PassSlot returned an invalid wallet URL');
        }
    }
}
