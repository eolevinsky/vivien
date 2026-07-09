ALTER TABLE gift_cards
    ADD COLUMN recipient_birthday DATE NULL AFTER recipient_email;

INSERT IGNORE INTO schema_migrations (version) VALUES ('002_add_recipient_birthday');
