SET @recipient_birthday_column_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'gift_cards'
      AND COLUMN_NAME = 'recipient_birthday'
);

SET @recipient_birthday_sql := IF(
    @recipient_birthday_column_exists = 0,
    'ALTER TABLE gift_cards ADD COLUMN recipient_birthday DATE NULL AFTER recipient_email',
    'SELECT 1'
);

PREPARE recipient_birthday_stmt FROM @recipient_birthday_sql;
EXECUTE recipient_birthday_stmt;
DEALLOCATE PREPARE recipient_birthday_stmt;

INSERT IGNORE INTO schema_migrations (version) VALUES ('002_add_recipient_birthday');
