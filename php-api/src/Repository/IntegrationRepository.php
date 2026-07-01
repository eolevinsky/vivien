<?php

declare(strict_types=1);

namespace Vivien\Api\Repository;

use PDO;
use PDOException;
use Vivien\Api\Support\Clock;
use Vivien\Api\Support\Ids;
use Vivien\Api\Support\Json;

final class IntegrationRepository
{
    public function __construct(private readonly PDO $db)
    {
    }

    /** @param array<string, mixed> $request @return array<string, mixed> */
    public function operation(
        string $key,
        string $provider,
        string $operation,
        string $entityId,
        array $request,
    ): array {
        $existing = $this->operationByKey($key);
        if ($existing) {
            $existing['_existing'] = true;
            return $existing;
        }
        $now = Clock::sql();
        $record = [
            'id' => Ids::uuid(),
            'operation_key' => $key,
            'provider' => $provider,
            'operation' => $operation,
            'entity_id' => $entityId,
            'status' => 'started',
            'request_json' => Json::encode($request),
            'response_json' => '{}',
            'external_id' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ];
        $stmt = $this->db->prepare(
            'INSERT INTO provider_operations
             (id, operation_key, provider, operation, entity_id, status, request_json,
              response_json, external_id, created_at, updated_at)
             VALUES
             (:id, :operation_key, :provider, :operation, :entity_id, :status, :request_json,
              :response_json, :external_id, :created_at, :updated_at)',
        );
        $stmt->execute($record);
        $record['_existing'] = false;
        return $record;
    }

    /** @param array<string, mixed> $response */
    public function completeOperation(
        string $key,
        ?string $externalId,
        array $response = [],
    ): void {
        $stmt = $this->db->prepare(
            'UPDATE provider_operations SET status = "completed", external_id = :external_id,
             response_json = :response_json, updated_at = :updated_at
             WHERE operation_key = :operation_key',
        );
        $stmt->execute([
            'external_id' => $externalId,
            'response_json' => Json::encode($response),
            'updated_at' => Clock::sql(),
            'operation_key' => $key,
        ]);
    }

    public function storeWebhook(string $provider, string $eventId, string $payload): bool
    {
        try {
            $stmt = $this->db->prepare(
                'INSERT INTO webhook_events
                 (id, provider, event_id, payload_json, processed, created_at)
                 VALUES (:id, :provider, :event_id, :payload_json, 0, :created_at)',
            );
            $stmt->execute([
                'id' => Ids::uuid(),
                'provider' => $provider,
                'event_id' => $eventId,
                'payload_json' => $payload,
                'created_at' => Clock::sql(),
            ]);
            return true;
        } catch (PDOException $error) {
            if ((string) $error->getCode() === '23000') {
                return false;
            }
            throw $error;
        }
    }

    public function markWebhookProcessed(string $provider, string $eventId): void
    {
        $stmt = $this->db->prepare(
            'UPDATE webhook_events SET processed = 1 WHERE provider = :provider AND event_id = :event_id',
        );
        $stmt->execute(['provider' => $provider, 'event_id' => $eventId]);
    }

    /** @param array<string, mixed> $payload */
    public function outbox(string $eventType, string $entityId, array $payload): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO planfix_outbox
             (id, event_type, entity_id, payload_json, delivered, attempts, created_at)
             VALUES (:id, :event_type, :entity_id, :payload_json, 0, 0, :created_at)',
        );
        $stmt->execute([
            'id' => Ids::uuid(),
            'event_type' => $eventType,
            'entity_id' => $entityId,
            'payload_json' => Json::encode($payload),
            'created_at' => Clock::sql(),
        ]);
    }

    /** @return array<string, mixed>|null */
    private function operationByKey(string $key): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT * FROM provider_operations WHERE operation_key = :operation_key',
        );
        $stmt->execute(['operation_key' => $key]);
        $row = $stmt->fetch();
        return is_array($row) ? $row : null;
    }
}
