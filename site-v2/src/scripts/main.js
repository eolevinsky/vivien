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

function bootScrollTop() {
  const button = document.querySelector('[data-scroll-top]');
  if (!button) return;

  const applyState = () => {
    button.classList.toggle('active', window.scrollY > 100);
  };

  button.addEventListener('click', (event) => {
    event.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  });

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
    const applyFilter = () => {
      const filter = button.dataset.menuFilter;
      buttons.forEach((item) => {
        const selected = item === button;
        item.classList.toggle('active', selected);
        item.classList.toggle('filter-active', selected);
      });
      items.forEach((item) => {
        item.hidden = filter !== '*' && item.dataset.menuCategory !== filter;
      });
    };

    button.addEventListener('click', applyFilter);
    button.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        applyFilter();
      }
    });
  });
}

function formFailureMessage(form, response, text) {
  const fallback = form.dataset.errorMessage || 'Submission failed. Please try again or contact us by phone.';
  const serverUnavailable = form.dataset.serverErrorMessage || fallback;
  const contentType = response.headers.get('content-type') || '';
  const looksLikeHtml = contentType.includes('text/html') || /^<!doctype|<html[\s>]/i.test(text);

  if (response.status === 405 || response.status === 501 || looksLikeHtml) {
    console.warn('Vivien form endpoint is not available for POST in this environment.', {
      action: form.getAttribute('action') || '',
      status: response.status,
      contentType,
      responsePreview: text.slice(0, 240),
    });
    return serverUnavailable;
  }

  if (text.startsWith('ERROR:')) {
    return text.replace(/^ERROR:\s*/, '') || fallback;
  }

  return text || fallback;
}

function bootForms() {
  document.querySelectorAll('form.vivien-form').forEach((form) => {
    const state = form.querySelector('[data-form-state]');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (state) {
        state.className = 'form-state';
        state.textContent = form.dataset.loadingMessage || 'Sending...';
      }
      try {
        const response = await fetch(form.action, {
          method: form.method || 'POST',
          body: new FormData(form),
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
        });
        const text = (await response.text()).trim();
        if (!response.ok || text !== 'OK') {
          throw new Error(formFailureMessage(form, response, text));
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
          state.textContent = error.message || form.dataset.errorMessage || 'Submission failed';
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
      formData.set('visitor_type', document.querySelector('[data-review-visitor-value]')?.value || '');
      formData.set('source', document.querySelector('[data-review-source-value]')?.value || '');
      try {
        await fetch(button.dataset.positiveReview, { method: 'POST', body: formData });
      } catch (_) {
        // The public review flow should continue even if internal notification fails.
      }
      window.location.href = button.dataset.googleReviewUrl;
    });
  });
}

function bootReviewSource() {
  const shell = document.querySelector('[data-review-source]');
  if (!shell) return;

  const sourceBlock = shell.querySelector('[data-source-block]');
  const sourceLabel = shell.querySelector('[data-source-label]');
  const syncFields = (selector, value) => {
    document.querySelectorAll(selector).forEach((input) => {
      input.value = value;
    });
  };

  shell.querySelectorAll('[data-visitor-value]').forEach((button) => {
    button.addEventListener('click', () => {
      shell.querySelectorAll('[data-visitor-value]').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      const value = button.dataset.visitorValue || '';
      syncFields('[data-review-visitor-value]', value);
      if (sourceBlock) {
        sourceBlock.hidden = false;
        if (sourceLabel) {
          sourceLabel.textContent = value === 'first_time'
            ? sourceBlock.dataset.sourceFirst || sourceLabel.textContent
            : sourceBlock.dataset.sourceReturning || sourceLabel.textContent;
        }
      }
    });
  });

  shell.querySelectorAll('[data-source-value]').forEach((button) => {
    button.addEventListener('click', () => {
      shell.querySelectorAll('[data-source-value]').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      syncFields('[data-review-source-value]', button.dataset.sourceValue || button.textContent.trim());
    });
  });
}

function bootPrivateFeedback() {
  const trigger = document.querySelector('[data-private-feedback-trigger]');
  const section = document.querySelector('[data-private-feedback]');
  if (!trigger || !section) return;

  trigger.addEventListener('click', (event) => {
    event.preventDefault();
    section.hidden = false;
    window.history.pushState(null, '', trigger.getAttribute('href') || '#feedback');
    pushEvent('review_private_feedback_open');
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => {
      section.focus({ preventScroll: true });
    }, 350);
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
  bootScrollTop();
  bootNavigation();
  bootBookingButtons();
  bootPrepareTableButtons();
  bootMenuFilters();
  bootForms();
  bootReviewSource();
  bootReviewPositive();
  bootPrivateFeedback();
  bootRestoplaceMessages();
});
