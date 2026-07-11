<?php

declare(strict_types=1);

namespace Vivien\Api\Repository;

use DateTimeImmutable;
use PDO;
use Vivien\Api\Support\Clock;
use Vivien\Api\Support\Ids;
use Vivien\Api\Support\Json;

final class JobQueue
{
    public function __construct(private readonly PDO $db)
    {
    }

    /** @param array<string, mixed> $payload */
    public function enqueue(
        string $type,
        string $entityId,
        string $dedupeKey,
        array $payload = [],
        ?DateTimeImmutable $runAt = null,
    ): void {
        $existing = $this->findByDedupe($dedupeKey);
        if ($existing) {
            if (in_array($existing['status'], ['failed', 'completed'], true)) {
                $stmt = $this->db->prepare(
                    'UPDATE jobs SET status = "pending", run_at = :run_at, last_error = NULL,
                     locked_at = NULL, updated_at = :updated_at WHERE id = :id',
                );
                $stmt->execute([
                    'run_at' => Clock::sql($runAt),
                    'updated_at' => Clock::sql(),
                    'id' => $existing['id'],
                ]);
            }
            return;
        }

        $now = Clock::sql();
        $stmt = $this->db->prepare(
            'INSERT INTO jobs
             (id, job_type, entity_id, dedupe_key, payload_json, status, attempts,
              run_at, created_at, updated_at)
             VALUES (:id, :job_type, :entity_id, :dedupe_key, :payload_json, "pending", 0,
                     :run_at, :created_at, :updated_at)',
        );
        $stmt->execute([
            'id' => Ids::uuid(),
            'job_type' => $type,
            'entity_id' => $entityId,
            'dedupe_key' => $dedupeKey,
            'payload_json' => Json::encode($payload),
            'run_at' => Clock::sql($runAt),
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    /** @return array<string, mixed>|null */
    public function claim(): ?array
    {
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->query(
                'SELECT * FROM jobs
                 WHERE status = "pending" AND run_at <= UTC_TIMESTAMP(6)
                 ORDER BY run_at, created_at LIMIT 1 FOR UPDATE',
            );
            $job = $stmt->fetch();
            if (!is_array($job)) {
                $this->db->commit();
                return null;
            }
            $update = $this->db->prepare(
                'UPDATE jobs SET status = "running", locked_at = :locked_at,
                 attempts = attempts + 1, updated_at = :updated_at WHERE id = :id',
            );
            $now = Clock::sql();
            $update->execute(['locked_at' => $now, 'updated_at' => $now, 'id' => $job['id']]);
            $this->db->commit();
            $job['attempts'] = (int) $job['attempts'] + 1;
            return $job;
        } catch (\Throwable $error) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $error;
        }
    }

    public function complete(string $id): void
    {
        $this->setStatus($id, 'completed', null, null);
    }

    public function retry(string $id, DateTimeImmutable $runAt, string $error): void
    {
        $this->setStatus($id, 'pending', $runAt, $error);
    }

    public function fail(string $id, string $error): void
    {
        $this->setStatus($id, 'failed', null, $error);
    }

    public function recoverStale(): int
    {
        $stmt = $this->db->prepare(
            'UPDATE jobs SET status = "pending", locked_at = NULL, updated_at = :updated_at
             WHERE status = "running" AND locked_at < UTC_TIMESTAMP(6) - INTERVAL 10 MINUTE',
        );
        $stmt->execute(['updated_at' => Clock::sql()]);
        return $stmt->rowCount();
    }

    public function acquireRunnerLock(): bool
    {
        $stmt = $this->db->query("SELECT GET_LOCK('vivien_api_job_runner', 0)");
        return (int) $stmt->fetchColumn() === 1;
    }

    public function releaseRunnerLock(): void
    {
        $this->db->query("SELECT RELEASE_LOCK('vivien_api_job_runner')");
    }

    /** @return array<string, mixed>|null */
    private function findByDedupe(string $key): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM jobs WHERE dedupe_key = :key');
        $stmt->execute(['key' => $key]);
        $row = $stmt->fetch();
        return is_array($row) ? $row : null;
    }

    private function setStatus(
        string $id,
        string $status,
        ?DateTimeImmutable $runAt,
        ?string $error,
    ): void {
        $stmt = $this->db->prepare(
            'UPDATE jobs SET status = :status, run_at = COALESCE(:run_at, run_at),
             locked_at = NULL, last_error = :last_error, updated_at = :updated_at
             WHERE id = :id',
        );
        $stmt->execute([
            'status' => $status,
            'run_at' => $runAt ? Clock::sql($runAt) : null,
            'last_error' => $error,
            'updated_at' => Clock::sql(),
            'id' => $id,
        ]);
    }
}
