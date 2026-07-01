<?php
// Ответ в виде простого текста (validate.js ждёт 'OK')
header('Content-Type: text/plain; charset=UTF-8');

require_once __DIR__ . '/../vendor/autoload.php';

use Sendpulse\RestApi\ApiClient;
use Sendpulse\RestApi\Storage\FileStorage;
use Sendpulse\RestApi\ApiClientException;

/** ↓↓↓ ваши учётные данные SendPulse ↓↓↓ */
$apiUserId = '1c878e0accc9f7a1fba7a17595afb935';
$apiSecret = 'b2d098f2106cb31cade5df99c8e7402c';
/** ↑↑↑ ваши учётные данные SendPulse ↑↑↑ */

// Получатели (можно добавлять ещё адреса)
$recipients = [
  ['email' => 'gift-cards@brivibas.planfix.com'],
];

// Забираем поля формы
$amount   = isset($_POST['amount']) ? trim($_POST['amount']) : '';
$delivery_at = $_POST['delivery_at'] ?? ''; // может быть пустым; форматируете в письме как есть
$payer_email = isset($_POST['payer_email']) ? trim($_POST['payer_email']) : '';
$payer_note  = $_POST['payer_note'] ?? '';

$name     = isset($_POST['name'])  ? trim($_POST['name'])  : '';
$email    = isset($_POST['email']) ? trim($_POST['email']) : '';
$phone    = isset($_POST['phone']) ? trim($_POST['phone']) : '';

$gender   = $_POST['gender']    ?? '';
$birthdate= $_POST['birthdate'] ?? '';

$message_to_recipient = $_POST['message_to_recipient'] ?? '';
$language = trim($_POST['language'] ?? '');
$subject  = trim($_POST['subject']  ?? 'New Vivien Gift Card Order');

// Валидация обязательных полей
$errors = [];

// сумма 10..500 (целое число)
if ($amount === '' || !preg_match('/^\d+$/', $amount)) {
  $errors[] = 'Amount is required and must be an integer.';
} else {
  $amt = (int)$amount;
  if ($amt < 10 || $amt > 500) $errors[] = 'Amount must be between 10 and 500.';
}

// payer email обязателен
if ($payer_email === '' || !filter_var($payer_email, FILTER_VALIDATE_EMAIL)) {
  $errors[] = 'Payer email is required.';
}

// email получателя обязателен
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
  $errors[] = 'Recipient email is required.';
}

// телефон получателя обязателен (минимальная проверка — наличие цифр)
if ($phone === '' || !preg_match('/\d/', $phone)) {
  $errors[] = 'Recipient phone is required.';
}

if ($errors) {
  echo 'ERROR: ' . implode(' ', $errors);
  exit;
}

// Экранируем для HTML
function esc($s){ return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }

// HTML-часть (с сохранением переводов строк / двойных пробелов в сообщениях)
$amount_html      = esc($amount);
$delivery_at_html = esc($delivery_at);
$payer_email_html = esc($payer_email);
$payer_note_html  = esc($payer_note);
$name_html        = esc($name);
$email_html       = esc($email);
$phone_html       = esc($phone);
$gender_html      = esc($gender);
$birthdate_html   = esc($birthdate);
$language_html    = esc($language);

// Сообщения, где нужно сохранить форматирование
$payer_note_block =
  '<div style="white-space:pre-wrap; font-family:inherit; margin:0;">' .
  $payer_note_html . '</div>';

$message_to_recipient_block =
  '<div style="white-space:pre-wrap; font-family:inherit; margin:0;">' .
  esc($message_to_recipient) . '</div>';

// Тело письма (HTML)
$html =
  "<p><strong>New Vivien Gift Card Order</strong></p>" .
  "<p><strong>Amount:</strong> {$amount_html} €<br>" .
  "<strong>Delivery at:</strong> {$delivery_at_html}</p>" .

  "<p><strong>Payer email:</strong> {$payer_email_html}<br>" .
  "<strong>Payer note:</strong><br>{$payer_note_block}</p>" .

  "<p><strong>Recipient name:</strong> {$name_html}<br>" .
  "<strong>Recipient Email:</strong> {$email_html}<br>" .
  "<strong>Recipient Phone:</strong> {$phone_html}</p>" .

  "<p><strong>Message to recipient:</strong><br>{$message_to_recipient_block}</p>" .

  "<p><strong>Gender:</strong> {$gender_html}<br>" .
  "<strong>Birthdate:</strong> {$birthdate_html}<br>" .
  "<strong>Language:</strong> {$language_html}</p>";

// Тело письма (TEXT)
$text =
  "New Vivien Gift Card Order\n\n" .
  "Amount: {$amount} EUR\n" .
  "Delivery at: {$delivery_at}\n\n" .
  "Payer email: {$payer_email}\n" .
  "Payer note:\n{$payer_note}\n\n" .
  "Recipient name: {$name}\n" .
  "Recipient Email: {$email}\n" .
  "Recipient Phone: {$phone}\n\n" .
  "Message to recipient:\n{$message_to_recipient}\n\n" .
  "Gender: {$gender}\n" .
  "Birthdate: {$birthdate}\n" .
  "Language: {$language}\n";

try {
  // Инициализация клиента SendPulse
  $SPApiClient = new ApiClient($apiUserId, $apiSecret, new FileStorage());

  // Формируем пакет для smtpSendMail
  $emailData = [
    'html'    => $html,
    'text'    => $text,
    'subject' => $subject,
    'from'    => [
      'name'  => 'Vivien Gift Card Form',
      // ВАЖНО: адрес должен быть подтверждён в SendPulse
      'email' => 'noreply@vivien.lv'
    ],
    'to'      => $recipients
  ];

  // Если на форме есть вложения (name="attachment[]" multiple) — добавим
  if (!empty($_FILES['attachment']['tmp_name'][0])) {
    foreach ($_FILES['attachment']['tmp_name'] as $i => $tmpName) {
      if (is_uploaded_file($tmpName) && filesize($tmpName) > 0) {
        $fileData = file_get_contents($tmpName);
        if ($fileData !== false) {
          $emailData['attachments_binary'][$_FILES['attachment']['name'][$i]] = base64_encode($fileData);
        }
      }
    }
  }

  // Отправка
  $result = $SPApiClient->smtpSendMail($emailData);

  if (!empty($result['result'])) {
    echo 'OK';
  } else {
    // Вернём текст ошибки (validate.js покажет его в .error-message)
    echo 'ERROR: SendPulse SMTP failed';
  }

} catch (ApiClientException $e) {
  echo 'ERROR: ' . $e->getMessage();
}