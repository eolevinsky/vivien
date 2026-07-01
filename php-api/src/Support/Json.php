<?php

declare(strict_types=1);

namespace Vivien\Api\Support;

use JsonException;

final class Json
{
    /** @throws JsonException */
    public static function encode(mixed $value): string
    {
        return json_encode($value, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    /** @return array<string, mixed> */
    public static function object(string $value): array
    {
        $decoded = json_decode($value, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($decoded)) {
            throw new JsonException('Expected a JSON object');
        }
        return $decoded;
    }
}
