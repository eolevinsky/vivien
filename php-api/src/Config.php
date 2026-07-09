<?php

declare(strict_types=1);

namespace Vivien\Api;

use Dotenv\Dotenv;

final class Config
{
    /** @var array<string, string> */
    private array $values;

    public static function load(string $root): self
    {
        foreach (self::envDirectories($root) as $directory) {
            if (is_file($directory . '/.env')) {
                Dotenv::createImmutable($directory)->safeLoad();
            }
        }

        return new self(array_merge($_SERVER, $_ENV));
    }

    /** @return list<string> */
    private static function envDirectories(string $root): array
    {
        $root = rtrim($root, '/');
        $parent = dirname($root);
        $directories = [$root];

        if ($parent !== $root) {
            $directories[] = $parent;
        }

        return $directories;
    }

    /** @param array<string, mixed> $values */
    public function __construct(array $values)
    {
        $this->values = array_map(
            static fn (mixed $value): string => is_scalar($value) ? (string) $value : '',
            $values,
        );
    }

    public function string(string $key, string $default = ''): string
    {
        $value = trim($this->values[$key] ?? '');
        return $value === '' ? $default : $value;
    }

    public function int(string $key, int $default): int
    {
        $value = $this->string($key);
        return $value === '' ? $default : (int) $value;
    }

    public function bool(string $key, bool $default = false): bool
    {
        $value = strtolower($this->string($key));
        if ($value === '') {
            return $default;
        }
        return in_array($value, ['1', 'true', 'yes', 'on'], true);
    }

    /** @return list<string> */
    public function csv(string $key): array
    {
        return array_values(array_filter(array_map('trim', explode(',', $this->string($key)))));
    }

    public function databaseDsn(): string
    {
        return sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
            $this->string('DB_HOST', 'localhost'),
            $this->int('DB_PORT', 3306),
            $this->string('DB_NAME', 'vivien_loyalty'),
        );
    }
}
