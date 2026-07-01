CREATE TABLE IF NOT EXISTS rate_limits (
    rate_key VARCHAR(190) PRIMARY KEY,
    hits INT NOT NULL DEFAULT 0,
    reset_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    INDEX ix_rate_limits_reset (reset_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO schema_migrations (version) VALUES ('003_add_rate_limits');
