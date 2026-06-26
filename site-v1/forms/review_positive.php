<?php
// Не выводим HTML, отвечаем лаконично
header('Content-Type: text/plain');

// 1. подключаем зависимости
require_once __DIR__ . '/../vendor/autoload.php';

use Sendpulse\RestApi\ApiClient;
use Sendpulse\RestApi\Storage\FileStorage;
use Sendpulse\RestApi\ApiClientException;

// 2. ключи
$apiUserId = getenv('SENDPULSE_API_USER_ID');
$apiSecret = getenv('SENDPULSE_API_SECRET');

// fallback на случай если getenv не сработал (временный хардкод — как ты сделал в review.php)
if (!$apiUserId) {
    $apiUserId = '1c878e0accc9f7a1fba7a17595afb935';
}
if (!$apiSecret) {
    $apiSecret = 'b2d098f2106cb31cade5df99c8e7402c';
}

// 3. читаем вход
$visitor_type = trim($_POST['visitor_type'] ?? '');
$source       = trim($_POST['source'] ?? '');
$language     = trim($_POST['language'] ?? '');
$sentiment    = trim($_POST['sentiment'] ?? ''); // ожидаем 'positive'

// 4. собираем письмо
$subject = 'New positive public-review intent';

$html =
    "<p><strong>Guest is heading to Google Reviews</strong></p>"
  . "<p>"
  . "<strong>Visitor type:</strong> " . htmlspecialchars($visitor_type) . "<br>"
  . "<strong>Source / reason:</strong> " . htmlspecialchars($source) . "<br>"
  . "<strong>Language:</strong> " . htmlspecialchars($language) . "<br>"
  . "<strong>Sentiment:</strong> " . htmlspecialchars($sentiment) . "<br>"
  . "</p>";

$text =
    "Guest is heading to Google Reviews\n"
  . "Visitor type: $visitor_type\n"
  . "Source / reason: $source\n"
  . "Language: $language\n"
  . "Sentiment: $sentiment\n";

$emailData = [
    'html'    => $html,
    'text'    => $text,
    'subject' => $subject,
    'from'    => [
        'name'  => 'Vivien Reviews',
        'email' => 'noreply@vivien.lv' // тот же подтвержденный отправитель
    ],
    'to'      => [
        ['email' => 'feedback@brivibas.planfix.com']
    ]
];

try {
    $SPApiClient = new ApiClient($apiUserId, $apiSecret, new FileStorage());
    $result = $SPApiClient->smtpSendMail($emailData);

    if (!empty($result['result'])) {
        echo 'OK';
    } else {
        echo 'ERROR';
    }

} catch (ApiClientException $e) {
    // не палим гостю детали, просто "ERROR"
    echo 'ERROR';
}
