<?php

declare(strict_types=1);

namespace Vivien\Api\Provider;

final class ProviderException extends \RuntimeException
{
    public function __construct(string $message, public readonly bool $ambiguous = false)
    {
        parent::__construct($message);
    }
}
