CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(100) PRIMARY KEY,
    applied_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE gift_cards (
    id CHAR(36) PRIMARY KEY,
    public_token CHAR(64) NOT NULL UNIQUE,
    card_number VARCHAR(32) NOT NULL UNIQUE,
    recipient_first_name VARCHAR(100) NOT NULL,
    recipient_last_name VARCHAR(100) NOT NULL,
    recipient_email VARCHAR(254) NULL,
    recipient_birthday DATE NULL,
    gift_message TEXT NOT NULL,
    language VARCHAR(5) NOT NULL DEFAULT 'en',
    currency CHAR(3) NOT NULL DEFAULT 'eur',
    balance_cents INT NOT NULL DEFAULT 0,
    loyalty_balance_cents INT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    passslot_serial_number VARCHAR(255) NULL UNIQUE,
    passslot_type_identifier VARCHAR(255) NULL,
    passslot_url TEXT NULL,
    barcode VARCHAR(255) NULL UNIQUE,
    syrve_customer_id VARCHAR(64) NULL UNIQUE,
    syrve_gift_wallet_id VARCHAR(64) NULL,
    syrve_loyalty_wallet_id VARCHAR(64) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    INDEX ix_gift_cards_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payment_orders (
    id CHAR(36) PRIMARY KEY,
    gift_card_id CHAR(36) NOT NULL,
    amount_cents INT NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'eur',
    payer_email VARCHAR(254) NOT NULL,
    payer_note TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'created',
    stripe_checkout_session_id VARCHAR(255) NULL UNIQUE,
    stripe_payment_intent_id VARCHAR(255) NULL UNIQUE,
    stripe_refund_id VARCHAR(255) NULL UNIQUE,
    fulfillment_deadline DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_payment_orders_card FOREIGN KEY (gift_card_id) REFERENCES gift_cards(id),
    INDEX ix_payment_orders_card (gift_card_id),
    INDEX ix_payment_orders_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE jobs (
    id CHAR(36) PRIMARY KEY,
    job_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    dedupe_key VARCHAR(255) NOT NULL UNIQUE,
    payload_json JSON NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    attempts INT NOT NULL DEFAULT 0,
    run_at DATETIME(6) NOT NULL,
    locked_at DATETIME(6) NULL,
    last_error TEXT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    INDEX ix_jobs_due (status, run_at),
    INDEX ix_jobs_entity (entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE provider_operations (
    id CHAR(36) PRIMARY KEY,
    operation_key VARCHAR(255) NOT NULL UNIQUE,
    provider VARCHAR(30) NOT NULL,
    operation VARCHAR(80) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'started',
    request_json JSON NOT NULL,
    response_json JSON NOT NULL,
    external_id VARCHAR(255) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    INDEX ix_provider_operations_entity (entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE webhook_events (
    id CHAR(36) PRIMARY KEY,
    provider VARCHAR(30) NOT NULL,
    event_id VARCHAR(255) NOT NULL,
    payload_json JSON NOT NULL,
    processed TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL,
    UNIQUE KEY uq_webhook_provider_event (provider, event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE planfix_outbox (
    id CHAR(36) PRIMARY KEY,
    event_type VARCHAR(80) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    payload_json JSON NOT NULL,
    delivered TINYINT(1) NOT NULL DEFAULT 0,
    attempts INT NOT NULL DEFAULT 0,
    last_error TEXT NULL,
    created_at DATETIME(6) NOT NULL,
    INDEX ix_planfix_outbox_pending (delivered, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE rate_limits (
    rate_key VARCHAR(190) PRIMARY KEY,
    hits INT NOT NULL DEFAULT 0,
    reset_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    INDEX ix_rate_limits_reset (reset_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO schema_migrations (version) VALUES ('001_initial');
