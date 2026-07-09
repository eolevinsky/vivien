<?php

declare(strict_types=1);

namespace Vivien\Api\Tests;

use Endroid\QrCode\QrCode;
use Endroid\QrCode\Writer\SvgWriter;
use PHPUnit\Framework\TestCase;

final class QrCodeTest extends TestCase
{
    public function testSvgQrCodeCanBeGeneratedWithoutGd(): void
    {
        $result = (new SvgWriter())->write(new QrCode(data: 'https://example.test/wallet'));

        self::assertSame('image/svg+xml', $result->getMimeType());
        self::assertGreaterThan(100, strlen($result->getString()));
    }
}
