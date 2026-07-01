<?php

declare(strict_types=1);

namespace Vivien\Api\Application;

use DateTimeImmutable;
use DateTimeZone;
use Vivien\Api\Config;
use Vivien\Api\Repository\GiftCardRepository;
use Vivien\Api\Repository\IntegrationRepository;
use Vivien\Api\Repository\JobQueue;
use Vivien\Api\Support\Clock;

final class JobProcessor
{
    private const RETRY_SECONDS = [60, 300, 900, 1800, 3600];

    public function __construct(
        private readonly Config $config,
        private readonly JobQueue $jobs,
        private readonly GiftCardRepository $cards,
        private readonly IntegrationRepository $integrations,
        private readonly GiftCardWorkflow $workflow,
    ) {
    }

    /** @return array{processed: int, failed: int, recovered: int, locked: bool} */
    public function run(): array
    {
        if (!$this->jobs->acquireRunnerLock()) {
            return ['processed' => 0, 'failed' => 0, 'recovered' => 0, 'locked' => true];
        }
        $started = microtime(true);
        $processed = 0;
        $failed = 0;
        try {
            $recovered = $this->jobs->recoverStale();
            $limit = $this->config->int('JOB_BATCH_SIZE', 5);
            $budget = $this->config->int('JOB_RUN_BUDGET_SECONDS', 20);
            while ($processed < $limit && microtime(true) - $started < $budget) {
                $job = $this->jobs->claim();
                if (!$job) {
                    break;
                }
                try {
                    if ($this->deadlineExpired($job)) {
                        $order = $this->cards->order((string) $job['entity_id']);
                        $this->jobs->fail((string) $job['id'], 'Fulfillment deadline expired');
                        $this->integrations->outbox(
                            'gift_card.fulfillment_failed',
                            (string) $order['gift_card_id'],
                            [
                                'event' => 'gift_card.fulfillment_failed',
                                'error' => 'Fulfillment deadline expired',
                                'refund_queued' => true,
                                'created_at' => Clock::now()->format(DATE_ATOM),
                            ],
                        );
                        $this->workflow->queueRefund((string) $order['id']);
                        $processed++;
                        continue;
                    }
                    $this->workflow->process($job);
                    $this->jobs->complete((string) $job['id']);
                } catch (\Throwable $error) {
                    $failed++;
                    $this->handleFailure($job, $error);
                }
                $processed++;
            }
            return compact('processed', 'failed', 'recovered') + ['locked' => false];
        } finally {
            $this->jobs->releaseRunnerLock();
        }
    }

    /** @param array<string, mixed> $job */
    private function deadlineExpired(array $job): bool
    {
        if (in_array($job['job_type'], ['refund', 'sync_balance'], true)) {
            return false;
        }
        $order = $this->cards->order((string) $job['entity_id']);
        if (!$order || empty($order['fulfillment_deadline'])) {
            return false;
        }
        $deadline = new DateTimeImmutable(
            (string) $order['fulfillment_deadline'],
            new DateTimeZone('UTC'),
        );
        return new DateTimeImmutable('now', new DateTimeZone('UTC')) >= $deadline;
    }

    /** @param array<string, mixed> $job */
    private function handleFailure(array $job, \Throwable $error): void
    {
        $attempts = (int) $job['attempts'];
        $order = $this->cards->order((string) $job['entity_id']);
        $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
        if ($job['job_type'] !== 'refund'
            && $order
            && !empty($order['fulfillment_deadline'])
            && $now >= new DateTimeImmutable((string) $order['fulfillment_deadline'], new DateTimeZone('UTC'))) {
            $this->jobs->fail((string) $job['id'], $error->getMessage());
            $this->integrations->outbox(
                'gift_card.fulfillment_failed',
                (string) $order['gift_card_id'],
                [
                    'event' => 'gift_card.fulfillment_failed',
                    'error' => $error->getMessage(),
                    'refund_queued' => true,
                    'created_at' => Clock::now()->format(DATE_ATOM),
                ],
            );
            $this->workflow->queueRefund((string) $order['id']);
            return;
        }
        if ($attempts >= 8) {
            $this->jobs->fail((string) $job['id'], $error->getMessage());
            if ($job['job_type'] !== 'refund' && $order) {
                $this->cards->updateCard((string) $order['gift_card_id'], ['status' => 'refunding']);
                $this->integrations->outbox(
                    'gift_card.fulfillment_failed',
                    (string) $order['gift_card_id'],
                    [
                        'event' => 'gift_card.fulfillment_failed',
                        'error' => $error->getMessage(),
                        'refund_queued' => true,
                        'created_at' => Clock::now()->format(DATE_ATOM),
                    ],
                );
                $this->workflow->queueRefund((string) $order['id']);
            } elseif ($job['job_type'] === 'refund' && $order) {
                $this->cards->updateCard((string) $order['gift_card_id'], ['status' => 'manual_review']);
                $this->integrations->outbox(
                    'gift_card.refund_failed',
                    (string) $order['gift_card_id'],
                    [
                        'event' => 'gift_card.refund_failed',
                        'error' => $error->getMessage(),
                        'manual_review' => true,
                        'created_at' => Clock::now()->format(DATE_ATOM),
                    ],
                );
            }
            return;
        }
        $delay = self::RETRY_SECONDS[min(max($attempts - 1, 0), count(self::RETRY_SECONDS) - 1)];
        $this->jobs->retry(
            (string) $job['id'],
            $now->modify("+{$delay} seconds"),
            $error->getMessage(),
        );
    }
}
