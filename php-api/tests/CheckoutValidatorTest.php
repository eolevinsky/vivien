<?php

declare(strict_types=1);

namespace Vivien\Api\Tests;

use PHPUnit\Framework\TestCase;
use Vivien\Api\Http\CheckoutValidator;

final class CheckoutValidatorTest extends TestCase
{
    private function input(array $overrides = []): array
    {
        return array_replace([
            'amount' => '50', 'payer_email' => 'buyer@example.com',
            'recipient_first_name' => 'Jane', 'recipient_last_name' => 'Doe',
        ], $overrides);
    }

    public function testGiftSenderAndDeliveryAreStored(): void
    {
        $value = CheckoutValidator::validate($this->input([
            'is_gift' => '1', 'sender_name' => "  Alex   & Sam  ",
            'email_recipient' => 'yes', 'recipient_email' => 'jane@example.com',
            'message_to_recipient' => 'Bon appétit!',
        ]));
        self::assertSame(1, $value['is_gift']);
        self::assertSame('Alex & Sam', $value['sender_name']);
        self::assertSame(1, $value['email_recipient']);
        self::assertSame('Bon appétit!', $value['message_to_recipient']);
    }

    public function testHandDeliveredLoyaltyGiftDoesNotUseBuyerEmailForRecipient(): void
    {
        $value = CheckoutValidator::validate($this->input([
            'card_kind' => 'loyalty', 'is_gift' => '1', 'sender_name' => 'Alex',
            'recipient_email' => 'stale@example.com',
        ]));
        self::assertNull($value['recipient_email']);
        self::assertSame(0, $value['email_recipient']);
        self::assertSame(1, $value['is_gift']);
    }

    public function testTurningGiftOffIgnoresHiddenRecipientAndSender(): void
    {
        $value = CheckoutValidator::validate($this->input([
            'is_gift' => '0', 'sender_name' => 'Alex',
            'email_recipient' => 'yes', 'recipient_email' => 'stale@example.com',
        ]));
        self::assertNull($value['recipient_email']);
        self::assertSame('', $value['sender_name']);
        self::assertSame(0, $value['email_recipient']);
        self::assertSame(0, $value['is_gift']);
    }

    public function testOwnLoyaltyCardKeepsBuyerEmailFallback(): void
    {
        foreach ([[], ['is_gift' => '0']] as $fields) {
            $value = CheckoutValidator::validate($this->input(['card_kind' => 'loyalty', ...$fields]));
            self::assertSame('buyer@example.com', $value['recipient_email']);
            self::assertSame(0, $value['email_recipient']);
        }
    }

    public function testGiftEmailOptInRequiresAnAddress(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        CheckoutValidator::validate($this->input([
            'is_gift' => '1', 'sender_name' => 'Alex', 'email_recipient' => 'yes',
        ]));
    }

    public function testNewGiftFormRequiresSenderName(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        CheckoutValidator::validate($this->input(['is_gift' => '1']));
    }

    public function testValidCheckoutIsNormalized(): void
    {
        $value = CheckoutValidator::validate([
            'amount' => '50',
            'payer_email' => 'buyer@example.com',
            'payer_note' => '',
            'recipient_first_name' => '  Jane   Mary ',
            'recipient_last_name' => ' Doe ',
            'recipient_email' => '',
            'recipient_birthday' => '15.04.1990',
            'message_to_recipient' => 'Enjoy',
            'language' => 'français',
        ]);

        self::assertSame(5000, $value['amount_cents']);
        self::assertSame('Jane Mary', $value['recipient_first_name']);
        self::assertSame('Doe', $value['recipient_last_name']);
        self::assertNull($value['recipient_email']);
        self::assertSame(0, $value['email_recipient']);
        self::assertSame('1990-04-15', $value['recipient_birthday']);
        self::assertSame('fr', $value['language']);
    }

    public function testRecipientEmailOptInIsNormalized(): void
    {
        $value = CheckoutValidator::validate([
            'amount' => '50',
            'payer_email' => 'buyer@example.com',
            'recipient_first_name' => 'Jane',
            'recipient_last_name' => 'Doe',
            'recipient_email' => 'recipient@example.com',
            'email_recipient' => 'yes',
        ]);

        self::assertSame('recipient@example.com', $value['recipient_email']);
        self::assertSame(1, $value['email_recipient']);
    }

    public function testRecipientEmailOptInIsIgnoredForSameEmail(): void
    {
        $value = CheckoutValidator::validate([
            'amount' => '50',
            'payer_email' => 'buyer@example.com',
            'recipient_first_name' => 'Jane',
            'recipient_last_name' => 'Doe',
            'recipient_email' => 'BUYER@example.com',
            'email_recipient' => 'yes',
        ]);

        self::assertSame(0, $value['email_recipient']);
    }

    public function testAmountOutsideAllowedRangeIsRejected(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        CheckoutValidator::validate([
            'amount' => '9',
            'payer_email' => 'buyer@example.com',
            'recipient_first_name' => 'Jane',
            'recipient_last_name' => 'Doe',
        ]);
    }

    public function testInvalidRecipientEmailIsRejected(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        CheckoutValidator::validate([
            'amount' => '50',
            'payer_email' => 'buyer@example.com',
            'recipient_first_name' => 'Jane',
            'recipient_last_name' => 'Doe',
            'recipient_email' => 'not-an-email',
        ]);
    }

    public function testInvalidBirthdayIsRejected(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        CheckoutValidator::validate([
            'amount' => '50',
            'payer_email' => 'buyer@example.com',
            'recipient_first_name' => 'Jane',
            'recipient_last_name' => 'Doe',
            'recipient_birthday' => '04/15/1990',
        ]);
    }

    public function testIsoBirthdayIsStillAcceptedForServerCompatibility(): void
    {
        $value = CheckoutValidator::validate([
            'amount' => '50',
            'payer_email' => 'buyer@example.com',
            'recipient_first_name' => 'Jane',
            'recipient_last_name' => 'Doe',
            'recipient_birthday' => '1990-04-15',
        ]);

        self::assertSame('1990-04-15', $value['recipient_birthday']);
    }
}
