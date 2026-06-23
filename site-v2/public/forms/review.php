<?php
require_once __DIR__ . '/_mailer.php';

vivien_send([
  'to' => ['feedback@brivibas.planfix.com'],
  'subject' => 'New private Vivien feedback',
  'required' => ['email', 'message', 'consent'],
  'email_fields' => ['email'],
  'reply_to' => 'email',
  'fields' => [
    'Name' => 'name',
    'Email' => 'email',
    'Phone' => 'phone',
    'Message' => 'message',
  ],
]);
