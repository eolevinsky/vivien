<?php
require_once __DIR__ . '/_mailer.php';

vivien_send([
  'to' => ['new_loyal@brivibas.planfix.com'],
  'subject' => 'New loyal customer request from the website',
  'required' => ['name', 'email', 'phone', 'consent'],
  'email_fields' => ['email'],
  'reply_to' => 'email',
  'fields' => [
    'Name' => 'name',
    'Email' => 'email',
    'Phone' => 'phone',
    'Birthdate' => 'birthdate',
    'Family size' => 'people',
    'Gender' => 'gender',
    'Profession' => 'profession',
    'Info source' => 'infosource',
    'Message' => 'message',
  ],
]);
