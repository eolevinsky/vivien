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
use Vivien\Api\Provider\SyrveClient;

final class SyrveClientTest extends TestCase
{
    public function testCustomerCreationUsesAutomaticallyAssignedWebGiftWallet(): void
    {
        $history = [];
        $stack = HandlerStack::create(new MockHandler([
            new Response(200, [], '{"token":"token-1"}'),
            new Response(200, [], '{"id":"customer-1"}'),
            new Response(200, [], json_encode([
                'id' => 'customer-1',
                'walletBalances' => [[
                    'id' => 'wallet-1',
                    'name' => 'Vivien Loyalty General (Customers + Employees + Web Gift Cards)',
                    'type' => 1,
                    'balance' => 0,
                ]],
            ], JSON_THROW_ON_ERROR)),
        ]));
        $stack->push(Middleware::history($history));
        $client = new SyrveClient(
            new Client(['handler' => $stack]),
            new Config([
                'SYRVE_MODE' => 'live',
                'SYRVE_BASE_URL' => 'https://api-eu.syrve.live',
                'SYRVE_API_LOGIN' => 'login',
                'SYRVE_ORGANIZATION_ID' => 'organization-1',
                'SYRVE_LOYALTY_PREFIX' => 'syrve',
            ]),
        );

        $customerId = $client->createCustomer(
            '12345678901',
            'Jane',
            'Doe',
            'serial-1',
            'jane@example.com',
            '1990-04-15',
        );
        $walletId = $client->defaultWalletId($customerId);

        self::assertSame('customer-1', $customerId);
        self::assertSame('wallet-1', $walletId);
        self::assertStringEndsWith(
            '/api/1/loyalty/syrve/customer/create_or_update',
            (string) $history[1]['request']->getUri(),
        );
        self::assertStringEndsWith(
            '/api/1/loyalty/syrve/customer/info',
            (string) $history[2]['request']->getUri(),
        );
        $customerPayload = json_decode(
            (string) $history[1]['request']->getBody(),
            true,
            512,
            JSON_THROW_ON_ERROR,
        );
        self::assertSame('12345678901', $customerPayload['cardNumber']);
        self::assertSame('jane@example.com', $customerPayload['email']);
        self::assertSame('1990-04-15 00:00:00.000', $customerPayload['birthday']);
        self::assertArrayNotHasKey('phone', $customerPayload);
    }
}
