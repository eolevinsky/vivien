<?php

declare(strict_types=1);

namespace Vivien\Api;

use Endroid\QrCode\QrCode;
use Endroid\QrCode\Writer\SvgWriter;
use GuzzleHttp\Client;
use Monolog\Handler\StreamHandler;
use Monolog\Logger;
use PDO;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Slim\Factory\AppFactory;
use Slim\Exception\HttpException;
use Slim\Routing\RouteCollectorProxy;
use Stripe\Exception\SignatureVerificationException;
use Stripe\StripeClient;
use Stripe\Webhook;
use Vivien\Api\Application\GiftCardWorkflow;
use Vivien\Api\Application\JobProcessor;
use Vivien\Api\Http\CheckoutValidator;
use Vivien\Api\Http\Responses;
use Vivien\Api\Provider\PassSlotClient;
use Vivien\Api\Provider\SyrveClient;
use Vivien\Api\Repository\GiftCardRepository;
use Vivien\Api\Repository\IntegrationRepository;
use Vivien\Api\Repository\JobQueue;
use Vivien\Api\Repository\RateLimiter;
use Vivien\Api\Support\Clock;
use Vivien\Api\Support\Ids;

final class App
{
    public static function create(string $root): \Slim\App
    {
        $config = Config::load($root);
        $db = Database::connect($config);
        $cards = new GiftCardRepository($db);
        $jobs = new JobQueue($db);
        $rateLimiter = new RateLimiter($db);
        $integrations = new IntegrationRepository($db);
        $http = new Client();
        $passslot = new PassSlotClient($http, $config);
        $syrve = new SyrveClient($http, $config);
        $stripe = new StripeClient($config->string('STRIPE_SECRET_KEY'));
        $workflow = new GiftCardWorkflow(
            $config,
            $cards,
            $jobs,
            $integrations,
            $passslot,
            $syrve,
            $stripe,
        );
        $processor = new JobProcessor($config, $jobs, $cards, $integrations, $workflow);
        $logger = new Logger('vivien-api');
        $logPath = $root . '/' . ltrim($config->string('LOG_PATH', 'var/api.log'), '/');
        if (!is_dir(dirname($logPath))) {
            mkdir(dirname($logPath), 0770, true);
        }
        $logger->pushHandler(new StreamHandler($logPath));

        $app = AppFactory::create();
        $app->addBodyParsingMiddleware();

        $app->options('/{routes:.+}', static fn ($request, $response) => $response);

        $app->add(function (
            ServerRequestInterface $request,
            $handler,
        ) use ($config): ResponseInterface {
            $contentLength = $request->getHeaderLine('Content-Length');
            if ($contentLength !== '' && (int) $contentLength > $config->int('MAX_REQUEST_BYTES', 1048576)) {
                return Responses::json(new \Nyholm\Psr7\Response(), ['error' => 'Request too large'], 413);
            }
            $origin = $request->getHeaderLine('Origin');
            $allowed = $config->csv('CORS_ALLOWED_ORIGINS');
            if ($origin !== '' && !in_array($origin, $allowed, true)) {
                return Responses::json(new \Nyholm\Psr7\Response(), ['error' => 'Origin not allowed'], 403);
            }
            $response = $handler->handle($request);
            $response = $response
                ->withHeader('X-Content-Type-Options', 'nosniff')
                ->withHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
                ->withHeader('X-Frame-Options', 'DENY')
                ->withHeader(
                    'Content-Security-Policy',
                    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self' https://checkout.stripe.com",
                );
            if ($origin !== '' && in_array($origin, $allowed, true)) {
                $response = $response
                    ->withHeader('Access-Control-Allow-Origin', $origin)
                    ->withHeader('Vary', 'Origin')
                    ->withHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                    ->withHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Stripe-Signature, X-Syrve-Event-Id')
                    ->withHeader('Access-Control-Max-Age', '600');
            }
            return $response;
        });

        $errorMiddleware = $app->addErrorMiddleware(
            $config->bool('APP_DEBUG'),
            true,
            true,
            $logger,
        );
        $errorMiddleware->setDefaultErrorHandler(
            static function (
                ServerRequestInterface $request,
                \Throwable $error,
                bool $displayErrorDetails,
                bool $logErrors,
                bool $logErrorDetails,
            ) use ($app, $logger, $config): ResponseInterface {
                $logger->error($error->getMessage(), ['exception' => $error]);
                $message = match (true) {
                    $error instanceof \InvalidArgumentException => $error->getMessage(),
                    $error instanceof HttpException => $error->getMessage(),
                    default => 'Internal server error',
                };
                $status = match (true) {
                    $error instanceof \InvalidArgumentException => 422,
                    $error instanceof HttpException => $error->getCode() >= 400 ? $error->getCode() : 500,
                    default => 500,
                };
                $response = Responses::json(
                    $app->getResponseFactory()->createResponse(),
                    ['error' => $message],
                    $status,
                );
                $origin = $request->getHeaderLine('Origin');
                if ($origin !== '' && in_array($origin, $config->csv('CORS_ALLOWED_ORIGINS'), true)) {
                    $response = $response
                        ->withHeader('Access-Control-Allow-Origin', $origin)
                        ->withHeader('Vary', 'Origin');
                }
                return $response;
            },
        );

        self::routes(
            $app,
            $root,
            $config,
            $db,
            $cards,
            $jobs,
            $integrations,
            $rateLimiter,
            $workflow,
            $processor,
            $stripe,
        );

        return $app;
    }

    private static function routes(
        \Slim\App $app,
        string $root,
        Config $config,
        PDO $db,
        GiftCardRepository $cards,
        JobQueue $jobs,
        IntegrationRepository $integrations,
        RateLimiter $rateLimiter,
        GiftCardWorkflow $workflow,
        JobProcessor $processor,
        StripeClient $stripe,
    ): void {
        $app->get('/health', static function ($request, $response) use ($db): ResponseInterface {
            $db->query('SELECT 1')->fetchColumn();
            return Responses::json($response, ['ok' => true, 'database' => 'ok']);
        });

        $app->group('/v1/gift-cards', function (RouteCollectorProxy $group) use (
            $config,
            $cards,
            $rateLimiter,
            $stripe,
        ): void {
            $group->post('/checkout', static function (
                ServerRequestInterface $request,
                ResponseInterface $response,
            ) use ($config, $cards, $rateLimiter, $stripe): ResponseInterface {
                $input = $request->getParsedBody();
                if (!is_array($input)) {
                    $input = [];
                }
                $ip = self::clientIp($request);
                $emailKey = strtolower(trim((string) (($input['payer_email'] ?? '') ?: 'none')));
                $rateKey = 'checkout:' . hash('sha256', $ip . '|' . $emailKey);
                $ipRateKey = 'checkout_ip:' . hash('sha256', $ip);
                if (!$rateLimiter->allow(
                    $ipRateKey,
                    $config->int('CHECKOUT_IP_RATE_LIMIT', 30),
                    $config->int('CHECKOUT_RATE_WINDOW_SECONDS', 900),
                )) {
                    return Responses::json($response, ['error' => 'Too many checkout attempts. Try again later.'], 429);
                }
                if (!$rateLimiter->allow(
                    $rateKey,
                    $config->int('CHECKOUT_RATE_LIMIT', 10),
                    $config->int('CHECKOUT_RATE_WINDOW_SECONDS', 900),
                )) {
                    return Responses::json($response, ['error' => 'Too many checkout attempts. Try again later.'], 429);
                }
                $cardKind = (string) ($input['card_kind'] ?? 'gift');
                if (!in_array($cardKind, ['gift', 'loyalty'], true)) {
                    $cardKind = 'gift';
                }
                if ($cardKind === 'loyalty'
                    && empty($input['recipient_email'])
                    && !empty($input['payer_email'])) {
                    $input['recipient_email'] = $input['payer_email'];
                }
                $checkout = CheckoutValidator::validate($input);
                $created = $cards->createCheckout($checkout);
                $card = $created['card'];
                $order = $created['order'];
                try {
                    $session = $stripe->checkout->sessions->create(
                        [
                            'mode' => 'payment',
                            'payment_method_types' => ['card'],
                            'customer_email' => $order['payer_email'],
                            'client_reference_id' => $order['id'],
                            'locale' => $card['language'],
                            'line_items' => [[
                                'quantity' => 1,
                                'price_data' => [
                                    'currency' => 'eur',
                                    'unit_amount' => $order['amount_cents'],
                                    'product_data' => [
                                        'name' => 'Vivien Gift Card',
                                        'description' => sprintf(
                                            'Digital gift card for %s %s',
                                            $card['recipient_first_name'],
                                            $card['recipient_last_name'],
                                        ),
                                    ],
                                ],
                            ]],
                            'metadata' => [
                                'order_id' => $order['id'],
                                'gift_card_id' => $card['id'],
                                'card_kind' => $cardKind,
                            ],
                            'payment_intent_data' => ['metadata' => [
                                'order_id' => $order['id'],
                                'gift_card_id' => $card['id'],
                                'card_kind' => $cardKind,
                            ]],
                            'success_url' => rtrim($config->string('PUBLIC_BASE_URL'), '/')
                                . '/gift-card/result?session_id={CHECKOUT_SESSION_ID}',
                            'cancel_url' => rtrim($config->string('WEBSITE_BASE_URL'), '/')
                                . '/' . $card['language']
                                . ($cardKind === 'loyalty' ? '/loyalty/' : '/gift-card/')
                                . '?payment=cancelled',
                        ],
                        ['idempotency_key' => 'vivien-checkout-' . $order['id']],
                    );
                } catch (\Throwable $error) {
                    $cards->updateOrder((string) $order['id'], ['status' => 'failed']);
                    throw $error;
                }
                $cards->updateOrder((string) $order['id'], [
                    'stripe_checkout_session_id' => $session->id,
                    'status' => 'checkout_created',
                ]);
                return Responses::json($response, ['checkout_url' => $session->url]);
            });

            $group->get('/{token}/status', static function (
                ServerRequestInterface $request,
                ResponseInterface $response,
                array $args,
            ) use ($cards, $config): ResponseInterface {
                $card = $cards->cardByToken((string) $args['token']);
                if (!$card) {
                    return Responses::json($response, ['error' => 'Gift card not found'], 404);
                }
                $ready = $card['status'] === 'ready';
                $status = (string) $card['status'];
                if ($card['order_status'] === 'failed') {
                    $status = 'payment_failed';
                } elseif ($card['order_status'] === 'expired') {
                    $status = 'expired';
                } elseif ($card['order_status'] === 'refunding') {
                    $status = 'refunding';
                } elseif ($card['order_status'] === 'refunded') {
                    $status = 'refunded';
                } elseif (in_array($card['order_status'], ['disputed', 'dispute_closed'], true)) {
                    $status = (string) $card['status'];
                } elseif ($card['order_status'] === 'refund_failed') {
                    $status = 'manual_review';
                }
                return Responses::json($response, [
                    'status' => $status,
                    'order_status' => $card['order_status'],
                    'recipient_name' => trim($card['recipient_first_name'] . ' ' . $card['recipient_last_name']),
                    'amount' => self::money((int) $card['amount_cents']),
                    'balance' => $ready ? self::money((int) $card['balance_cents']) : null,
                    'card_number' => $ready ? $card['card_number'] : null,
                    'wallet_url' => $ready ? $card['passslot_url'] : null,
                    'qr_url' => $ready
                        ? rtrim($config->string('PUBLIC_BASE_URL'), '/')
                            . '/v1/gift-cards/' . $card['public_token'] . '/qr'
                        : null,
                    'gift_message' => $card['gift_message'],
                    'error' => match ($status) {
                        'manual_review' => 'Payment succeeded, but card activation requires staff assistance.',
                        'payment_failed' => 'Payment was not completed. No card was created.',
                        'expired' => 'The checkout session expired. No card was created.',
                        'refunding' => 'Card activation failed. A refund is being processed.',
                        'refunded' => 'Card activation failed. The payment has been refunded.',
                        'disputed' => 'The payment was disputed. The card is being deactivated.',
                        'revoking' => 'The payment was disputed. The card is being deactivated.',
                        'revoked' => 'The payment was disputed and the card has been deactivated.',
                        default => null,
                    },
                ]);
            });

            $group->get('/{token}/qr', static function (
                ServerRequestInterface $request,
                ResponseInterface $response,
                array $args,
            ) use ($cards): ResponseInterface {
                $card = $cards->cardByToken((string) $args['token']);
                if (!$card || $card['status'] !== 'ready' || empty($card['passslot_url'])) {
                    return Responses::json($response, ['error' => 'QR code is not available'], 404);
                }
                $writer = new SvgWriter();
                $result = $writer->write(new QrCode(data: (string) $card['passslot_url']));
                $response->getBody()->write($result->getString());
                return $response->withHeader('Content-Type', $result->getMimeType());
            });
        });

        $app->post('/webhooks/stripe', static function (
            ServerRequestInterface $request,
            ResponseInterface $response,
        ) use ($config, $cards, $integrations, $workflow, $stripe): ResponseInterface {
            $payload = (string) $request->getBody();
            try {
                $event = Webhook::constructEvent(
                    $payload,
                    $request->getHeaderLine('Stripe-Signature'),
                    $config->string('STRIPE_WEBHOOK_SECRET'),
                );
            } catch (\UnexpectedValueException|SignatureVerificationException) {
                return Responses::json($response, ['error' => 'Invalid Stripe webhook'], 400);
            }
            if (!$integrations->storeWebhook('stripe', $event->id, $payload)) {
                return Responses::json($response, ['received' => true, 'duplicate' => true]);
            }
            $session = $event->data->object;
            $metadata = $session->metadata ?? null;
            $orderId = $metadata?->order_id ?? null;
            $order = is_string($orderId) ? $cards->order($orderId) : null;
            if ($order && in_array(
                $event->type,
                ['checkout.session.completed', 'checkout.session.async_payment_succeeded'],
                true,
            )) {
                if ($session->payment_status === 'paid'
                    && (int) $session->amount_total === (int) $order['amount_cents']
                    && strtolower((string) $session->currency) === $order['currency']) {
                    $deadline = Clock::now()->modify(
                        '+' . $config->int('FULFILLMENT_DEADLINE_MINUTES', 120) . ' minutes',
                    );
                    $cards->updateOrder((string) $order['id'], [
                        'status' => 'paid',
                        'stripe_payment_intent_id' => (string) $session->payment_intent,
                        'fulfillment_deadline' => Clock::sql($deadline),
                    ]);
                    $workflow->queueFulfillment((string) $order['id']);
                } elseif ($session->payment_status === 'paid') {
                    $cards->updateOrder((string) $order['id'], [
                        'status' => 'paid',
                        'stripe_payment_intent_id' => (string) $session->payment_intent,
                    ]);
                    $cards->updateCard((string) $order['gift_card_id'], [
                        'status' => 'manual_review',
                    ]);
                    $integrations->outbox(
                        'gift_card.payment_verification_failed',
                        (string) $order['gift_card_id'],
                        [
                            'event' => 'gift_card.payment_verification_failed',
                            'expected_amount_cents' => (int) $order['amount_cents'],
                            'received_amount_cents' => (int) $session->amount_total,
                            'expected_currency' => $order['currency'],
                            'received_currency' => strtolower((string) $session->currency),
                            'refund_queued' => true,
                            'created_at' => Clock::now()->format(DATE_ATOM),
                        ],
                    );
                    $workflow->queueRefund((string) $order['id']);
                }
            } elseif ($order && $event->type === 'checkout.session.expired') {
                $cards->updateOrder((string) $order['id'], ['status' => 'expired']);
                $cards->updateCard((string) $order['gift_card_id'], ['status' => 'expired']);
            } elseif ($order && $event->type === 'checkout.session.async_payment_failed') {
                $cards->updateOrder((string) $order['id'], ['status' => 'failed']);
                $cards->updateCard((string) $order['gift_card_id'], ['status' => 'payment_failed']);
            } elseif (in_array($event->type, [
                'charge.dispute.created',
                'charge.dispute.funds_withdrawn',
                'charge.dispute.updated',
            ], true)) {
                $paymentIntent = self::paymentIntentFromStripeObject($stripe, $session);
                $order = $paymentIntent ? $cards->orderByPaymentIntent($paymentIntent) : null;
                if ($order) {
                    $disputeStatus = (string) ($session->status ?? '');
                    $isInquiry = str_starts_with($disputeStatus, 'warning_');
                    $shouldRevoke = $event->type === 'charge.dispute.funds_withdrawn'
                        || in_array($disputeStatus, ['needs_response', 'under_review', 'lost'], true);
                    $cards->updateOrder((string) $order['id'], [
                        'status' => $isInquiry && !$shouldRevoke ? 'dispute_inquiry' : 'disputed',
                    ]);
                    if ($shouldRevoke) {
                        $cards->updateCard((string) $order['gift_card_id'], ['status' => 'disputed']);
                    }
                    $integrations->outbox(
                        $shouldRevoke ? 'gift_card.payment_disputed' : 'gift_card.payment_inquiry',
                        (string) $order['gift_card_id'],
                        [
                            'event' => $shouldRevoke
                                ? 'gift_card.payment_disputed'
                                : 'gift_card.payment_inquiry',
                            'stripe_event_type' => $event->type,
                            'stripe_dispute_id' => (string) ($session->id ?? ''),
                            'stripe_dispute_status' => $disputeStatus,
                            'card_revoke_queued' => $shouldRevoke,
                            'created_at' => Clock::now()->format(DATE_ATOM),
                        ],
                    );
                    if ($shouldRevoke) {
                        $workflow->queueRevoke((string) $order['id'], $event->type);
                    }
                }
            } elseif ($event->type === 'charge.dispute.closed') {
                $paymentIntent = self::paymentIntentFromStripeObject($stripe, $session);
                $order = $paymentIntent ? $cards->orderByPaymentIntent($paymentIntent) : null;
                if ($order) {
                    $status = (string) ($session->status ?? '');
                    if (in_array($status, ['lost', 'warning_closed'], true)) {
                        $cards->updateOrder((string) $order['id'], ['status' => 'dispute_closed']);
                    } elseif ($status === 'won') {
                        $cards->updateOrder((string) $order['id'], ['status' => 'dispute_won']);
                        $cards->updateCard((string) $order['gift_card_id'], ['status' => 'manual_review']);
                    }
                    $integrations->outbox(
                        'gift_card.payment_dispute_closed',
                        (string) $order['gift_card_id'],
                        [
                            'event' => 'gift_card.payment_dispute_closed',
                            'stripe_dispute_id' => (string) ($session->id ?? ''),
                            'stripe_dispute_status' => $status,
                            'created_at' => Clock::now()->format(DATE_ATOM),
                        ],
                    );
                }
            } elseif ($event->type === 'refund.failed') {
                $refundId = (string) ($session->id ?? '');
                $paymentIntent = (string) ($session->payment_intent ?? '');
                $order = $refundId !== '' ? $cards->orderByRefund($refundId) : null;
                $order ??= $paymentIntent !== '' ? $cards->orderByPaymentIntent($paymentIntent) : null;
                if ($order) {
                    $cards->updateOrder((string) $order['id'], ['status' => 'refund_failed']);
                    $cards->updateCard((string) $order['gift_card_id'], ['status' => 'manual_review']);
                    $integrations->outbox(
                        'gift_card.refund_failed',
                        (string) $order['gift_card_id'],
                        [
                            'event' => 'gift_card.refund_failed',
                            'stripe_refund_id' => $refundId,
                            'manual_review' => true,
                            'created_at' => Clock::now()->format(DATE_ATOM),
                        ],
                    );
                }
            } elseif ($event->type === 'refund.updated') {
                $refundId = (string) ($session->id ?? '');
                $paymentIntent = (string) ($session->payment_intent ?? '');
                $order = $refundId !== '' ? $cards->orderByRefund($refundId) : null;
                $order ??= $paymentIntent !== '' ? $cards->orderByPaymentIntent($paymentIntent) : null;
                if ($order) {
                    $refundStatus = (string) ($session->status ?? '');
                    if ($refundStatus === 'failed') {
                        $cards->updateOrder((string) $order['id'], ['status' => 'refund_failed']);
                        $cards->updateCard((string) $order['gift_card_id'], ['status' => 'manual_review']);
                    } elseif ($refundStatus === 'pending') {
                        $cards->updateOrder((string) $order['id'], ['status' => 'refunding']);
                        $cards->updateCard((string) $order['gift_card_id'], ['status' => 'refunding']);
                    } elseif ($refundStatus === 'succeeded') {
                        $cards->updateOrder((string) $order['id'], ['status' => 'refunded']);
                        $cards->updateCard((string) $order['gift_card_id'], ['status' => 'refunded']);
                        $workflow->queueRevoke((string) $order['id'], 'stripe.refund.updated');
                    }
                }
            }
            $integrations->markWebhookProcessed('stripe', $event->id);
            return Responses::json($response, ['received' => true]);
        });

        $app->post('/webhooks/syrve/balance-changed', static function (
            ServerRequestInterface $request,
            ResponseInterface $response,
        ) use ($config, $cards, $integrations, $jobs): ResponseInterface {
            $expected = 'Bearer ' . $config->string('SYRVE_WEBHOOK_SECRET');
            if ($config->string('SYRVE_WEBHOOK_SECRET') === ''
                || !hash_equals($expected, $request->getHeaderLine('Authorization'))) {
                return Responses::json($response, ['error' => 'Unauthorized'], 401);
            }
            $raw = (string) $request->getBody();
            $payload = json_decode($raw, true);
            if (!is_array($payload)) {
                return Responses::json($response, ['error' => 'Invalid JSON'], 400);
            }
            $eventId = $request->getHeaderLine('X-Syrve-Event-Id') ?: Ids::uuid();
            if (!$integrations->storeWebhook('syrve', $eventId, $raw)) {
                return Responses::json($response, ['accepted' => true, 'duplicate' => true], 202);
            }
            $card = $cards->cardByProviderIdentifier(
                isset($payload['customerId']) ? (string) $payload['customerId'] : null,
                isset($payload['cardNumber'])
                    ? (string) $payload['cardNumber']
                    : (isset($payload['barcode']) ? (string) $payload['barcode'] : null),
            );
            if ($card) {
                $jobs->enqueue(
                    'sync_balance',
                    (string) $card['id'],
                    'sync_balance:' . $card['id'],
                    ['event_id' => $eventId],
                );
            }
            $integrations->markWebhookProcessed('syrve', $eventId);
            return Responses::json(
                $response,
                ['accepted' => true, 'matched' => $card !== null],
                202,
            );
        });

        $app->get('/gift-card/result', static function (
            ServerRequestInterface $request,
            ResponseInterface $response,
        ) use ($stripe, $cards, $root): ResponseInterface {
            $sessionId = (string) ($request->getQueryParams()['session_id'] ?? '');
            if ($sessionId === '') {
                return Responses::json($response, ['error' => 'Missing Checkout Session'], 400);
            }
            try {
                $session = $stripe->checkout->sessions->retrieve($sessionId);
            } catch (\Throwable) {
                return Responses::json($response, ['error' => 'Invalid Checkout Session'], 400);
            }
            $orderId = $session->metadata?->order_id ?? null;
            $order = is_string($orderId) ? $cards->order($orderId) : null;
            if (!$order || $order['stripe_checkout_session_id'] !== $sessionId) {
                return Responses::json($response, ['error' => 'Gift-card order not found'], 404);
            }
            $cardKind = $session->metadata?->card_kind === 'loyalty' ? 'loyalty' : 'gift';
            $template = file_get_contents($root . '/templates/giftcard-result.html');
            $html = str_replace(
                ['{{PUBLIC_TOKEN}}', '{{LANGUAGE}}', '{{CARD_KIND}}'],
                [
                    json_encode($order['public_token'], JSON_THROW_ON_ERROR),
                    htmlspecialchars((string) $order['language'], ENT_QUOTES, 'UTF-8'),
                    json_encode($cardKind, JSON_THROW_ON_ERROR),
                ],
                $template,
            );
            return Responses::html($response, $html);
        });

        $app->group('/internal', function (RouteCollectorProxy $group) use (
            $processor,
            $cards,
            $workflow,
        ): void {
            $group->get('/process-jobs', static fn ($request, $response) =>
                Responses::json($response, $processor->run()));
            $group->post('/process-jobs', static fn ($request, $response) =>
                Responses::json($response, $processor->run()));
            $group->post('/orders/{id}/retry', static function (
                $request,
                $response,
                array $args,
            ) use ($cards, $workflow): ResponseInterface {
                $order = $cards->order((string) $args['id']);
                if (!$order) {
                    return Responses::json($response, ['error' => 'Order not found'], 404);
                }
                if ($order['status'] !== 'paid') {
                    return Responses::json($response, ['error' => 'Only paid orders can be retried'], 409);
                }
                $workflow->queueFulfillment((string) $args['id']);
                return Responses::json($response, ['queued' => true]);
            });
            $group->post('/orders/{id}/refund', static function (
                $request,
                $response,
                array $args,
            ) use ($cards, $workflow): ResponseInterface {
                $order = $cards->order((string) $args['id']);
                if (!$order) {
                    return Responses::json($response, ['error' => 'Order not found'], 404);
                }
                if (empty($order['stripe_payment_intent_id'])) {
                    return Responses::json($response, ['error' => 'Order has no payment to refund'], 409);
                }
                $workflow->queueRefund((string) $args['id']);
                return Responses::json($response, ['queued' => true]);
            });
        })->add(static function (
            ServerRequestInterface $request,
            $handler,
        ) use ($config): ResponseInterface {
            $cronSecret = $config->string('INTERNAL_JOB_SECRET');
            $adminSecret = $config->string('INTERNAL_ADMIN_SECRET', $cronSecret);
            if ($adminSecret === '' && $cronSecret === '') {
                return Responses::json(new \Nyholm\Psr7\Response(), ['error' => 'Unauthorized'], 401);
            }
            if ($adminSecret !== ''
                && hash_equals('Bearer ' . $adminSecret, $request->getHeaderLine('Authorization'))) {
                return $handler->handle($request);
            }

            $path = $request->getUri()->getPath();
            $querySecret = (string) ($request->getQueryParams()['secret'] ?? '');
            $isCronJobEndpoint = str_ends_with($path, '/internal/process-jobs');
            if ($isCronJobEndpoint && $querySecret !== '' && hash_equals($cronSecret, $querySecret)) {
                return $handler->handle($request);
            }

            return Responses::json(new \Nyholm\Psr7\Response(), ['error' => 'Unauthorized'], 401);
        });
    }

    private static function money(int $cents): string
    {
        return '€' . number_format($cents / 100, 2, '.', '');
    }


    private static function paymentIntentFromStripeObject(StripeClient $stripe, mixed $object): ?string
    {
        $paymentIntent = $object->payment_intent ?? null;
        if (is_string($paymentIntent) && $paymentIntent !== '') {
            return $paymentIntent;
        }
        $charge = $object->charge ?? $object->charge_id ?? null;
        if (!is_string($charge) || $charge === '') {
            return null;
        }
        try {
            $chargeObject = $stripe->charges->retrieve($charge);
        } catch (\Throwable) {
            return null;
        }
        $paymentIntent = $chargeObject->payment_intent ?? null;
        return is_string($paymentIntent) && $paymentIntent !== '' ? $paymentIntent : null;
    }

    private static function clientIp(ServerRequestInterface $request): string
    {
        $server = $request->getServerParams();
        $remote = (string) ($server['REMOTE_ADDR'] ?? '');
        return $remote !== '' ? $remote : 'unknown';
    }
}
