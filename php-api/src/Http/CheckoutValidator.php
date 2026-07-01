<?php

declare(strict_types=1);

namespace Vivien\Api\Http;

final class CheckoutValidator
{
    /** @param array<string, mixed> $input @return array<string, mixed> */
    public static function validate(array $input): array
    {
        $amountRaw = $input['amount'] ?? null;
        if (!is_scalar($amountRaw) || !preg_match('/^\d+$/', (string) $amountRaw)) {
            throw new \InvalidArgumentException('Amount must be a whole number');
        }
        $amount = (int) $amountRaw;
        if ($amount < 10 || $amount > 500) {
            throw new \InvalidArgumentException('Amount must be between €10 and €500');
        }
        $payerEmail = trim((string) ($input['payer_email'] ?? ''));
        if (!filter_var($payerEmail, FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException('A valid payer email is required');
        }
        $recipientEmail = trim((string) ($input['recipient_email'] ?? ''));
        if ($recipientEmail !== '' && !filter_var($recipientEmail, FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException('Recipient email is invalid');
        }
        $birthday = self::birthday($input['recipient_birthday'] ?? null);
        $firstName = self::name($input['recipient_first_name'] ?? null, 'Recipient first name');
        $lastName = self::name($input['recipient_last_name'] ?? null, 'Recipient last name');
        $language = strtolower(trim((string) ($input['language'] ?? 'en')));
        $languageMap = [
            'english' => 'en',
            'latviešu' => 'lv',
            'français' => 'fr',
            'русский' => 'ru',
        ];
        $language = $languageMap[$language] ?? $language;
        if (!in_array($language, ['en', 'lv', 'fr', 'ru'], true)) {
            $language = 'en';
        }
        $payerNote = trim((string) ($input['payer_note'] ?? ''));
        $message = trim((string) ($input['message_to_recipient'] ?? ''));
        if (mb_strlen($payerNote) > 1000 || mb_strlen($message) > 2000) {
            throw new \InvalidArgumentException('Message is too long');
        }
        return [
            'amount_cents' => $amount * 100,
            'payer_email' => $payerEmail,
            'payer_note' => $payerNote,
            'recipient_first_name' => $firstName,
            'recipient_last_name' => $lastName,
            'recipient_email' => $recipientEmail === '' ? null : $recipientEmail,
            'recipient_birthday' => $birthday,
            'message_to_recipient' => $message,
            'language' => $language,
        ];
    }

    private static function name(mixed $value, string $label): string
    {
        $name = preg_replace('/\s+/u', ' ', trim((string) $value)) ?? '';
        if ($name === '' || mb_strlen($name) > 100) {
            throw new \InvalidArgumentException("{$label} is required and must be at most 100 characters");
        }
        return $name;
    }

    private static function birthday(mixed $value): ?string
    {
        $raw = trim((string) $value);
        if ($raw === '') {
            return null;
        }
        $formats = ['!d.m.Y', '!Y-m-d'];
        foreach ($formats as $format) {
            $date = \DateTimeImmutable::createFromFormat($format, $raw);
            if ($date && $date->format(substr($format, 1)) === $raw) {
                return $date->format('Y-m-d');
            }
        }
        throw new \InvalidArgumentException('Birthday must use DD.MM.YYYY format');
    }
}
