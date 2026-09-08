<?php

declare(strict_types=1);

namespace Vivien\Api\Tests;

use PHPUnit\Framework\TestCase;
use Vivien\Api\Config;
use Vivien\Api\Support\SmtpDiagnostics;

final class SmtpDiagnosticsTest extends TestCase
{
    private string $root;

    protected function setUp(): void
    {
        $this->root = sys_get_temp_dir() . '/vivien-smtp-test-' . bin2hex(random_bytes(8));
        mkdir($this->root);
        mkdir($this->root . '/var');
    }

    protected function tearDown(): void
    {
        foreach (['smtp-diagnostic.request', 'smtp-diagnostic.txt'] as $file) {
            $path = $this->root . '/var/' . $file;
            if (is_file($path)) {
                unlink($path);
            }
        }
        rmdir($this->root . '/var');
        rmdir($this->root);
    }

    private function request(): void
    {
        file_put_contents($this->root . '/var/smtp-diagnostic.request', 'run');
    }

    public function testNoRequestDoesNotCreateReportOrConnect(): void
    {
        $diagnostic = new SmtpDiagnostics(new Config([]), $this->root,
            static fn () => throw new \RuntimeException('Must not connect'));
        $diagnostic->runIfRequested();
        self::assertFileDoesNotExist($this->root . '/var/smtp-diagnostic.txt');
    }

    public function testOnePortPerRunAndNoRepeatAfterCompletion(): void
    {
        $ports = [];
        $diagnostic = new SmtpDiagnostics(new Config([]), $this->root,
            static function (int $port) use (&$ports): array {
                $ports[] = $port;
                return ["Port {$port}: PASS"];
            });
        $this->request();
        $diagnostic->runIfRequested();
        self::assertSame([465], $ports);
        self::assertFileExists($this->root . '/var/smtp-diagnostic.request');
        $diagnostic->runIfRequested();
        self::assertSame([465, 587], $ports);
        self::assertFileDoesNotExist($this->root . '/var/smtp-diagnostic.request');
        $completed = file_get_contents($this->root . '/var/smtp-diagnostic.txt');
        self::assertStringContainsString('DIAGNOSTIC COMPLETE', $completed);
        $diagnostic->runIfRequested();
        $this->request();
        $diagnostic->runIfRequested();
        self::assertSame([465, 587], $ports);
        self::assertSame($completed, file_get_contents($this->root . '/var/smtp-diagnostic.txt'));
    }

    public function testOverlappingCronDoesNotDuplicateProbe(): void
    {
        $ports = [];
        $diagnostic = new SmtpDiagnostics(new Config([]), $this->root,
            static function (int $port) use (&$ports): array {
                $ports[] = $port;
                return ['test result'];
            });
        $this->request();
        $lock = fopen($this->root . '/var/smtp-diagnostic.txt', 'c+b');
        flock($lock, LOCK_EX);
        try {
            $diagnostic->runIfRequested();
            self::assertSame([], $ports);
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
        $diagnostic->runIfRequested();
        self::assertSame([465], $ports);
    }

    public function testInterruptedProbeIsNotRetriedEveryMinute(): void
    {
        $this->request();
        $ports = [];
        $diagnostic = new SmtpDiagnostics(new Config([]), $this->root,
            static function (int $port) use (&$ports): array {
                $ports[] = $port;
                if ($port === 465) {
                    throw new \RuntimeException('Simulated interrupted probe');
                }
                return ['Port 587: PASS'];
            });
        try {
            $diagnostic->runIfRequested();
            self::fail('Expected interruption');
        } catch (\RuntimeException $error) {
            self::assertSame('Simulated interrupted probe', $error->getMessage());
        }
        $diagnostic->runIfRequested();
        $diagnostic->runIfRequested();
        self::assertSame([465, 587], $ports);
        $report = file_get_contents($this->root . '/var/smtp-diagnostic.txt');
        self::assertStringNotContainsString('FINISHED 465', $report);
        self::assertStringContainsString('probe was interrupted', $report);
    }

    public function testSettingsReportDoesNotExposeSecrets(): void
    {
        $secret = 'DO-NOT-PRINT-THIS';
        $diagnostic = new SmtpDiagnostics(new Config([
            'SENDPULSE_SMTP_HOST' => 'smtp-pulse.com',
            'SENDPULSE_SMTP_PORT' => '465', 'SENDPULSE_SMTP_SECURE' => 'ssl',
            'SENDPULSE_SMTP_USER' => $secret, 'SENDPULSE_SMTP_PASS' => $secret,
            'INTERNAL_JOB_SECRET' => $secret, 'STRIPE_SECRET_KEY' => $secret,
        ]), $this->root);
        $summary = implode("\n", $diagnostic->summary());
        self::assertStringContainsString('Effective host is smtp-pulse.com: yes', $summary);
        self::assertStringContainsString('SMTP PASS present: yes', $summary);
        self::assertStringNotContainsString($secret, $summary);
    }
}
