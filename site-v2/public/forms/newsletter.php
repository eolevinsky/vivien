<?php
require_once __DIR__ . '/_mailer.php';

vivien_send([
  'to' => ['subscribe@brivibas.planfix.com'],
  'subject' => 'New Vivien newsletter subscription',
  'required' => ['email', 'consent'],
  'email_fields' => ['email'],
  'reply_to' => 'email',
  'fields' => [
    'Email' => 'email',
  ],
]);
