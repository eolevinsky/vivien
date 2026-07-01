<?php

declare(strict_types=1);

use Vivien\Api\App;

require dirname(__DIR__) . '/vendor/autoload.php';

App::create(dirname(__DIR__))->run();
