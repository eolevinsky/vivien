<?php

declare(strict_types=1);

$root = dirname(__DIR__);
$directories = [$root . '/src', $root . '/public', $root . '/tests'];

foreach ($directories as $directory) {
    $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($directory));
    foreach ($iterator as $file) {
        if (!$file->isFile() || $file->getExtension() !== 'php') {
            continue;
        }
        $command = escapeshellarg(PHP_BINARY) . ' -l ' . escapeshellarg($file->getPathname());
        passthru($command, $status);
        if ($status !== 0) {
            exit($status);
        }
    }
}
