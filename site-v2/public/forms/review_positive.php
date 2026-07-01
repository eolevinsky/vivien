<?php
require_once __DIR__ . '/_mailer.php';

vivien_send([
  'to' => ['feedback@brivibas.planfix.com'],
  'subject' => 'New positive public-review intent',
  'required' => [],
  'email_fields' => [],
  'fields' => [
    'Sentiment' => 'sentiment',
  ],
]);
