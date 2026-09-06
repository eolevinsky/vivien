<?php

declare(strict_types=1);

namespace Vivien\Api\Tests;

use PHPUnit\Framework\TestCase;
use Vivien\Api\Http\CheckoutValidator;

final class CheckoutValidatorTest extends TestCase
{
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
