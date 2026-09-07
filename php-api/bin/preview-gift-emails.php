<?php

declare(strict_types=1);

// Offline previews only: no .env, SMTP, database or payment calls.
require dirname(__DIR__) . '/vendor/autoload.php';

use Endroid\QrCode\QrCode;
use Endroid\QrCode\Writer\SvgWriter;
use Vivien\Api\Config;
use Vivien\Api\Notification\GiftCardMailer;

$directory = dirname(__DIR__) . '/build-artifacts/email-previews';
if (!is_dir($directory)) {
    mkdir($directory, 0777, true);
}
$mailer = new GiftCardMailer(new Config(['PUBLIC_BASE_URL' => 'https://api.vivien.lv']));
$order = [
    'is_gift' => 1, 'sender_name' => 'Alex', 'language' => 'en',
    'recipient_first_name' => 'Seva', 'recipient_last_name' => '',
    'amount_cents' => 5000, 'currency' => 'eur', 'card_number' => 'PREVIEW — NOT REDEEMABLE',
    'public_token' => 'preview-only', 'stripe_checkout_session_id' => 'cs_test_preview_only',
    'passslot_url' => 'https://vivien.lv',
    'gift_message' => 'A little invitation to slow down, savour something delicious and enjoy a lovely moment at Vivien. Bon appétit!',
];
// An offline placeholder QR points to the restaurant homepage, not an issued card.
$qr = (new SvgWriter())->write(new QrCode(data: 'https://vivien.lv'))->getDataUri();
foreach (['recipient' => true, 'buyer' => false, 'self-purchase' => false] as $name => $recipient) {
    $data = $name === 'self-purchase' ? array_replace($order, ['is_gift' => 0, 'gift_message' => '']) : $order;
    $email = $mailer->renderIssued($data, $recipient);
    $html = str_replace('https://api.vivien.lv/v1/gift-cards/preview-only/qr', $qr, $email['html']);
    file_put_contents("{$directory}/{$name}.html", $html);
    file_put_contents("{$directory}/{$name}.txt", $email['subject'] . "\n\n" . $email['text']);
    echo "Generated offline {$name} preview\n";
}
