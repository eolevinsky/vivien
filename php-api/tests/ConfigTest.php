<?php

declare(strict_types=1);

namespace Vivien\Api\Tests;

use PHPUnit\Framework\TestCase;
use Vivien\Api\Config;

final class ConfigTest extends TestCase
{
    public function testConfigurationParsing(): void
    {
        $config = new Config([
            'FLAG' => 'true',
            'COUNT' => '7',
            'ORIGINS' => 'https://vivien.lv, https://www.vivien.lv',
            'DB_HOST' => 'localhost',
            'DB_PORT' => '3306',
            'DB_NAME' => 'vivien_loyalty',
        ]);

        self::assertTrue($config->bool('FLAG'));
        self::assertSame(7, $config->int('COUNT', 0));
        self::assertSame(
            ['https://vivien.lv', 'https://www.vivien.lv'],
            $config->csv('ORIGINS'),
        );
        self::assertSame(
            'mysql:host=localhost;port=3306;dbname=vivien_loyalty;charset=utf8mb4',
            $config->databaseDsn(),
        );
    }
}
