<?php
header('Content-Type: application/json');

require_once __DIR__ . '/../vendor/autoload.php';

use Sendpulse\RestApi\ApiClient;
use Sendpulse\RestApi\Storage\FileStorage;
use Sendpulse\RestApi\ApiClientException;

$apiUserId = getenv('SENDPULSE_API_USER_ID') ?: '';
$apiSecret = getenv('SENDPULSE_API_SECRET')  ?: '';

// fallback для боевого сайта, чтобы почта реально ушла
if (!$apiUserId) {
    $apiUserId = '1c878e0accc9f7a1fba7a17595afb935';
}
if (!$apiSecret) {
    $apiSecret = 'b2d098f2106cb31cade5df99c8e7402c';
}

$name    = trim($_POST['name'] ?? '');
$email   = trim($_POST['email'] ?? '');
$phone   = trim($_POST['phone'] ?? '');
$message = trim($_POST['message'] ?? '');
$language = trim($_POST['language'] ?? '');
$visitor_type = trim($_POST['visitor_type'] ?? ''); // first_time / returning
$source       = trim($_POST['source'] ?? '');       // Instagram, Google / Maps, etc.

// 4. Валидация
// Минимум: должен быть текст сообщения и указан email
if ($message === '') {
    echo json_encode(['error' => 'Message is required.']);
    exit;
}

if ($email === '') {
    echo json_encode(['error' => 'Email is required.']);
    exit;
}

$subject = 'New Private feedback';

try {
  $SPApiClient = new ApiClient($apiUserId, $apiSecret, new FileStorage());

  $emailData = [
    'html' =>
        "<p><strong>New Private feedback</strong></p>"
      . "<p><strong>Name:</strong> " . htmlspecialchars($name) . "<br>"
      . "<strong>Email:</strong> " . htmlspecialchars($email) . "<br>"
      . "<strong>Phone:</strong> " . htmlspecialchars($phone) . "<br>"
      . "<strong>Language:</strong> " . htmlspecialchars($language) . "<br>"
      . (!empty($visitor_type) ? "<strong>Visitor type:</strong> " . htmlspecialchars($visitor_type) . "<br>" : "")
      . (!empty($source) ? "<strong>Source / reason:</strong> " . htmlspecialchars($source) . "<br>" : "")
      . "</p>"
      . "<p><strong>Message:</strong><br>" . nl2br(htmlspecialchars($message)) . "</p>",

    'text' =>
        "New Private feedback\n"
      . "Name: $name\n"
      . "Email: $email\n"
      . "Phone: $phone\n"
      . "Language: $language\n"
      . (!empty($visitor_type) ? "Visitor type: $visitor_type\n" : "")
      . (!empty($source) ? "Source / reason: $source\n" : "")
      . "Message:\n$message\n",

    'subject' => $subject,
    'from' => [
      'name'  => 'Private feedback about Vivien',
      'email' => 'noreply@vivien.lv'
    ],
    'to' => [
      ['email' => 'feedback@brivibas.planfix.com']
    ]
  ];

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

  $result = $SPApiClient->smtpSendMail($emailData);

  if (!empty($result['result'])) {
      echo 'OK';
  } else {
      echo 'ERROR';
  }
  exit;

} catch (ApiClientException $e) {
  echo json_encode([
    'error' => 'API exception',
    'message' => $e->getMessage(),
    'code' => $e->getCode(),
    'response' => $e->getResponse() ?? null
  ]);
}
