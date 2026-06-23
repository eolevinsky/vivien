<?php
require_once __DIR__ . '/_mailer.php';

vivien_send([
  'to' => ['gift-cards@brivibas.planfix.com'],
  'subject' => vivien_value('subject') ?: 'New Vivien Gift Card Order',
  'required' => ['amount', 'payer_email', 'name', 'email', 'phone', 'consent'],
  'email_fields' => ['payer_email', 'email'],
  'reply_to' => 'payer_email',
  'fields' => [
    'Amount' => 'amount',
    'Delivery at' => 'delivery_at',
    'Payer email' => 'payer_email',
    'Payer note' => 'payer_note',
    'Recipient name' => 'name',
    'Recipient email' => 'email',
    'Recipient phone' => 'phone',
    'Recipient message' => 'message_to_recipient',
  ],
]);
