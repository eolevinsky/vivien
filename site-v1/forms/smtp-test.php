<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require '../assets/vendor/phpmailer/PHPMailer.php';
require '../assets/vendor/phpmailer/SMTP.php';
require '../assets/vendor/phpmailer/Exception.php';

$mail = new PHPMailer(true);

try {
    $mail->isSMTP();
    $mail->Host = 'smtp-pulse.com';
    $mail->SMTPAuth = true;
    $mail->Username = 'bobo.brivibas37@gmail.com';      // ← твой Gmail
    $mail->Password = 'Y8miqLtEqm';          // ← сюда App Password
    $mail->SMTPSecure = 'tls';
    $mail->Port = 587;

    $mail->setFrom('bobo.brivibas37@gmail.com', 'SMTP Test');
    $mail->addAddress('bobo.brivibas37@gmail.com');

    $mail->Subject = 'SMTP connection test';
    $mail->Body    = 'Success! SMTP connection via Gmail works.';

    $mail->SMTPDebug = 2; // Показывает отладку (можно убрать после теста)

    if ($mail->send()) {
        echo 'Success: Email sent';
    } else {
        echo 'Error: ' . $mail->ErrorInfo;
    }
} catch (Exception $e) {
    echo 'Exception: ' . $mail->ErrorInfo;
}
