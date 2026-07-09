<?php

declare(strict_types=1);

namespace Vivien\Api\Provider;

interface PassSlotGateway
{
    /** @return array<string, mixed> */
    public function createPass(
        string $cardNumber,
        string $firstName,
        string $lastName,
        int $amountCents,
        ?string $email = null,
    ): array;

    /** @return array<string, mixed> */
    public function values(string $passType, string $serial, string $fallbackCardNumber): array;

    /** @return array<string, mixed>|null */
    public function findByCardNumber(string $cardNumber): ?array;

    public function updateBalance(string $passType, string $serial, int $balanceCents): void;

    public function deletePass(string $passType, string $serial): void;
}
