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
        $recipient = $this->shouldEmailRecipient($order) ? (string) ($order['recipient_email'] ?? '') : '';
        if (strcasecmp($payer, $recipient) === 0) {
            $recipient = '';
        }
        $recipients = array_values(array_unique(array_filter([$payer, $recipient], [$this, 'validEmail'])));
        if ($recipients === []) {
            return;
        }

        foreach ($recipients as $email) {
            $isRecipient = $recipient !== '' && strcasecmp($email, $recipient) === 0;
            $preview = $this->renderIssued($order, $isRecipient);
            $this->send($email, $preview['subject'], $preview['html'], $preview['text']);
        }
    }

    /** @param array<string, mixed> $order @return array{subject: string, html: string, text: string} */
    public function renderIssued(array $order, bool $isRecipient = false): array
    {
        $language = $this->language((string) ($order['language'] ?? 'en'));
        $context = $this->context($order);
        $subject = $this->issuedSubject($language, $isRecipient);
        if ($context['is_gift'] === '1') {
            $gift = $this->giftCopy($language, $context, $isRecipient);
            $subject = $gift['heading'];
        }
        [$html, $text] = $this->issuedBody($language, $context, $isRecipient);
        return ['subject' => $subject, 'html' => $html, 'text' => $text];
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
            'is_gift' => !empty($order['is_gift']) ? '1' : '0',
            'sender_name' => trim((string) ($order['sender_name'] ?? '')),
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
        $print = match ($language) {
            'lv' => 'Skatīt / drukāt karti',
            'ru' => 'Посмотреть / распечатать карту',
            'fr' => 'Voir / imprimer la carte',
            default => 'View / print card',
        };

        $context['heading'] = '';
        $context['eyebrow'] = $isRecipient ? 'Un cadeau pour vous' : 'Le plaisir d’offrir';
        $context['closing'] = '';
        $context['message_label'] = match ($language) {
            'lv' => 'Personīgs novēlējums',
            'ru' => 'Личное пожелание',
            'fr' => 'Un mot pour vous',
            default => 'A personal note',
        };
        $context['recipient_label'] = match ($language) {
            'lv' => 'Saņēmējs', 'ru' => 'Получатель', 'fr' => 'Bénéficiaire', default => 'Recipient',
        };
        $context['amount_label'] = match ($language) {
            'lv' => 'Kartes vērtība', 'ru' => 'Номинал карты', 'fr' => 'Valeur de la carte', default => 'Card value',
        };
        $context['card_label'] = match ($language) {
            'lv' => 'Kartes numurs', 'ru' => 'Номер карты', 'fr' => 'Numéro de carte', default => 'Card number',
        };
        if ($context['is_gift'] === '1') {
            $gift = $this->giftCopy($language, $context, $isRecipient);
            $context['heading'] = $gift['heading'];
            $context['closing'] = $gift['closing'];
            $intro = $gift['intro'];
        }

        return $this->cardEmail($intro, $button, $print, $context);
    }

    /** @param array<string, string> $context @return array{heading: string, intro: string, closing: string} */
    private function giftCopy(string $language, array $context, bool $isRecipient): array
    {
        $sender = $context['sender_name'];
        $name = $context['recipient_name'];
        $amount = $context['amount'];
        return match ($language) {
            'lv' => [
                'heading' => $isRecipient
                    ? ($sender !== '' ? "Jums ir dāvana no {$sender}!" : 'Jums ir dāvana Vivien!')
                    : 'Jūsu Vivien dāvana ir gatava',
                'intro' => $isRecipient
                    ? ($sender !== '' ? "Dāvana no {$sender}:" : 'Jums dāvanā ir') . " Brasserie Vivien karte {$amount} vērtībā. Aicinām nesteidzīgi baudīt franču virtuvi un sirsnīgu viesmīlību pašā Rīgas sirdī."
                    : "Paldies, ka izvēlējāties dāvināt Vivien pieredzi. Karte {$amount} vērtībā ir gatava saņēmējam: {$name}. Mēs ar prieku parūpēsimies par skaistu apmeklējumu.",
                'closing' => $isRecipient
                    ? 'Saglabājiet karti savā tālrunī vai izdrukājiet to un uzrādiet mūsu komandai apmeklējuma laikā. Bon appétit!'
                    : 'Jūsu kartes kopija ir zemāk — saglabājiet to vai izdrukājiet, lai pasniegtu personīgi.',
            ],
            'ru' => [
                'heading' => $isRecipient
                    ? ($sender !== '' ? "Вам подарок от {$sender}!" : 'Вас ждёт подарок в Vivien!')
                    : "Ваш подарок для {$name} готов",
                'intro' => $isRecipient
                    ? ($sender !== '' ? "{$sender} дарит вам" : 'Вам подарили') . " карту Brasserie Vivien на {$amount} — приглашение насладиться французской кухней и тёплым гостеприимством в самом сердце Риги. Оставьте суету за дверью: этот момент для вас."
                    : "Спасибо, что выбрали Vivien для подарка. Карта на {$amount} для {$name} готова. Будем рады превратить ваш добрый жест в приятные воспоминания.",
                'closing' => $isRecipient
                    ? 'Сохраните карту в телефоне или распечатайте её и покажите нашей команде во время визита. Bon appétit!'
                    : 'Ваша копия карты ниже — сохраните её или распечатайте, чтобы вручить лично.',
            ],
            'fr' => [
                'heading' => $isRecipient
                    ? ($sender !== '' ? "Un cadeau de la part de {$sender} !" : 'Un cadeau vous attend chez Vivien !')
                    : "Votre cadeau pour {$name} est prêt",
                'intro' => $isRecipient
                    ? ($sender !== '' ? "{$sender} vous offre" : 'Vous avez reçu') . " une carte Brasserie Vivien de {$amount} : une invitation à savourer la cuisine française et un accueil chaleureux au cœur de Riga. Prenez le temps, ce moment est pour vous."
                    : "Merci d’avoir choisi d’offrir un moment chez Vivien. Votre carte de {$amount} pour {$name} est prête. Nous serons ravis de faire de cette attention un beau souvenir.",
                'closing' => $isRecipient
                    ? 'Enregistrez la carte sur votre téléphone ou imprimez-la, puis présentez-la à notre équipe lors de votre visite. Bon appétit !'
                    : 'Votre copie de la carte se trouve ci-dessous. Gardez-la ou imprimez-la pour la remettre en personne.',
            ],
            default => [
                'heading' => $isRecipient
                    ? ($sender !== '' ? "You’ve received a gift from {$sender}!" : 'A gift is waiting for you at Vivien!')
                    : "Your gift for {$name} is ready",
                'intro' => $isRecipient
                    ? ($sender !== '' ? "{$sender} has treated you to" : 'You’ve been treated to') . " a {$amount} Brasserie Vivien card — an invitation to enjoy French cooking and a warm welcome in the heart of Riga. Take your time, savour the occasion and let us look after you."
                    : "Thank you for giving someone a moment at Vivien. Your {$amount} card for {$name} is ready, and we look forward to making your thoughtful gesture a lovely memory.",
                'closing' => $isRecipient
                    ? 'Save the card to your phone or print it, then present it to our team when you visit. Bon appétit!'
                    : 'Your copy of the card is below. Keep it for your records, or print it to give in person.',
            ],
        };
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
    private function cardEmail(string $intro, string $button, string $print, array $context): array
    {
        $safe = array_map([$this, 'escape'], $context);
        $details = $this->detailsHtml($safe);
        $message = $safe['gift_message'] !== ''
            ? '<div style="margin:24px 0;padding:18px 20px;background:#f7f0e5;border-left:3px solid #cda45e"><p style="margin:0 0 8px;font-size:12px;letter-spacing:1px;color:#850305">' . $safe['message_label'] . '</p><p style="margin:0;font:italic 18px/1.6 Georgia,serif">' . nl2br($safe['gift_message']) . '</p></div>'
            : '';
        $primaryUrl = $safe['wallet_url'] !== '' ? $safe['wallet_url'] : $safe['status_url'];
        $buttonHtml = $primaryUrl !== ''
            ? '<p style="margin:24px 0;text-align:center"><a href="' . $primaryUrl . '" style="background:#850305;border:1px solid #cda45e;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:4px;display:inline-block;font-weight:bold">' . $this->escape($button) . '</a></p>'
            : '';
        $printHtml = $safe['status_url'] !== ''
            ? '<p style="margin:12px 0 0;text-align:center"><a href="' . $safe['status_url'] . '" style="color:#850305;text-decoration:underline">' . $this->escape($print) . '</a></p>'
            : '';
        $qrHtml = $safe['qr_url'] !== ''
            ? '<div style="margin:20px auto;text-align:center"><img src="' . $safe['qr_url'] . '" width="190" height="190" alt="Vivien card QR code" style="display:inline-block;max-width:100%;background:#ffffff;padding:10px;border:1px solid #cda45e"></div>'
            : '';

        $heading = $safe['heading'] !== ''
            ? '<p style="margin:0 0 10px;color:#850305;font:italic 17px Georgia,serif">' . $safe['eyebrow'] . '</p><h1 style="margin:0 0 20px;color:#850305;font:normal 28px/1.25 Georgia,serif">' . $safe['heading'] . '</h1>'
            : '';
        $closing = $safe['closing'] !== ''
            ? '<p style="margin:24px 0 0">' . $safe['closing'] . '</p>' : '';

        $html = $this->wrapHtml(
            $heading .
            '<p style="margin:0 0 16px">' . $this->escape($intro) . '</p>' .
            $message .
            $details .
            $qrHtml .
            $buttonHtml .
            $printHtml .
            $closing,
        );
        $text = ($context['heading'] !== '' ? $context['heading'] . "\n\n" : '') . $intro . "\n\n" . $this->detailsText($context);
        if ($context['gift_message'] !== '') {
            $text .= "\n" . $context['message_label'] . ":\n" . $context['gift_message'] . "\n";
        }
        if ($primaryUrl !== '') {
            $text .= "\n{$button}: " . ($context['wallet_url'] ?: $context['status_url']) . "\n";
        }
        if ($context['status_url'] !== '') {
            $text .= "{$print}: {$context['status_url']}\n";
        }
        $text .= "\n" . $context['closing'] . "\n\nÀ bientôt chez Vivien\nBrasserie Vivien · Riga";
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
            ($safe['recipient_label'] ?? 'Recipient') => $safe['recipient_name'],
            ($safe['amount_label'] ?? 'Amount') => $safe['amount'],
            ($safe['card_label'] ?? 'Card number') => $safe['card_number'],
        ];
        $html = '<table role="presentation" style="border-collapse:collapse;width:100%;margin-top:12px;border-top:1px solid #cda45e;border-bottom:1px solid #cda45e">';
        foreach ($rows as $label => $value) {
            if ($value === '') {
                continue;
            }
            $html .= '<tr><td style="padding:12px 0;color:#766553">' . $label . '</td><td style="padding:12px 0 12px;text-align:right;color:#850305;overflow-wrap:anywhere">' . $value . '</td></tr>';
        }
        $html .= '</table>';
        return $html;
    }

    /** @param array<string, string> $context */
    private function detailsText(array $context): string
    {
        $lines = [];
        foreach ([
            ($context['recipient_label'] ?? 'Recipient') => $context['recipient_name'],
            ($context['amount_label'] ?? 'Amount') => $context['amount'],
            ($context['card_label'] ?? 'Card number') => $context['card_number'],
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
        return '<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f3e9dc;font:16px/1.65 Arial,sans-serif;color:#392d25">'
            . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3e9dc"><tr><td align="center" style="padding:24px 12px">'
            . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fffdf8;border:1px solid #cda45e">'
            . '<tr><td style="background:#850305;text-align:center;padding:26px 20px;border-bottom:3px solid #cda45e">'
            . '<p style="margin:0;color:#e3bd76;font:12px Arial,sans-serif;letter-spacing:4px">BRASSERIE</p>'
            . '<p style="margin:6px 0 0;color:#e3bd76;font:normal 40px Georgia,serif;letter-spacing:3px">VIVIEN</p>'
            . '</td></tr><tr><td style="padding:28px 22px">'
            . $body
            . '<p style="margin:28px 0 0;text-align:center;color:#850305;font:italic 19px Georgia,serif">À bientôt chez Vivien</p>'
            . '</td></tr><tr><td style="text-align:center;padding:16px;border-top:1px solid #cda45e;color:#766553;font-size:12px">'
            . '<a href="https://vivien.lv" style="color:#850305;text-decoration:none">Brasserie Vivien</a> &middot; Riga'
            . '</td></tr></table></td></tr></table></body></html>';
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

    /** @param array<string, mixed> $order */
    private function shouldEmailRecipient(array $order): bool
    {
        $enabled = (string) ($order['email_recipient'] ?? '0');
        return in_array(strtolower($enabled), ['1', 'true', 'yes', 'on'], true);
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
