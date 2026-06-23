const ATTRIBUTION_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'gbraid', 'wbraid', 'fbclid'];

function eventId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function attribution() {
  const params = new URLSearchParams(window.location.search);
  return ATTRIBUTION_KEYS.reduce((memo, key) => {
    const value = params.get(key);
    if (value) memo[key] = value;
    return memo;
  }, {});
}

function pushEvent(event, data = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event,
    event_id: data.event_id || eventId(event),
    page_location: window.location.href,
    ...attribution(),
    ...data,
  });
}

function showBookingFallback() {
  const fallback = document.querySelector('[data-booking-fallback]');
  if (fallback) fallback.hidden = false;
}

window.openBooking = function openBooking(options = {}) {
  const source = options.source || 'fallback';
  const auto = Boolean(options.auto);
  pushEvent('booking_intent', { booking_source: source, auto });

  const trigger = document.getElementById('restoplace-btn') || document.querySelector('.restoplace-click-open');
  if (trigger) {
    trigger.click();
    pushEvent('restoplace_widget_open', { booking_source: source, auto });
  }

  window.setTimeout(() => {
    const hasRestoplaceFrame = document.querySelector('iframe[src*="restoplace"], .restoplace-widget, [class*="restoplace"]');
    if (!hasRestoplaceFrame) showBookingFallback();
  }, 1800);
};

function bootNavigation() {
  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-nav]');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', () => {
    const open = !nav.classList.contains('open');
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
}

function bootHeaderScroll() {
  const applyState = () => {
    document.body.classList.toggle('scrolled', window.scrollY > 100);
  };
  applyState();
  window.addEventListener('scroll', applyState, { passive: true });
}

function bootBookingButtons() {
  document.addEventListener('click', (event) => {
    const button = event.target.closest('.js-booking-trigger');
    if (!button) return;
    event.preventDefault();
    window.openBooking({
      source: button.dataset.bookingSource || 'fallback',
      auto: false,
    });
  });

  const params = new URLSearchParams(window.location.search);
  if (params.get('openBooking') === '1') {
    window.setTimeout(() => {
      window.openBooking({ source: 'book_auto', auto: true });
    }, 450);
  }
}

function bootPrepareTableButtons() {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-prepare-table]');
    if (!link) return;
    pushEvent('prepare_table_click', {
      outbound_url: link.href,
    });
  });
}

function bootMenuFilters() {
  const shell = document.querySelector('[data-menu-shell]');
  if (!shell) return;
  const buttons = shell.querySelectorAll('[data-menu-filter]');
  const items = shell.querySelectorAll('[data-menu-category]');
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.dataset.menuFilter;
      buttons.forEach((item) => item.classList.toggle('active', item === button));
      items.forEach((item) => {
        item.hidden = filter !== '*' && item.dataset.menuCategory !== filter;
      });
    });
  });
}

function bootForms() {
  document.querySelectorAll('form.vivien-form').forEach((form) => {
    const state = form.querySelector('[data-form-state]');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (state) {
        state.className = 'form-state';
        state.textContent = 'Sending...';
      }
      try {
        const response = await fetch(form.action, {
          method: form.method || 'POST',
          body: new FormData(form),
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
        });
        const text = (await response.text()).trim();
        if (!response.ok || text !== 'OK') {
          throw new Error(text || 'Submission failed');
        }
        form.reset();
        if (state) {
          state.className = 'form-state success';
          state.textContent = form.dataset.successMessage || 'Thank you. Your request has been sent.';
        }
        if (form.dataset.successEvent) {
          pushEvent(form.dataset.successEvent, { form_action: form.getAttribute('action') || '' });
        }
      } catch (error) {
        if (state) {
          state.className = 'form-state error';
          state.textContent = error.message || 'Submission failed';
        }
      }
    });
  });
}

function bootReviewPositive() {
  document.querySelectorAll('[data-positive-review]').forEach((button) => {
    button.addEventListener('click', async () => {
      pushEvent('review_positive', { review_destination: 'google' });
      const formData = new FormData();
      formData.set('sentiment', 'positive');
      formData.set('language', document.documentElement.lang || 'en');
      formData.set('source_page', window.location.pathname);
      try {
        await fetch(button.dataset.positiveReview, { method: 'POST', body: formData });
      } catch (_) {
        // The public review flow should continue even if internal notification fails.
      }
      window.location.href = button.dataset.googleReviewUrl;
    });
  });
}

function bootRestoplaceMessages() {
  window.addEventListener('message', (event) => {
    const raw = typeof event.data === 'string' ? event.data : JSON.stringify(event.data || {});
    if (/reserve_success/i.test(raw)) pushEvent('reserve_success', { booking_source: 'restoplace' });
    if (/btn_reserve_send|reserve_submit/i.test(raw)) pushEvent('reserve_submit_click', { booking_source: 'restoplace' });
    if (/open_widget/i.test(raw)) pushEvent('restoplace_widget_open', { booking_source: 'restoplace' });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  bootHeaderScroll();
  bootNavigation();
  bootBookingButtons();
  bootPrepareTableButtons();
  bootMenuFilters();
  bootForms();
  bootReviewPositive();
  bootRestoplaceMessages();
});
