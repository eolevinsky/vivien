<?php
header('Content-Type: application/json');

require_once __DIR__ . '/../vendor/autoload.php';

use Sendpulse\RestApi\ApiClient;
use Sendpulse\RestApi\Storage\FileStorage;
use Sendpulse\RestApi\ApiClientException;

$apiUserId = '1c878e0accc9f7a1fba7a17595afb935'; // ← Вставьте сюда ваш API ID SendPulse
$apiSecret = 'b2d098f2106cb31cade5df99c8e7402c'; // ← Вставьте сюда ваш API Secret SendPulse


$name    = trim($_POST['name'] ?? '');
$email   = trim($_POST['email'] ?? '');
$phone   = trim($_POST['phone'] ?? '');
$message = trim($_POST['message'] ?? '');
$language = trim($_POST['language'] ?? '');

if (empty($name) || empty($email) || empty($message)) {
  echo json_encode(['error' => 'Required fields are missing.']);
  exit;
}

try {
  $SPApiClient = new ApiClient($apiUserId, $apiSecret, new FileStorage());

  $subject = ($position ? $position . ' – ' : '') . 'New Private feedback';

  $emailData = [
    'html' => "<p><strong>New Job Application</strong></p>"
            . "<p><strong>Name:</strong> " . htmlspecialchars($name) . "<br>"
            . "<strong>Email:</strong> " . htmlspecialchars($email) . "<br>"
            . "<strong>Phone:</strong> " . htmlspecialchars($phone) . "</p>"
            . "<p><strong>Language:</strong> " . htmlspecialchars($language) . "</p>"
            . "<p><strong>Message:</strong><br>" . nl2br(htmlspecialchars($message)) . "</p>",
    'text' => strip_tags("Name: $name\nEmail: $email\nPhone: $phone\nLanguage: $language\nMessage:\n$message"),
    'subject' => $subject,
    'from' => [
      'name' => 'Private feedback about Vivien',
      'email' => 'noreply@vivien.lv' // ← должен быть подтверждён в SendPulse
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
    echo json_encode(['error' => 'SendPulse SMTP failed', 'response' => $result]);
  }

} catch (ApiClientException $e) {
  echo json_encode([
    'error' => 'API exception',
    'message' => $e->getMessage(),
    'code' => $e->getCode(),
    'response' => $e->getResponse()
  ]);
}
