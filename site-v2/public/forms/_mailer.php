<?php
declare(strict_types=1);

use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;

require_once __DIR__ . '/../vendor/phpmailer/Exception.php';
require_once __DIR__ . '/../vendor/phpmailer/PHPMailer.php';
require_once __DIR__ . '/../vendor/phpmailer/SMTP.php';

header('Content-Type: text/plain; charset=UTF-8');

function vivien_find_env_file(): ?string {
  $dir = __DIR__;

  for ($depth = 0; $depth < 12; $depth++) {
    if (basename($dir) === 'httpdocs') {
      $candidate = dirname($dir) . '/.env';
      return is_readable($candidate) ? $candidate : null;
    }

    $parent = dirname($dir);
    if ($parent === $dir) break;
    $dir = $parent;
  }

  $dir = __DIR__;
  for ($depth = 0; $depth < 8; $depth++) {
    $candidate = $dir . '/.env';
    if (is_readable($candidate)) return $candidate;

    $parent = dirname($dir);
    if ($parent === $dir) break;
    $dir = $parent;
  }

  return null;
}

function vivien_parse_env_value(string $value): string {
  $value = trim($value);
  if ($value === '') return '';

  $quote = $value[0];
  if (($quote === '"' || $quote === "'") && str_ends_with($value, $quote)) {
    $value = substr($value, 1, -1);
    if ($quote === '"') {
      $value = strtr($value, [
        '\\n' => "\n",
        '\\r' => "\r",
        '\\t' => "\t",
        '\\"' => '"',
        '\\\\' => '\\',
      ]);
    }
  }

  return $value;
}

function vivien_env(string $key, string $fallback = ''): string {
  $value = getenv($key);
  return $value === false || $value === '' ? $fallback : $value;
}

function vivien_smtp_secure(int $port): string {
  $secure = strtolower(vivien_env('VIVIEN_SMTP_SECURE', $port === 465 ? 'ssl' : 'tls'));
  if ($port === 465 && $secure === 'tls') return 'ssl';
  return $secure;
}

function vivien_load_env_file(): void {
  $envFile = vivien_find_env_file();
  if ($envFile === null) return;

  $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
  if ($lines === false) return;

  foreach ($lines as $line) {
    $line = trim($line);
    if ($line === '' || str_starts_with($line, '#')) continue;
    if (str_starts_with($line, 'export ')) $line = trim(substr($line, 7));

    $separator = strpos($line, '=');
    if ($separator === false) continue;

    $key = trim(substr($line, 0, $separator));
    if (!preg_match('/^[A-Z_][A-Z0-9_]*$/', $key)) continue;

    $current = getenv($key);
    if ($current !== false && $current !== '') continue;

    $value = vivien_parse_env_value(substr($line, $separator + 1));
    putenv($key . '=' . $value);
    $_ENV[$key] = $value;
    $_SERVER[$key] = $value;
  }
}

vivien_load_env_file();

function vivien_value(string $key): string {
  return trim((string)($_POST[$key] ?? ''));
}

function vivien_fail(string $message, int $status = 400): void {
  http_response_code($status);
  echo 'ERROR: ' . $message;
  exit;
}

function vivien_h(string $value): string {
  return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function vivien_assert_post(): void {
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    vivien_fail('Method not allowed', 405);
  }
  if (vivien_value('website') !== '') {
    vivien_fail('Rejected');
  }
}

function vivien_validate_required(array $fields): void {
  foreach ($fields as $field) {
    if (vivien_value($field) === '') {
      vivien_fail('Missing required field: ' . $field);
    }
  }
}

function vivien_validate_email(string $field): void {
  $value = vivien_value($field);
  if ($value === '' || !filter_var($value, FILTER_VALIDATE_EMAIL)) {
    vivien_fail('Invalid email: ' . $field);
  }
}

function vivien_body(array $fields): array {
  $html = '<p><strong>Vivien website form submission</strong></p><table cellpadding="6" cellspacing="0" border="1">';
  $text = "Vivien website form submission\n\n";
  foreach ($fields as $label => $value) {
    $value = is_scalar($value) ? trim((string)$value) : '';
    if ($value === '') continue;
    $html .= '<tr><th align="left">' . vivien_h((string)$label) . '</th><td>' . nl2br(vivien_h($value)) . '</td></tr>';
    $text .= $label . ": " . $value . "\n";
  }
  $html .= '</table>';
  return [$html, $text];
}

function vivien_add_attachments(PHPMailer $mail): void {
  if (empty($_FILES['attachment']['tmp_name']) || !is_array($_FILES['attachment']['tmp_name'])) {
    return;
  }
  foreach ($_FILES['attachment']['tmp_name'] as $index => $tmpName) {
    if (!is_uploaded_file($tmpName)) continue;
    if (filesize($tmpName) > 8 * 1024 * 1024) continue;
    $name = basename((string)($_FILES['attachment']['name'][$index] ?? 'attachment'));
    $mail->addAttachment($tmpName, $name);
  }
}

function vivien_send(array $config): void {
  vivien_assert_post();
  vivien_validate_required($config['required'] ?? []);
  foreach (($config['email_fields'] ?? []) as $field) {
    vivien_validate_email($field);
  }

  $fields = [];
  foreach (($config['fields'] ?? []) as $label => $key) {
    $fields[$label] = vivien_value($key);
  }
  $fields['Language'] = vivien_value('language');
  $fields['Source page'] = vivien_value('source_page');
  $fields['Consent'] = vivien_value('consent');

  [$html, $text] = vivien_body($fields);
  $mail = new PHPMailer(true);
  $mail->CharSet = 'UTF-8';
  $mail->Timeout = max(3, (int)vivien_env('VIVIEN_SMTP_TIMEOUT', '10'));

  try {
    $smtpHost = vivien_env('VIVIEN_SMTP_HOST');
    if ($smtpHost !== '') {
      $mail->isSMTP();
      $mail->Host = $smtpHost;
      $mail->Port = (int)vivien_env('VIVIEN_SMTP_PORT', '587');
      $mail->SMTPAuth = true;
      $mail->Username = vivien_env('VIVIEN_SMTP_USER');
      $mail->Password = vivien_env('VIVIEN_SMTP_PASS');
      $secure = vivien_smtp_secure($mail->Port);
      if ($secure !== 'none') $mail->SMTPSecure = $secure;
    } else {
      $mail->isMail();
    }

    $fromEmail = vivien_env('VIVIEN_MAIL_FROM', 'noreply@vivien.lv');
    $fromName = vivien_env('VIVIEN_MAIL_FROM_NAME', 'Brasserie Vivien');
    $mail->setFrom($fromEmail, $fromName);

    foreach (($config['to'] ?? []) as $recipient) {
      $mail->addAddress($recipient);
    }

    $replyEmail = vivien_value($config['reply_to'] ?? 'email');
    if ($replyEmail !== '' && filter_var($replyEmail, FILTER_VALIDATE_EMAIL)) {
      $mail->addReplyTo($replyEmail, vivien_value('name') ?: $replyEmail);
    }

    $mail->Subject = $config['subject'] ?? 'Vivien website form';
    $mail->isHTML(true);
    $mail->Body = $html;
    $mail->AltBody = $text;
    vivien_add_attachments($mail);
    $mail->send();
    echo 'OK';
  } catch (Exception $error) {
    error_log(sprintf(
      'Vivien form mail failed: %s; smtp_host=%s; smtp_port=%s; smtp_user_set=%s; smtp_pass_set=%s; timeout=%d',
      $error->getMessage(),
      $smtpHost !== '' ? $smtpHost : 'not configured',
      $smtpHost !== '' ? (string)$mail->Port : 'n/a',
      vivien_env('VIVIEN_SMTP_USER') !== '' ? 'yes' : 'no',
      vivien_env('VIVIEN_SMTP_PASS') !== '' ? 'yes' : 'no',
      $mail->Timeout
    ));
    vivien_fail('Email delivery failed', 500);
  }
}
