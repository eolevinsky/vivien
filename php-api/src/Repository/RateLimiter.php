<?php

declare(strict_types=1);

namespace Vivien\Api\Repository;

use DateTimeImmutable;
use DateTimeZone;
use PDO;
use Vivien\Api\Support\Clock;

final class RateLimiter
{
    public function __construct(private readonly PDO $db)
    {
    }

    public function allow(string $key, int $limit, int $windowSeconds): bool
    {
        $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
        $resetAt = $now->modify("+{$windowSeconds} seconds");
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare('SELECT hits, reset_at FROM rate_limits WHERE rate_key = :key FOR UPDATE');
            $stmt->execute(['key' => $key]);
            $row = $stmt->fetch();
            if (!is_array($row) || new DateTimeImmutable((string) $row['reset_at'], new DateTimeZone('UTC')) <= $now) {
                $stmt = $this->db->prepare(
                    'REPLACE INTO rate_limits (rate_key, hits, reset_at, updated_at)
                     VALUES (:key, 1, :reset_at, :updated_at)',
                );
                $stmt->execute([
                    'key' => $key,
                    'reset_at' => Clock::sql($resetAt),
                    'updated_at' => Clock::sql($now),
                ]);
                $this->db->commit();
                return true;
            }
            $hits = (int) $row['hits'];
            if ($hits >= $limit) {
                $this->db->commit();
                return false;
            }
            $stmt = $this->db->prepare(
                'UPDATE rate_limits SET hits = hits + 1, updated_at = :updated_at WHERE rate_key = :key',
            );
            $stmt->execute(['key' => $key, 'updated_at' => Clock::sql($now)]);
            $this->db->commit();
            return true;
        } catch (\Throwable $error) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $error;
        }
    }

    public function cleanup(): void
    {
        $stmt = $this->db->prepare('DELETE FROM rate_limits WHERE reset_at < UTC_TIMESTAMP(6) - INTERVAL 1 DAY');
        $stmt->execute();
    }
}
