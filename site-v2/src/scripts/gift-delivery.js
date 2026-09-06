export function bootGiftDelivery(form) {
  const root = form.querySelector('[data-gift-delivery]');
  if (!root) return;
  const toggle = root.querySelector('[data-gift-toggle]');
  const giftValue = root.querySelector('[name="is_gift"]');
  const details = root.querySelector('[data-gift-details]');
  const sender = root.querySelector('[name="sender_name"]');
  const message = root.querySelector('[name="message_to_recipient"]');
  const emailToggle = root.querySelector('[name="email_recipient"]');
  const emailField = root.querySelector('[data-recipient-email-field]');
  const email = root.querySelector('[name="recipient_email"]');

  const sync = () => {
    const gift = toggle.checked;
    giftValue.value = gift ? '1' : '0';
    details.hidden = !gift;
    toggle.setAttribute('aria-expanded', String(gift));
    sender.disabled = message.disabled = emailToggle.disabled = !gift;
    sender.required = gift;
    if (!gift) emailToggle.checked = false;
    const send = gift && emailToggle.checked;
    emailField.hidden = !send;
    email.disabled = !send;
    email.required = send;
    emailToggle.setAttribute('aria-expanded', String(send));
  };
  toggle.addEventListener('change', sync);
  emailToggle.addEventListener('change', sync);
  form.addEventListener('reset', () => setTimeout(sync, 0));
  window.addEventListener('pageshow', sync);
  sync();
}
