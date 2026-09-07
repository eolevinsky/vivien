-- Safe to re-import on MariaDB, including 10.3 hosting.
SET @gift_column_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'gift_cards' AND COLUMN_NAME = 'is_gift'
);
SET @gift_sql := IF(@gift_column_exists = 0,
    'ALTER TABLE gift_cards ADD COLUMN is_gift TINYINT(1) NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE gift_stmt FROM @gift_sql;
EXECUTE gift_stmt;
DEALLOCATE PREPARE gift_stmt;

SET @sender_column_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'gift_cards' AND COLUMN_NAME = 'sender_name'
);
SET @sender_sql := IF(@sender_column_exists = 0,
    'ALTER TABLE gift_cards ADD COLUMN sender_name VARCHAR(100) NOT NULL DEFAULT ''''', 'SELECT 1');
PREPARE sender_stmt FROM @sender_sql;
EXECUTE sender_stmt;
DEALLOCATE PREPARE sender_stmt;

INSERT IGNORE INTO schema_migrations (version) VALUES ('005_add_gift_sender');
