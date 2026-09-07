<?php

declare(strict_types=1);

namespace Vivien\Api\Tests;

use PHPUnit\Framework\TestCase;
use Vivien\Api\Config;
use Vivien\Api\Notification\GiftCardMailer;

final class GiftCardMailerTest extends TestCase
{
    private function order(array $overrides = []): array
    {
        return array_replace([
            'is_gift' => 1, 'sender_name' => 'Alex', 'language' => 'en',
            'recipient_first_name' => 'Jane', 'recipient_last_name' => 'Doe',
            'amount_cents' => 5000, 'currency' => 'eur', 'card_number' => 'TEST-123',
            'passslot_url' => 'https://example.com/card?a=1&b=2',
            'public_token' => 'preview-token', 'stripe_checkout_session_id' => 'cs_test_preview',
            'gift_message' => 'Enjoy your evening. Bon appétit!',
        ], $overrides);
    }

    private function mailer(): GiftCardMailer
    {
        return new GiftCardMailer(new Config(['PUBLIC_BASE_URL' => 'https://api.example.com']));
    }

    public function testRecipientReceivesPersonalGiftAndWorkingLinkTargets(): void
    {
        $mail = $this->mailer()->renderIssued($this->order(), true);
        self::assertSame('You’ve received a gift from Alex!', $mail['subject']);
        self::assertStringContainsString('Alex has treated you to a €50.00 Brasserie Vivien card', $mail['html']);
        self::assertStringContainsString('Un cadeau pour vous', $mail['html']);
        self::assertStringContainsString('À bientôt chez Vivien', $mail['html']);
        self::assertStringContainsString('https://example.com/card?a=1&amp;b=2', $mail['html']);
        self::assertStringContainsString('https://example.com/card?a=1&b=2', $mail['text']);
        self::assertStringContainsString('https://api.example.com/gift-card/result?session_id=cs_test_preview', $mail['html']);
        self::assertStringContainsString('#850305', $mail['html']);
        self::assertStringContainsString('#cda45e', $mail['html']);
        self::assertStringNotContainsString('#0b3d3f', $mail['html']);
    }

    public function testBuyerReceivesConfirmationNotRecipientGreeting(): void
    {
        $mail = $this->mailer()->renderIssued($this->order());
        self::assertSame('Your gift for Jane Doe is ready', $mail['subject']);
        self::assertStringContainsString('Le plaisir d’offrir', $mail['html']);
        self::assertStringNotContainsString('You’ve received a gift', $mail['html']);
        self::assertStringNotContainsString('Un cadeau pour vous', $mail['html']);
    }

    public function testSelfPurchaseKeepsExistingMessage(): void
    {
        $mail = $this->mailer()->renderIssued($this->order(['is_gift' => 0, 'gift_message' => '']));
        self::assertSame('Your Vivien card purchase is complete', $mail['subject']);
        self::assertStringContainsString('Thank you for your purchase. The Vivien card is ready.', $mail['html']);
        self::assertStringNotContainsString('Un cadeau pour vous', $mail['html']);
    }

    public function testPersonalTextIsEscapedInEveryLanguage(): void
    {
        foreach (['en', 'lv', 'fr', 'ru'] as $language) {
            $mail = $this->mailer()->renderIssued($this->order([
                'language' => $language, 'sender_name' => '<b>Alex & Sam</b>',
                'gift_message' => '<script>alert(1)</script>',
            ]), true);
            self::assertStringNotContainsString('<b>Alex', $mail['html']);
            self::assertStringNotContainsString('<script>', $mail['html']);
            self::assertStringContainsString('&lt;b&gt;Alex &amp; Sam&lt;/b&gt;', $mail['html']);
            self::assertStringContainsString('Bon appétit', $mail['html']);
        }
    }

    public function testLegacyOrderWithoutSenderHasNaturalFallback(): void
    {
        $mail = $this->mailer()->renderIssued($this->order(['sender_name' => '']), true);
        self::assertSame('A gift is waiting for you at Vivien!', $mail['subject']);
        self::assertStringContainsString('You’ve been treated to', $mail['html']);
    }
}
