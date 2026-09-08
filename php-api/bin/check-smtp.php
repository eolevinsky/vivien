<?php

declare(strict_types=1);

// Run from a terminal or Plesk's "Run a PHP script" task, never via a public URL.
// Makes SMTP/TLS connections only. No AUTH, messages, database writes or secrets in output.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

use PHPMailer\PHPMailer\SMTP;
use Vivien\Api\Config;

$root = dirname(__DIR__);
if (!is_file($root . '/vendor/autoload.php')) {
    fwrite(STDERR, "FAIL: vendor/autoload.php is missing. Run Composer Install for the API.\n");
    exit(1);
}
require $root . '/vendor/autoload.php';
try {
    $config = Config::load($root);
} catch (Throwable $error) {
    // A dotenv parse exception can contain the offending value; never print it.
    fwrite(STDERR, 'FAIL: Configuration could not be loaded (' . get_class($error) . "). Check dotenv syntax.\n");
    exit(1);
}

echo 'PHP: ' . PHP_VERSION . " (CLI; compare with the domain's PHP version)\n";
echo 'API .env exists: ' . (is_file($root . '/.env') ? 'yes' : 'no') . "\n";
echo 'Home .env exists: ' . (is_file(dirname($root) . '/.env') ? 'yes' : 'no') . "\n";
echo 'Emails enabled: ' . ($config->bool('GIFT_CARD_EMAILS_ENABLED') ? 'yes' : 'no') . "\n";
$host = $config->string('SENDPULSE_SMTP_HOST', $config->string('VIVIEN_SMTP_HOST'));
echo 'Effective host is smtp-pulse.com: ' . ($host === 'smtp-pulse.com' ? 'yes' : 'NO — check SMTP host/fallback') . "\n";
$port = $config->int('SENDPULSE_SMTP_PORT', $config->int('VIVIEN_SMTP_PORT', 465));
echo 'Effective port: ' . $port . "\n";
$secure = strtolower($config->string('SENDPULSE_SMTP_SECURE', $config->string('VIVIEN_SMTP_SECURE', $port === 465 ? 'ssl' : 'tls')));
echo 'Encryption: ' . (in_array($secure, ['ssl', 'smtps', 'tls', 'starttls'], true) ? $secure : 'unrecognized') . "\n";
echo 'Configured timeout: ' . $config->int('SENDPULSE_SMTP_TIMEOUT', $config->int('VIVIEN_SMTP_TIMEOUT', 10)) . " seconds\n";
foreach (['USER', 'PASS'] as $field) {
    $present = $config->string('SENDPULSE_SMTP_' . $field, $config->string('VIVIEN_SMTP_' . $field)) !== '';
    echo "SMTP {$field} present: " . ($present ? 'yes' : 'NO') . " (value hidden)\n";
}
echo 'OpenSSL loaded: ' . (extension_loaded('openssl') ? 'yes' : 'NO') . "\n";
if (!class_exists(SMTP::class)) {
    fwrite(STDERR, "FAIL: PHPMailer SMTP dependency is missing. Run Composer Install.\n");
    exit(1);
}
echo 'PHPMailer SMTP version: ' . SMTP::VERSION . "\n";
if (!extension_loaded('openssl') || !function_exists('stream_socket_client')) {
    fwrite(STDERR, "FAIL: OpenSSL or stream_socket_client is unavailable.\n");
    exit(1);
}

$options = ['ssl' => [
    'verify_peer' => true,
    'verify_peer_name' => true,
    'allow_self_signed' => false,
    'peer_name' => 'smtp-pulse.com',
]];
foreach ([465, 587] as $probePort) {
    $smtp = new SMTP();
    $smtp->Timeout = 10;
    $smtp->Timelimit = 10;
    $started = microtime(true);
    try {
        $probeHost = $probePort === 465 ? 'ssl://smtp-pulse.com' : 'smtp-pulse.com';
        $ok = $smtp->connect($probeHost, $probePort, 10, $options);
        if ($ok && $probePort === 587) {
            $ok = $smtp->hello('diagnostic.invalid') && $smtp->startTLS();
        }
        echo "\nSendPulse {$probePort} " . ($probePort === 465 ? 'implicit TLS' : 'STARTTLS')
            . ': ' . ($ok ? 'PASS' : 'FAIL') . ' (' . round(microtime(true) - $started, 2) . "s)\n";
        if (!$ok) {
            echo json_encode($smtp->getError(), JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE) . "\n";
        }
    } catch (Throwable $error) {
        echo "\nConnection probe failed: " . $error->getMessage() . "\n";
    } finally {
        $smtp->close();
    }
}
echo "\nNo login attempted and no email sent. This checks this PHP runtime only.\n";
