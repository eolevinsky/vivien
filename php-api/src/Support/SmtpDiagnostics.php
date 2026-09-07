<?php

declare(strict_types=1);

namespace Vivien\Api\Support;

use Closure;
use PHPMailer\PHPMailer\SMTP;
use Vivien\Api\Config;

final class SmtpDiagnostics
{
    public function __construct(
        private readonly Config $config,
        private readonly string $root,
        private readonly ?Closure $connectionProbe = null,
    ) {
    }

    /** @return list<string> */
    public function summary(): array
    {
        $host = $this->config->string('SENDPULSE_SMTP_HOST', $this->config->string('VIVIEN_SMTP_HOST'));
        $port = $this->config->int('SENDPULSE_SMTP_PORT', $this->config->int('VIVIEN_SMTP_PORT', 465));
        $secure = strtolower($this->config->string('SENDPULSE_SMTP_SECURE',
            $this->config->string('VIVIEN_SMTP_SECURE', $port === 465 ? 'ssl' : 'tls')));
        $lines = [
            'Started (UTC): ' . gmdate('c'),
            'PHP: ' . PHP_VERSION . '; runtime: ' . PHP_SAPI,
            'API .env exists: ' . (is_file($this->root . '/.env') ? 'yes' : 'no'),
            'Home .env exists: ' . (is_file(dirname($this->root) . '/.env') ? 'yes' : 'no'),
            'Emails enabled: ' . ($this->config->bool('GIFT_CARD_EMAILS_ENABLED') ? 'yes' : 'NO'),
            'Effective host is smtp-pulse.com: ' . ($host === 'smtp-pulse.com' ? 'yes' : 'NO; check host/fallback'),
            'Effective port: ' . $port,
            'Encryption: ' . (in_array($secure, ['ssl', 'smtps', 'tls', 'starttls'], true) ? $secure : 'unrecognized'),
            'Configured mail timeout: ' . $this->config->int('SENDPULSE_SMTP_TIMEOUT',
                $this->config->int('VIVIEN_SMTP_TIMEOUT', 10)) . ' seconds',
            'Diagnostic connection timeout: 5 seconds per operation',
            'OpenSSL loaded: ' . (extension_loaded('openssl') ? 'yes' : 'NO'),
            'stream_socket_client available: ' . (function_exists('stream_socket_client') ? 'yes' : 'NO'),
            'PHPMailer SMTP: ' . (class_exists(SMTP::class) ? SMTP::VERSION : 'MISSING'),
        ];
        foreach (['USER', 'PASS'] as $field) {
            $present = $this->config->string('SENDPULSE_SMTP_' . $field,
                $this->config->string('VIVIEN_SMTP_' . $field)) !== '';
            $lines[] = "SMTP {$field} present: " . ($present ? 'yes' : 'NO') . ' (value hidden)';
        }
        $lines[] = 'No SMTP login, email, payment or database operations are performed by this diagnostic.';
        return $lines;
    }

    /** @return list<string> */
    public function probe(int $port): array
    {
        // Fixed destinations only; no credentials are supplied to these connections.
        if (!in_array($port, [465, 587], true)) {
            throw new \InvalidArgumentException('Unsupported diagnostic port');
        }
        if ($this->connectionProbe !== null) {
            return ($this->connectionProbe)($port);
        }
        if (!class_exists(SMTP::class) || !extension_loaded('openssl') || !function_exists('stream_socket_client')) {
            return ["Port {$port}: FAIL; required PHP support is missing (see summary)."];
        }
        $smtp = new SMTP();
        $smtp->Timeout = 5;
        $smtp->Timelimit = 5;
        $options = ['ssl' => [
            'verify_peer' => true, 'verify_peer_name' => true,
            'allow_self_signed' => false, 'peer_name' => 'smtp-pulse.com',
        ]];
        $started = microtime(true);
        $stage = 'connection and SMTP greeting';
        try {
            $host = $port === 465 ? 'ssl://smtp-pulse.com' : 'smtp-pulse.com';
            $ok = $smtp->connect($host, $port, 5, $options);
            if ($ok && $port === 587) {
                $stage = 'EHLO';
                $ok = $smtp->hello('diagnostic.invalid');
                if ($ok) {
                    $stage = 'STARTTLS';
                    $ok = $smtp->startTLS();
                }
            }
            $lines = ["Port {$port}: " . ($ok ? 'PASS' : "FAIL at {$stage}")
                . ' (' . round(microtime(true) - $started, 2) . 's)'];
            if (!$ok) {
                $lines[] = (string) json_encode($smtp->getError(), JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
            }
            return $lines;
        } catch (\Throwable $error) {
            return ["Port {$port}: FAIL at {$stage}: " . $error->getMessage()];
        } finally {
            $smtp->close();
        }
    }

    // Authenticated, idle cron runs only. One port per run keeps probes out of payment processing.
    public function runIfRequested(): void
    {
        $request = $this->root . '/var/smtp-diagnostic.request';
        if (!is_file($request)) {
            return;
        }
        $report = @fopen($this->root . '/var/smtp-diagnostic.txt', 'c+b');
        if ($report === false) {
            throw new \RuntimeException('Cannot create private SMTP diagnostic report');
        }
        try {
            if (!flock($report, LOCK_EX | LOCK_NB)) {
                return;
            }
            clearstatcache(true, $request);
            if (!is_file($request)) {
                return;
            }
            $previous = stream_get_contents($report);
            if ($previous === false) {
                throw new \RuntimeException('Cannot read SMTP diagnostic report');
            }
            fseek($report, 0, SEEK_END);
            $append = static function (string $text) use ($report): void {
                $line = $text . "\n";
                if (fwrite($report, $line) !== strlen($line) || !fflush($report)) {
                    throw new \RuntimeException('Cannot write SMTP diagnostic report');
                }
            };
            if ($previous === '') {
                $append(implode("\n", $this->summary()));
            }
            foreach ([465, 587] as $port) {
                if (str_contains($previous, "ATTEMPT {$port}\n")) {
                    continue;
                }
                // Persist before connecting: a killed request must not cause endless retries.
                $append("ATTEMPT {$port}");
                $append(implode("\n", $this->probe($port)));
                $append("FINISHED {$port}");
                if ($port === 465) {
                    $append('Waiting for the next idle cron run to check port 587.');
                    return;
                }
                break;
            }
            if (!str_contains($previous, "DIAGNOSTIC COMPLETE\n")) {
                $append('DIAGNOSTIC COMPLETE');
                $append('If an ATTEMPT has no FINISHED line, that probe was interrupted.');
            }
            if (!@unlink($request)) {
                throw new \RuntimeException('Cannot remove SMTP diagnostic request flag');
            }
        } finally {
            flock($report, LOCK_UN);
            fclose($report);
        }
    }
}
