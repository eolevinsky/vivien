<?php

declare(strict_types=1);

namespace Vivien\Api\Application;

use Stripe\Refund;
use Stripe\StripeClient;
use Vivien\Api\Config;
use Vivien\Api\Provider\PassSlotGateway;
use Vivien\Api\Provider\ProviderException;
use Vivien\Api\Provider\SyrveGateway;
use Vivien\Api\Repository\GiftCardRepository;
use Vivien\Api\Repository\IntegrationRepository;
use Vivien\Api\Repository\JobQueue;
use Vivien\Api\Support\Clock;

final class GiftCardWorkflow
{
    public function __construct(
        private readonly Config $config,
        private readonly GiftCardRepository $cards,
        private readonly JobQueue $jobs,
        private readonly IntegrationRepository $integrations,
        private readonly PassSlotGateway $passslot,
        private readonly SyrveGateway $syrve,
        private readonly StripeClient $stripe,
    ) {
    }

    /** @param array<string, mixed> $job */
    public function process(array $job): void
    {
        match ($job['job_type']) {
            'passslot_create' => $this->createPass((string) $job['entity_id']),
            'syrve_create' => $this->createSyrveCustomer((string) $job['entity_id']),
            'syrve_fund' => $this->fundSyrve((string) $job['entity_id']),
            'finalize' => $this->finalize((string) $job['entity_id']),
            'sync_balance' => $this->syncBalance((string) $job['entity_id']),
            'refund' => $this->refund((string) $job['entity_id']),
            'revoke' => $this->revoke((string) $job['entity_id']),
            default => throw new \RuntimeException('Unknown job type: ' . $job['job_type']),
        };
    }

    public function queueFulfillment(string $orderId): void
    {
        $this->jobs->enqueue('passslot_create', $orderId, "passslot_create:{$orderId}");
    }

    public function queueRefund(string $orderId): void
    {
        $this->jobs->enqueue('refund', $orderId, "refund:{$orderId}");
    }

    public function queueRevoke(string $orderId, string $reason): void
    {
        $this->jobs->enqueue('revoke', $orderId, "revoke:{$orderId}", ['reason' => $reason]);
    }

    private function createPass(string $orderId): void
    {
        $order = $this->requirePaidOrder($orderId);
        if (!empty($order['passslot_serial_number'])) {
            $this->jobs->enqueue('syrve_create', $orderId, "syrve_create:{$orderId}");
            return;
        }
        $cardId = (string) $order['gift_card_id'];
        $key = "passslot:create:{$cardId}";
        $operation = $this->integrations->operation(
            $key,
            'passslot',
            'create_pass',
            $cardId,
            ['card_number' => $order['card_number'], 'amount_cents' => $order['amount_cents']],
        );
        $result = null;
        if (($operation['_existing'] ?? false) && ($operation['status'] ?? '') === 'started') {
            $result = $this->passslot->findByCardNumber((string) $order['card_number']);
        }
        $result ??= $this->passslot->createPass(
            (string) $order['card_number'],
            (string) $order['recipient_first_name'],
            (string) $order['recipient_last_name'],
            (int) $order['amount_cents'],
            $order['recipient_email'] !== null ? (string) $order['recipient_email'] : null,
        );
        $type = (string) ($result['passTypeIdentifier'] ?? '');
        $serial = (string) ($result['serialNumber'] ?? '');
        $url = (string) ($result['url'] ?? '');
        $expected = $this->config->string('PASSSLOT_EXPECTED_TYPE_IDENTIFIER', 'pass.loyalty');
        if ($type === '' || $serial === '' || $url === '' || ($expected !== '' && $type !== $expected)) {
            throw new ProviderException('PassSlot returned invalid pass identifiers');
        }
        $values = $this->passslot->values($type, $serial, (string) $order['card_number']);
        $barcode = (string) ($values['barcode']['message'] ?? '');
        if ($barcode === '') {
            throw new ProviderException('PassSlot pass does not contain a barcode');
        }
        $this->cards->updateCard($cardId, [
            'status' => 'provisioning',
            'passslot_serial_number' => $serial,
            'passslot_type_identifier' => $type,
            'passslot_url' => $url,
            'barcode' => $barcode,
        ]);
        $this->integrations->completeOperation($key, $serial, $result);
        $this->jobs->enqueue('syrve_create', $orderId, "syrve_create:{$orderId}");
    }

    private function createSyrveCustomer(string $orderId): void
    {
        $order = $this->requirePaidOrder($orderId);
        $cardId = (string) $order['gift_card_id'];
        if (empty($order['syrve_customer_id'])) {
            $key = "syrve:create_customer:{$cardId}";
            $this->integrations->operation(
                $key,
                'syrve',
                'create_customer',
                $cardId,
                ['barcode' => $order['barcode']],
            );
            $customerId = $this->syrve->createCustomer(
                (string) $order['barcode'],
                (string) $order['recipient_first_name'],
                (string) $order['recipient_last_name'],
                (string) $order['passslot_serial_number'],
                $order['recipient_email'] !== null ? (string) $order['recipient_email'] : null,
                $order['recipient_birthday'] !== null ? (string) $order['recipient_birthday'] : null,
            );
            $walletId = $this->syrve->defaultWalletId($customerId);
            $this->cards->updateCard($cardId, [
                'syrve_customer_id' => $customerId,
                'syrve_gift_wallet_id' => $walletId,
                'syrve_loyalty_wallet_id' => $walletId,
            ]);
            $this->integrations->completeOperation(
                $key,
                $customerId,
                ['wallet_id' => $walletId],
            );
        }
        $this->jobs->enqueue('syrve_fund', $orderId, "syrve_fund:{$orderId}");
    }

    private function fundSyrve(string $orderId): void
    {
        $order = $this->requirePaidOrder($orderId);
        $reference = "vivien-gift:{$orderId}:{$order['stripe_payment_intent_id']}";
        $key = "syrve:topup:{$orderId}";
        $operation = $this->integrations->operation(
            $key,
            'syrve',
            'wallet_topup',
            $orderId,
            ['amount_cents' => $order['amount_cents'], 'comment' => $reference],
        );
        if (($operation['status'] ?? '') !== 'completed') {
            if (!$this->syrve->hasTransaction((string) $order['syrve_customer_id'], $reference)) {
                $this->syrve->topUp(
                    (string) $order['syrve_customer_id'],
                    (string) $order['syrve_gift_wallet_id'],
                    (int) $order['amount_cents'],
                    $reference,
                );
            }
            if (!$this->syrve->hasTransaction((string) $order['syrve_customer_id'], $reference)) {
                throw new ProviderException('Syrve top-up could not be verified', true);
            }
            $this->integrations->completeOperation($key, null, ['verified_by_comment' => $reference]);
        }
        $this->jobs->enqueue('finalize', $orderId, "finalize:{$orderId}");
    }

    private function finalize(string $orderId): void
    {
        $order = $this->requirePaidOrder($orderId);
        if ($order['card_status'] === 'ready') {
            return;
        }
        $balance = $this->syrve->balanceCents(
            (string) $order['syrve_customer_id'],
            (string) $order['syrve_gift_wallet_id'],
        );
        if ($balance < (int) $order['amount_cents']) {
            throw new ProviderException('Syrve wallet balance is below the paid amount');
        }
        $this->passslot->updateBalance(
            (string) $order['passslot_type_identifier'],
            (string) $order['passslot_serial_number'],
            $balance,
        );
        $this->cards->updateCard((string) $order['gift_card_id'], [
            'balance_cents' => $balance,
            'loyalty_balance_cents' => $balance,
            'status' => 'ready',
        ]);
        $this->event('gift_card.issued', $order, ['amount_cents' => $order['amount_cents']]);
    }

    public function syncBalance(string $cardId): void
    {
        $card = $this->cards->cardById($cardId);
        if (!$card || empty($card['syrve_customer_id']) || empty($card['syrve_gift_wallet_id'])) {
            return;
        }
        $balance = $this->syrve->balanceCents(
            (string) $card['syrve_customer_id'],
            (string) $card['syrve_gift_wallet_id'],
        );
        if ((int) $card['balance_cents'] === $balance) {
            return;
        }
        $this->passslot->updateBalance(
            (string) $card['passslot_type_identifier'],
            (string) $card['passslot_serial_number'],
            $balance,
        );
        $previous = (int) $card['balance_cents'];
        $this->cards->updateCard($cardId, [
            'balance_cents' => $balance,
            'loyalty_balance_cents' => $balance,
        ]);
        $this->integrations->outbox('gift_card.balance_changed', $cardId, [
            'event' => 'gift_card.balance_changed',
            'card_id' => $cardId,
            'card_number' => $card['card_number'],
            'previous_balance_cents' => $previous,
            'balance_cents' => $balance,
            'created_at' => Clock::now()->format(DATE_ATOM),
        ]);
    }

    public function refund(string $orderId): void
    {
        $order = $this->cards->order($orderId);
        if (!$order || $order['status'] === 'refunded') {
            return;
        }
        $this->cards->updateOrder($orderId, ['status' => 'refunding']);
        $this->cards->updateCard((string) $order['gift_card_id'], ['status' => 'refunding']);
        if (!empty($order['syrve_customer_id']) && !empty($order['syrve_gift_wallet_id'])) {
            $topup = "vivien-gift:{$orderId}:{$order['stripe_payment_intent_id']}";
            $compensation = "vivien-refund:{$orderId}:{$order['stripe_payment_intent_id']}";
            if ($this->syrve->hasTransaction((string) $order['syrve_customer_id'], $topup)
                && !$this->syrve->hasTransaction((string) $order['syrve_customer_id'], $compensation)) {
                $this->syrve->chargeOff(
                    (string) $order['syrve_customer_id'],
                    (string) $order['syrve_gift_wallet_id'],
                    (int) $order['amount_cents'],
                    $compensation,
                );
            }
            if ($this->syrve->hasTransaction((string) $order['syrve_customer_id'], $topup)
                && !$this->syrve->hasTransaction((string) $order['syrve_customer_id'], $compensation)) {
                throw new ProviderException('Syrve refund compensation could not be verified');
            }
        }
        if (!empty($order['passslot_serial_number'])) {
            $this->passslot->deletePass(
                (string) $order['passslot_type_identifier'],
                (string) $order['passslot_serial_number'],
            );
        }
        if (!empty($order['syrve_customer_id'])) {
            try {
                $this->syrve->deleteCustomer((string) $order['syrve_customer_id']);
            } catch (ProviderException) {
                // Syrve commonly rejects deletion after wallet transactions. A zero balance is sufficient.
            }
        }
        if (empty($order['stripe_payment_intent_id'])) {
            throw new \RuntimeException('Order has no Stripe PaymentIntent');
        }
        /** @var Refund $refund */
        $refund = $this->stripe->refunds->create(
            ['payment_intent' => $order['stripe_payment_intent_id']],
            ['idempotency_key' => "vivien-refund-{$orderId}"],
        );
        $this->cards->updateOrder($orderId, [
            'stripe_refund_id' => $refund->id,
            'status' => 'refunded',
        ]);
        $this->cards->updateCard((string) $order['gift_card_id'], ['status' => 'refunded']);
        $this->event('gift_card.refunded', $order, ['amount_cents' => $order['amount_cents']]);
    }

    public function revoke(string $orderId): void
    {
        $order = $this->cards->order($orderId);
        if (!$order || $order['card_status'] === 'revoked') {
            return;
        }
        $this->cards->updateCard((string) $order['gift_card_id'], ['status' => 'revoking']);
        if (!empty($order['syrve_customer_id']) && !empty($order['syrve_gift_wallet_id'])) {
            $topup = "vivien-gift:{$orderId}:{$order['stripe_payment_intent_id']}";
            $compensation = "vivien-dispute:{$orderId}:{$order['stripe_payment_intent_id']}";
            if ($this->syrve->hasTransaction((string) $order['syrve_customer_id'], $topup)
                && !$this->syrve->hasTransaction((string) $order['syrve_customer_id'], $compensation)) {
                $this->syrve->chargeOff(
                    (string) $order['syrve_customer_id'],
                    (string) $order['syrve_gift_wallet_id'],
                    (int) $order['amount_cents'],
                    $compensation,
                );
            }
            if ($this->syrve->hasTransaction((string) $order['syrve_customer_id'], $topup)
                && !$this->syrve->hasTransaction((string) $order['syrve_customer_id'], $compensation)) {
                throw new ProviderException('Syrve dispute compensation could not be verified');
            }
        }
        if (!empty($order['passslot_serial_number'])) {
            $this->passslot->deletePass(
                (string) $order['passslot_type_identifier'],
                (string) $order['passslot_serial_number'],
            );
        }
        $this->cards->updateCard((string) $order['gift_card_id'], [
            'balance_cents' => 0,
            'loyalty_balance_cents' => 0,
            'status' => 'revoked',
        ]);
        $this->event('gift_card.revoked', $order, ['amount_cents' => $order['amount_cents']]);
    }

    /** @return array<string, mixed> */
    private function requirePaidOrder(string $orderId): array
    {
        $order = $this->cards->order($orderId);
        if (!$order) {
            throw new \RuntimeException('Order not found');
        }
        if ($order['status'] !== 'paid') {
            throw new \RuntimeException('Order is not paid');
        }
        return $order;
    }

    /** @param array<string, mixed> $order @param array<string, mixed> $extra */
    private function event(string $type, array $order, array $extra): void
    {
        $this->integrations->outbox($type, (string) $order['gift_card_id'], [
            'event' => $type,
            'card_id' => $order['gift_card_id'],
            'card_number' => $order['card_number'],
            'recipient' => [
                'first_name' => $order['recipient_first_name'],
                'last_name' => $order['recipient_last_name'],
                'email' => $order['recipient_email'],
                'birthday' => $order['recipient_birthday'],
            ],
            'currency' => $order['currency'],
            'stripe_payment_intent_id' => $order['stripe_payment_intent_id'],
            'created_at' => Clock::now()->format(DATE_ATOM),
            ...$extra,
        ]);
    }
}
