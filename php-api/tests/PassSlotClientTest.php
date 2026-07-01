<?php

declare(strict_types=1);

namespace Vivien\Api\Tests;

use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Middleware;
use GuzzleHttp\Psr7\Response;
use PHPUnit\Framework\TestCase;
use Vivien\Api\Config;
use Vivien\Api\Provider\PassSlotClient;

final class PassSlotClientTest extends TestCase
{
    public function testCreatePayloadContainsRequiredProductionPlaceholders(): void
    {
        $history = [];
        $stack = HandlerStack::create(new MockHandler([
            new Response(200, [], json_encode([
                'serialNumber' => 'serial-1',
                'passTypeIdentifier' => 'pass.loyalty',
                'url' => 'https://wallet.test/serial-1',
            ], JSON_THROW_ON_ERROR)),
        ]));
        $stack->push(Middleware::history($history));
        $client = new PassSlotClient(
            new Client(['handler' => $stack]),
            new Config([
                'PASSSLOT_MODE' => 'live',
                'PASSSLOT_API_KEY' => 'test-key',
                'PASSSLOT_TEMPLATE_ID' => 'template-1',
                'PASSSLOT_BALANCE_FIELD' => 'points',
            ]),
        );

        $result = $client->createPass('12345678901', 'Jane', 'Doe', 5000);

        self::assertSame('serial-1', $result['serialNumber']);
        $payload = json_decode((string) $history[0]['request']->getBody(), true, 512, JSON_THROW_ON_ERROR);
        foreach (['email', 'phoneNumber', 'offersUrl', 'message', 'referUrl', 'profileUrl'] as $field) {
            self::assertArrayHasKey($field, $payload);
            self::assertSame('', $payload[$field]);
        }
        self::assertMatchesRegularExpression('/^\d{2}\.\d{2}\.\d{4}$/', (string) $payload['memberSince']);
        self::assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2}$/', (string) $payload['joinedAt']);
        self::assertSame(50, $payload['points']);
    }

    public function testValuesEndpointUsesCardNumberAsBarcode(): void
    {
        $history = [];
        $stack = HandlerStack::create(new MockHandler([
            new Response(200, [], '{"cardNumber":"12345678901","points":50}'),
        ]));
        $stack->push(Middleware::history($history));
        $client = new PassSlotClient(
            new Client(['handler' => $stack]),
            new Config(['PASSSLOT_MODE' => 'live', 'PASSSLOT_API_KEY' => 'test-key']),
        );

        $values = $client->values('pass.loyalty', 'serial-1', '');

        self::assertSame('12345678901', $values['barcode']['message']);
        self::assertStringEndsWith(
            '/passes/pass.loyalty/serial-1/values',
            (string) $history[0]['request']->getUri(),
        );
    }
}
