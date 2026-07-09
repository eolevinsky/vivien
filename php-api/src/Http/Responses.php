<?php

declare(strict_types=1);

namespace Vivien\Api\Http;

use Psr\Http\Message\ResponseInterface;
use Vivien\Api\Support\Json;

final class Responses
{
    /** @param array<string, mixed> $payload */
    public static function json(ResponseInterface $response, array $payload, int $status = 200): ResponseInterface
    {
        $response->getBody()->write(Json::encode($payload));
        return $response
            ->withHeader('Content-Type', 'application/json; charset=utf-8')
            ->withStatus($status);
    }

    public static function html(ResponseInterface $response, string $html, int $status = 200): ResponseInterface
    {
        $response->getBody()->write($html);
        return $response
            ->withHeader('Content-Type', 'text/html; charset=utf-8')
            ->withStatus($status);
    }
}
