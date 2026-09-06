<?php

declare(strict_types=1);

namespace Vivien\Api\Notification;

use PHPMailer\PHPMailer\PHPMailer;
use Vivien\Api\Config;

final class GiftCardMailer
{
    public function __construct(private readonly Config $config)
    {
    }

    /** @param array<string, mixed> $order */
    public function sendIssued(array $order): void
    {
        if (!$this->enabled()) {
            return;
        }

        $payer = (string) ($order['payer_email'] ?? '');
        $recipient = (string) ($order['recipient_email'] ?? '');
        $recipients = array_values(array_unique(array_filter([$payer, $recipient], [$this, 'validEmail'])));
        if ($recipients === []) {
            return;
        }

        $language = $this->language((string) ($order['language'] ?? 'en'));
        $context = $this->context($order);

        foreach ($recipients as $email) {
            $isRecipient = $recipient !== '' && strcasecmp($email, $recipient) === 0;
            $subject = $this->issuedSubject($language, $isRecipient);
            [$html, $text] = $this->issuedBody($language, $context, $isRecipient);
            $this->send($email, $subject, $html, $text);
        }
    }

    /** @param array<string, mixed> $order */
    public function sendRefunded(array $order): void
    {
        if (!$this->enabled()) {
            return;
        }

        $email = (string) ($order['payer_email'] ?? '');
        if (!$this->validEmail($email)) {
            return;
        }

        $language = $this->language((string) ($order['language'] ?? 'en'));
        $context = $this->context($order);
        [$html, $text] = $this->refundedBody($language, $context);
        $this->send($email, $this->refundedSubject($language), $html, $text);
    }

    private function enabled(): bool
    {
        return $this->config->bool('GIFT_CARD_EMAILS_ENABLED', false);
    }

    /** @param array<string, mixed> $order @return array<string, string> */
    private function context(array $order): array
    {
        $baseUrl = rtrim($this->config->string('PUBLIC_BASE_URL', 'https://api.vivien.lv'), '/');
        $token = rawurlencode((string) ($order['public_token'] ?? ''));
        $sessionId = rawurlencode((string) ($order['stripe_checkout_session_id'] ?? ''));

        return [
            'recipient_name' => trim((string) ($order['recipient_first_name'] ?? '') . ' ' . (string) ($order['recipient_last_name'] ?? '')),
            'payer_email' => (string) ($order['payer_email'] ?? ''),
            'amount' => $this->money((int) ($order['amount_cents'] ?? 0), (string) ($order['currency'] ?? 'eur')),
            'card_number' => (string) ($order['card_number'] ?? ''),
            'wallet_url' => (string) ($order['passslot_url'] ?? ''),
            'qr_url' => $token !== '' ? "{$baseUrl}/v1/gift-cards/{$token}/qr" : '',
            'status_url' => $sessionId !== '' ? "{$baseUrl}/gift-card/result?session_id={$sessionId}" : '',
            'gift_message' => trim((string) ($order['gift_message'] ?? '')),
        ];
    }

    private function language(string $language): string
    {
        return in_array($language, ['en', 'lv', 'ru', 'fr'], true) ? $language : 'en';
    }

    private function issuedSubject(string $language, bool $isRecipient): string
    {
        return match ($language) {
            'lv' => $isRecipient ? 'Jūsu Vivien karte ir gatava' : 'Vivien karte ir gatava',
            'ru' => $isRecipient ? 'Ваша карта Vivien готова' : 'Карта Vivien готова',
            'fr' => $isRecipient ? 'Votre carte Vivien est prête' : 'La carte Vivien est prête',
            default => $isRecipient ? 'Your Vivien card is ready' : 'Your Vivien card purchase is complete',
        };
    }

    /** @param array<string, string> $context @return array{0: string, 1: string} */
    private function issuedBody(string $language, array $context, bool $isRecipient): array
    {
        $intro = match ($language) {
            'lv' => $isRecipient
                ? 'Jums ir nosūtīta Vivien karte.'
                : 'Paldies par pirkumu. Vivien karte ir gatava.',
            'ru' => $isRecipient
                ? 'Вам отправили карту Vivien.'
                : 'Спасибо за покупку. Карта Vivien готова.',
            'fr' => $isRecipient
                ? 'Une carte Vivien vous a été envoyée.'
                : 'Merci pour votre achat. La carte Vivien est prête.',
            default => $isRecipient
                ? 'A Vivien card has been sent to you.'
                : 'Thank you for your purchase. The Vivien card is ready.',
        };
        $button = match ($language) {
            'lv' => 'Atvērt karti',
            'ru' => 'Открыть карту',
            'fr' => 'Ouvrir la carte',
            default => 'Open card',
        };

        return $this->cardEmail($intro, $button, $context);
    }

    private function refundedSubject(string $language): string
    {
        return match ($language) {
            'lv' => 'Vivien kartes maksājums ir atmaksāts',
            'ru' => 'Платёж за карту Vivien возвращён',
            'fr' => 'Le paiement de la carte Vivien a été remboursé',
            default => 'Vivien card payment refunded',
        };
    }

    /** @param array<string, string> $context @return array{0: string, 1: string} */
    private function refundedBody(string $language, array $context): array
    {
        $intro = match ($language) {
            'lv' => 'Karti neizdevās aktivizēt, tāpēc maksājums tika atmaksāts.',
            'ru' => 'Карту не удалось активировать, поэтому платёж был возвращён.',
            'fr' => 'La carte n’a pas pu être activée, le paiement a donc été remboursé.',
            default => 'The card could not be activated, so the payment has been refunded.',
        };

        return $this->simpleEmail($intro, $context);
    }

    /** @param array<string, string> $context @return array{0: string, 1: string} */
    private function cardEmail(string $intro, string $button, array $context): array
    {
        $safe = array_map([$this, 'escape'], $context);
        $details = $this->detailsHtml($safe);
        $message = $safe['gift_message'] !== ''
            ? '<p style="margin:16px 0 0;color:#5f6368"><strong>Message:</strong><br>' . nl2br($safe['gift_message']) . '</p>'
            : '';
        $primaryUrl = $safe['wallet_url'] !== '' ? $safe['wallet_url'] : $safe['status_url'];
        $buttonHtml = $primaryUrl !== ''
            ? '<p style="margin:24px 0"><a href="' . $primaryUrl . '" style="background:#0b3d3f;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:999px;display:inline-block">' . $this->escape($button) . '</a></p>'
            : '';

        $html = $this->wrapHtml(
            '<p style="margin:0 0 16px">' . $this->escape($intro) . '</p>' .
            $details .
            $message .
            $buttonHtml,
        );
        $text = $intro . "\n\n" . $this->detailsText($context);
        if ($context['gift_message'] !== '') {
            $text .= "\nMessage:\n" . $context['gift_message'] . "\n";
        }
        if ($primaryUrl !== '') {
            $text .= "\n{$button}: {$primaryUrl}\n";
        }
        return [$html, $text];
    }

    /** @param array<string, string> $context @return array{0: string, 1: string} */
    private function simpleEmail(string $intro, array $context): array
    {
        $safe = array_map([$this, 'escape'], $context);
        $html = $this->wrapHtml(
            '<p style="margin:0 0 16px">' . $this->escape($intro) . '</p>' .
            $this->detailsHtml($safe),
        );
        return [$html, $intro . "\n\n" . $this->detailsText($context)];
    }

    /** @param array<string, string> $safe */
    private function detailsHtml(array $safe): string
    {
        $rows = [
            'Recipient' => $safe['recipient_name'],
            'Amount' => $safe['amount'],
            'Card number' => $safe['card_number'],
        ];
        $html = '<table style="border-collapse:collapse;width:100%;margin-top:12px">';
        foreach ($rows as $label => $value) {
            if ($value === '') {
                continue;
            }
            $html .= '<tr><td style="padding:6px 0;color:#5f6368">' . $label . '</td><td style="padding:6px 0;text-align:right">' . $value . '</td></tr>';
        }
        $html .= '</table>';
        if ($safe['qr_url'] !== '') {
            $html .= '<p style="margin:16px 0 0;color:#5f6368">QR code: <a href="' . $safe['qr_url'] . '">' . $safe['qr_url'] . '</a></p>';
        }
        if ($safe['status_url'] !== '') {
            $html .= '<p style="margin:8px 0 0;color:#5f6368">Status page: <a href="' . $safe['status_url'] . '">' . $safe['status_url'] . '</a></p>';
        }
        return $html;
    }

    /** @param array<string, string> $context */
    private function detailsText(array $context): string
    {
        $lines = [];
        foreach ([
            'Recipient' => $context['recipient_name'],
            'Amount' => $context['amount'],
            'Card number' => $context['card_number'],
            'Wallet URL' => $context['wallet_url'],
            'QR URL' => $context['qr_url'],
            'Status URL' => $context['status_url'],
        ] as $label => $value) {
            if ($value !== '') {
                $lines[] = "{$label}: {$value}";
            }
        }
        return implode("\n", $lines);
    }

    private function wrapHtml(string $body): string
    {
        return '<!doctype html><html><body style="margin:0;background:#f6f3ee;font-family:Arial,sans-serif;color:#172b2d">'
            . '<div style="max-width:620px;margin:0 auto;padding:28px 16px">'
            . '<div style="background:#ffffff;border-radius:16px;padding:28px;border:1px solid #e6ded2">'
            . '<h1 style="font-size:24px;margin:0 0 18px;color:#0b3d3f">Vivien</h1>'
            . $body
            . '</div></div></body></html>';
    }

    private function send(string $to, string $subject, string $html, string $text): void
    {
        $host = $this->setting('SENDPULSE_SMTP_HOST', 'VIVIEN_SMTP_HOST');
        $user = $this->setting('SENDPULSE_SMTP_USER', 'VIVIEN_SMTP_USER');
        $pass = $this->setting('SENDPULSE_SMTP_PASS', 'VIVIEN_SMTP_PASS');
        $from = $this->setting('GIFT_CARD_EMAIL_FROM', 'VIVIEN_MAIL_FROM');
        if ($host === '' || $user === '' || $pass === '' || !$this->validEmail($from)) {
            throw new \RuntimeException('Gift card email is enabled, but SMTP settings are incomplete');
        }

        $port = $this->config->int(
            'SENDPULSE_SMTP_PORT',
            $this->config->int('VIVIEN_SMTP_PORT', 465),
        );
        $secure = strtolower($this->setting('SENDPULSE_SMTP_SECURE', 'VIVIEN_SMTP_SECURE', $port === 465 ? 'ssl' : 'tls'));
        $fromName = $this->setting('GIFT_CARD_EMAIL_FROM_NAME', 'VIVIEN_MAIL_FROM_NAME', 'Brasserie Vivien');
        $replyTo = $this->setting('GIFT_CARD_EMAIL_REPLY_TO', 'VIVIEN_MAIL_FROM');

        $mail = new PHPMailer(true);
        $mail->CharSet = 'UTF-8';
        $mail->isSMTP();
        $mail->Host = $host;
        $mail->Port = $port;
        $mail->SMTPAuth = true;
        $mail->Username = $user;
        $mail->Password = $pass;
        $mail->Timeout = $this->config->int('SENDPULSE_SMTP_TIMEOUT', $this->config->int('VIVIEN_SMTP_TIMEOUT', 10));
        if ($secure === 'ssl' || $secure === 'smtps') {
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        } elseif ($secure === 'tls' || $secure === 'starttls') {
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        }
        $mail->setFrom($from, $fromName);
        if ($this->validEmail($replyTo)) {
            $mail->addReplyTo($replyTo);
        }
        foreach ($this->config->csv('GIFT_CARD_EMAIL_BCC') as $bcc) {
            if ($this->validEmail($bcc)) {
                $mail->addBCC($bcc);
            }
        }
        $mail->addAddress($to);
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body = $html;
        $mail->AltBody = $text;
        $mail->send();
    }

    private function setting(string $primary, string $fallback, string $default = ''): string
    {
        $value = $this->config->string($primary);
        return $value !== '' ? $value : $this->config->string($fallback, $default);
    }

    private function validEmail(string $email): bool
    {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }

    private function escape(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    private function money(int $cents, string $currency): string
    {
        $symbol = strtolower($currency) === 'eur' ? '€' : strtoupper($currency) . ' ';
        return $symbol . number_format($cents / 100, 2, '.', '');
    }
}
