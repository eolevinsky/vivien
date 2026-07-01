<?php

declare(strict_types=1);

namespace Vivien\Api\Provider;

interface SyrveGateway
{
    public function createCustomer(
        string $barcode,
        string $firstName,
        string $lastName,
        string $serial,
        ?string $email = null,
        ?string $birthday = null,
    ): string;

    public function defaultWalletId(string $customerId): string;

    public function topUp(string $customerId, string $walletId, int $amountCents, string $comment): void;

    public function chargeOff(string $customerId, string $walletId, int $amountCents, string $comment): void;

    public function balanceCents(string $customerId, string $walletId): int;

    public function hasTransaction(string $customerId, string $comment): bool;

    public function deleteCustomer(string $customerId): void;
}
