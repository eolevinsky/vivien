<?php

declare(strict_types=1);

namespace Vivien\Api\Support;

use DateTimeImmutable;
use DateTimeZone;

final class Clock
{
    public static function now(): DateTimeImmutable
    {
        return new DateTimeImmutable('now', new DateTimeZone('UTC'));
    }

    public static function sql(?DateTimeImmutable $time = null): string
    {
        return ($time ?? self::now())->format('Y-m-d H:i:s.u');
    }
}
