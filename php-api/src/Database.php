<?php

declare(strict_types=1);

namespace Vivien\Api;

use PDO;

final class Database
{
    public static function connect(Config $config): PDO
    {
        return new PDO(
            $config->databaseDsn(),
            $config->string('DB_USER'),
            $config->string('DB_PASSWORD'),
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ],
        );
    }
}
