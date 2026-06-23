<?php
require_once __DIR__ . '/_mailer.php';

vivien_send([
  'to' => ['new-job-application@brivibas.planfix.com'],
  'subject' => (vivien_value('position') ? vivien_value('position') . ' - ' : '') . 'New Job Application',
  'required' => ['name', 'email', 'phone', 'message', 'position', 'consent'],
  'email_fields' => ['email'],
  'reply_to' => 'email',
  'fields' => [
    'Position' => 'position',
    'Name' => 'name',
    'Email' => 'email',
    'Phone' => 'phone',
    'Message' => 'message',
  ],
]);
