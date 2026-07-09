<?php

declare(strict_types=1);

namespace Vivien\Api\Repository;

use PDO;
use Vivien\Api\Support\Clock;
use Vivien\Api\Support\Ids;

final class GiftCardRepository
{
    public function __construct(private readonly PDO $db)
    {
    }

    /** @param array<string, mixed> $input @return array{card: array<string, mixed>, order: array<string, mixed>} */
    public function createCheckout(array $input): array
    {
        $this->db->beginTransaction();
        try {
            $now = Clock::sql();
            $card = [
                'id' => Ids::uuid(),
                'public_token' => Ids::publicToken(),
                'card_number' => $this->newCardNumber(),
                'recipient_first_name' => $input['recipient_first_name'],
                'recipient_last_name' => $input['recipient_last_name'],
                'recipient_email' => $input['recipient_email'],
                'recipient_birthday' => $input['recipient_birthday'],
                'gift_message' => $input['message_to_recipient'],
                'language' => $input['language'],
                'currency' => 'eur',
                'balance_cents' => 0,
                'loyalty_balance_cents' => 0,
                'status' => 'pending',
                'created_at' => $now,
                'updated_at' => $now,
            ];
            $order = [
                'id' => Ids::uuid(),
                'gift_card_id' => $card['id'],
                'amount_cents' => $input['amount_cents'],
                'currency' => 'eur',
                'payer_email' => $input['payer_email'],
                'payer_note' => $input['payer_note'],
                'status' => 'created',
                'created_at' => $now,
                'updated_at' => $now,
            ];

            $stmt = $this->db->prepare(
                'INSERT INTO gift_cards
                (id, public_token, card_number, recipient_first_name, recipient_last_name,
                 recipient_email, recipient_birthday, gift_message, language, currency, balance_cents,
                 loyalty_balance_cents, status, created_at, updated_at)
                VALUES
                (:id, :public_token, :card_number, :recipient_first_name, :recipient_last_name,
                 :recipient_email, :recipient_birthday, :gift_message, :language, :currency, :balance_cents,
                 :loyalty_balance_cents, :status, :created_at, :updated_at)',
            );
            $stmt->execute($card);

            $stmt = $this->db->prepare(
                'INSERT INTO payment_orders
                (id, gift_card_id, amount_cents, currency, payer_email, payer_note, status,
                 created_at, updated_at)
                VALUES
                (:id, :gift_card_id, :amount_cents, :currency, :payer_email, :payer_note,
                 :status, :created_at, :updated_at)',
            );
            $stmt->execute($order);
            $this->db->commit();

            return ['card' => $card, 'order' => $order];
        } catch (\Throwable $error) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $error;
        }
    }

    /** @return array<string, mixed>|null */
    public function order(string $id): ?array
    {
        return $this->one(
            'SELECT o.*, c.public_token, c.card_number, c.recipient_first_name,
                    c.recipient_last_name, c.recipient_email, c.recipient_birthday,
                    c.gift_message, c.language,
                    c.balance_cents, c.loyalty_balance_cents, c.status AS card_status,
                    c.passslot_serial_number, c.passslot_type_identifier, c.passslot_url,
                    c.barcode, c.syrve_customer_id, c.syrve_gift_wallet_id,
                    c.syrve_loyalty_wallet_id
             FROM payment_orders o
             JOIN gift_cards c ON c.id = o.gift_card_id
             WHERE o.id = :id',
            ['id' => $id],
        );
    }

    /** @return array<string, mixed>|null */
    public function orderByCheckoutSession(string $sessionId): ?array
    {
        $row = $this->one(
            'SELECT id FROM payment_orders WHERE stripe_checkout_session_id = :session_id',
            ['session_id' => $sessionId],
        );
        return $row ? $this->order((string) $row['id']) : null;
    }

    /** @return array<string, mixed>|null */
    public function orderByPaymentIntent(string $paymentIntentId): ?array
    {
        $row = $this->one(
            'SELECT id FROM payment_orders WHERE stripe_payment_intent_id = :payment_intent_id',
            ['payment_intent_id' => $paymentIntentId],
        );
        return $row ? $this->order((string) $row['id']) : null;
    }

    /** @return array<string, mixed>|null */
    public function orderByRefund(string $refundId): ?array
    {
        $row = $this->one(
            'SELECT id FROM payment_orders WHERE stripe_refund_id = :refund_id',
            ['refund_id' => $refundId],
        );
        return $row ? $this->order((string) $row['id']) : null;
    }

    /** @return array<string, mixed>|null */
    public function cardByToken(string $token): ?array
    {
        return $this->one(
            'SELECT c.*, o.id AS order_id, o.amount_cents, o.currency AS order_currency,
                    o.status AS order_status
             FROM gift_cards c
             JOIN payment_orders o ON o.gift_card_id = c.id
             WHERE c.public_token = :token
             ORDER BY o.created_at DESC LIMIT 1',
            ['token' => $token],
        );
    }

    /** @return array<string, mixed>|null */
    public function cardByProviderIdentifier(?string $customerId, ?string $identifier): ?array
    {
        if ($customerId !== null && $customerId !== '') {
            $row = $this->one(
                'SELECT id FROM gift_cards WHERE syrve_customer_id = :customer_id',
                ['customer_id' => $customerId],
            );
            if ($row) {
                return $this->cardById((string) $row['id']);
            }
        }
        if ($identifier !== null && $identifier !== '') {
            $row = $this->one(
                'SELECT id FROM gift_cards
                 WHERE card_number = :identifier OR barcode = :identifier LIMIT 1',
                ['identifier' => $identifier],
            );
            if ($row) {
                return $this->cardById((string) $row['id']);
            }
        }
        return null;
    }

    /** @return array<string, mixed>|null */
    public function cardById(string $id): ?array
    {
        return $this->one('SELECT * FROM gift_cards WHERE id = :id', ['id' => $id]);
    }

    /** @param array<string, mixed> $fields */
    public function updateOrder(string $id, array $fields): void
    {
        $this->update('payment_orders', $id, $fields);
    }

    /** @param array<string, mixed> $fields */
    public function updateCard(string $id, array $fields): void
    {
        $this->update('gift_cards', $id, $fields);
    }

    private function newCardNumber(): string
    {
        for ($attempt = 0; $attempt < 100; $attempt++) {
            $number = (string) random_int(10_000_000_000, 99_999_999_999);
            if (!$this->one(
                'SELECT id FROM gift_cards WHERE card_number = :number',
                ['number' => $number],
            )) {
                return $number;
            }
        }
        throw new \RuntimeException('Unable to allocate a unique card number');
    }

    /** @param array<string, mixed> $fields */
    private function update(string $table, string $id, array $fields): void
    {
        if ($fields === []) {
            return;
        }
        $fields['updated_at'] = Clock::sql();
        $sets = [];
        $params = ['id' => $id];
        foreach ($fields as $name => $value) {
            if (!preg_match('/^[a-z_]+$/', $name)) {
                throw new \InvalidArgumentException('Invalid database field');
            }
            $sets[] = sprintf('%s = :%s', $name, $name);
            $params[$name] = $value;
        }
        $stmt = $this->db->prepare(
            sprintf('UPDATE %s SET %s WHERE id = :id', $table, implode(', ', $sets)),
        );
        $stmt->execute($params);
    }

    /** @param array<string, mixed> $params @return array<string, mixed>|null */
    private function one(string $sql, array $params): ?array
    {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch();
        return is_array($row) ? $row : null;
    }
}
