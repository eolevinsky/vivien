<?php

declare(strict_types=1);

namespace Vivien\Api\Tests;

use PHPUnit\Framework\TestCase;
use Vivien\Api\Support\Ids;

final class IdsTest extends TestCase
{
    public function testIdentifiersHaveExpectedShape(): void
    {
        self::assertMatchesRegularExpression(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/',
            Ids::uuid(),
        );
        self::assertMatchesRegularExpression('/^[0-9a-f]{64}$/', Ids::publicToken());
    }
}
