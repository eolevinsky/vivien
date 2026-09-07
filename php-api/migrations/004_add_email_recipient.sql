SET @email_recipient_column_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'gift_cards'
      AND COLUMN_NAME = 'email_recipient'
);

SET @email_recipient_sql := IF(
    @email_recipient_column_exists = 0,
    'ALTER TABLE gift_cards ADD COLUMN email_recipient TINYINT(1) NOT NULL DEFAULT 0 AFTER recipient_birthday',
    'SELECT 1'
);

PREPARE email_recipient_stmt FROM @email_recipient_sql;
EXECUTE email_recipient_stmt;
DEALLOCATE PREPARE email_recipient_stmt;

INSERT IGNORE INTO schema_migrations (version) VALUES ('004_add_email_recipient');
