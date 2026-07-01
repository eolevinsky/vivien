<?php
require_once __DIR__ . '/_mailer.php';

vivien_send([
  'to' => ['new_contact@brivibas.planfix.com'],
  'subject' => vivien_value('subject') ?: 'New Vivien contact request',
  'required' => ['name', 'email', 'subject', 'message', 'consent'],
  'email_fields' => ['email'],
  'reply_to' => 'email',
  'fields' => [
    'Name' => 'name',
    'Email' => 'email',
    'Subject' => 'subject',
    'Message' => 'message',
  ],
]);
