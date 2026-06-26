const ATTRIBUTION_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'utm_referrer',
  'roistat',
  'gclid',
  'gbraid',
  'wbraid',
  'fbclid',
  'ttclid',
  'msclkid',
  'yclid',
  'ga_client_id',
  '_ga',
  'ga_session_id',
];
const ATTRIBUTION_STORAGE_KEY = 'vivien_attribution';
const GA_MEASUREMENT_ID = window.VIVIEN_GA_MEASUREMENT_ID || 'G-H3TT546F5J';
const RESTOPLACE_TRUSTED_HOSTS = ['app.restoplace.cc', 'restoplace.ws', 'vivien.restoplace.ws', 'www.restoplace.ws'];
const RESTOPLACE_GOALS = {
  open_widget: { event: 'restoplace_widget_open', category: 'widget' },
  click_phone: { event: 'restoplace_phone_click', category: 'widget' },
  open_table_item: { event: 'restoplace_table_item_open', category: 'reservation' },
  open_banquet_page: { event: 'restoplace_banquet_page_open', category: 'banquet' },
  open_banquet_item: { event: 'restoplace_banquet_item_open', category: 'banquet' },
  open_afisha_page: { event: 'restoplace_afisha_page_open', category: 'events' },
  open_photo_page: { event: 'restoplace_photo_page_open', category: 'widget' },
  btn_reserve_time: { event: 'reserve_time_click', category: 'reservation' },
  btn_reserve_send: { event: 'reserve_submit_click', category: 'reservation' },
  reserve_submit: { event: 'reserve_submit_click', category: 'reservation' },
  reserve_success: { event: 'reserve_success', category: 'reservation', conversion: true },
};
const restoplaceGoalSeenAt = new Map();
let analyticsConsentState = null;
let gaAttributionRefreshPromise = null;

function analyticsDebugEnabled() {
  return window.location.hostname === '127.0.0.1'
    || window.location.hostname === 'localhost'
    || document.body?.classList.contains('is-staging');
}

function eventId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function attributionFromParams(params = new URLSearchParams(window.location.search)) {
  return ATTRIBUTION_KEYS.reduce((memo, key) => {
    const value = params.get(key);
    if (value) memo[key] = value;
    return memo;
  }, {});
}

function storedAttribution() {
  try {
    return JSON.parse(window.sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY) || '{}') || {};
  } catch (_) {
    return {};
  }
}

function storeAttribution(values) {
  if (!Object.keys(values).length) return;
  try {
    window.sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify({
      ...storedAttribution(),
      ...values,
    }));
  } catch (_) {
    // Session storage may be unavailable in strict privacy modes.
  }
}

function readCookie(name) {
  const prefix = `${name}=`;
  const match = document.cookie
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix));
  if (!match) return '';
  try {
    return decodeURIComponent(match.slice(prefix.length));
  } catch (_) {
    return match.slice(prefix.length);
  }
}

function clientIdFromGaCookie(value) {
  if (!value) return '';
  const parts = value.split('.');
  if (parts.length < 4 || !/^GA\d+$/i.test(parts[0])) return '';
  return parts.slice(-2).join('.');
}

function ga4SessionCookieName() {
  return `_ga_${GA_MEASUREMENT_ID.replace(/^G-/i, '')}`;
}

function sessionIdFromGa4Cookie(value) {
  if (!value) return '';
  const gs2Match = value.match(/(?:^|[.$])s(\d+)(?:[$.]|$)/);
  if (gs2Match) return gs2Match[1];

  const parts = value.split('.');
  if (/^GS\d+$/i.test(parts[0]) && /^\d+$/.test(parts[2] || '')) return parts[2];
  return '';
}

function gaAttributionFromCookies() {
  const values = {};
  const gaCookie = readCookie('_ga');
  const gaClientId = clientIdFromGaCookie(gaCookie);
  const gaSessionId = sessionIdFromGa4Cookie(readCookie(ga4SessionCookieName()));

  if (gaCookie) values._ga = gaCookie;
  if (gaClientId) values.ga_client_id = gaClientId;
  if (gaSessionId) values.ga_session_id = gaSessionId;

  return values;
}

function dataLayerCommand(item) {
  if (!item || typeof item !== 'object' || typeof item.length !== 'number') return null;
  return Array.prototype.slice.call(item);
}

function analyticsConsentValueFromDataLayerItem(item) {
  const command = dataLayerCommand(item);
  if (command?.[0] === 'consent' && command[2]?.analytics_storage) {
    return command[2].analytics_storage;
  }
  if (item && typeof item === 'object' && !command && item.analytics_storage) {
    return item.analytics_storage;
  }
  return null;
}

function cookieYesConsentAllowsAnalytics() {
  return /(?:^|,)analytics:(yes|true|1)(?:,|$)/i.test(readCookie('cookieyes-consent'));
}

function analyticsConsentGranted() {
  let value = analyticsConsentState;
  (window.dataLayer || []).forEach((item) => {
    const nextValue = analyticsConsentValueFromDataLayerItem(item);
    if (nextValue) value = nextValue;
  });
  if (value !== 'granted' && cookieYesConsentAllowsAnalytics()) value = 'granted';
  analyticsConsentState = value;
  return value === 'granted';
}

function eventDetailAllowsAnalytics(value) {
  if (!value) return false;
  if (typeof value === 'string') return ['analytics', 'analytics_storage', 'granted'].includes(value.toLowerCase());
  if (Array.isArray(value)) return value.some(eventDetailAllowsAnalytics);
  if (typeof value !== 'object') return false;
  if (value.analytics === true || value.analytics_storage === 'granted') return true;
  return [
    value.accepted,
    value.acceptedCategories,
    value.categories,
    value.categories?.analytics,
    value.cookieCategories,
    value.cookieCategories?.analytics,
    value.consent,
  ].some(eventDetailAllowsAnalytics);
}

function getGtagValue(fieldName, timeoutMs = 650) {
  return new Promise((resolve) => {
    if (!GA_MEASUREMENT_ID || typeof window.gtag !== 'function') {
      resolve('');
      return;
    }

    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(value ? String(value) : '');
    };
    const timer = window.setTimeout(() => finish(''), timeoutMs);

    try {
      window.gtag('get', GA_MEASUREMENT_ID, fieldName, finish);
    } catch (_) {
      finish('');
    }
  });
}

function syncBookingLinks() {
  document.querySelectorAll('a[href*="openBooking=1"], [data-booking-fallback] a[href]').forEach((link) => {
    link.href = withAttribution(link.getAttribute('href'));
  });
}

async function refreshGaAttribution() {
  if (!analyticsConsentGranted()) return {};
  if (gaAttributionRefreshPromise) return gaAttributionRefreshPromise;

  gaAttributionRefreshPromise = (async () => {
    const cookieValues = gaAttributionFromCookies();
    const [clientId, sessionId] = await Promise.all([
      getGtagValue('client_id'),
      getGtagValue('session_id'),
    ]);
    const values = {
      ...cookieValues,
    };

    if (clientId) values.ga_client_id = clientId;
    if (sessionId) values.ga_session_id = sessionId;

    storeAttribution(values);
    syncBookingLinks();
    return values;
  })().finally(() => {
    gaAttributionRefreshPromise = null;
  });

  return gaAttributionRefreshPromise;
}

function queueGaAttributionRefresh() {
  if (analyticsConsentGranted()) {
    refreshGaAttribution().catch(() => {});
  }
}

function observeConsentUpdates() {
  window.dataLayer = window.dataLayer || [];
  if (!window.dataLayer.__vivienConsentObserver) {
    const originalPush = window.dataLayer.push.bind(window.dataLayer);
    Object.defineProperty(window.dataLayer, '__vivienConsentObserver', { value: true });
    window.dataLayer.push = (...items) => {
      const result = originalPush(...items);
      if (items.some(analyticsConsentValueFromDataLayerItem)) queueGaAttributionRefresh();
      return result;
    };
  }

  ['cookieyes_consent_update', 'cky-consent-update', 'cky_consent_update'].forEach((eventName) => {
    document.addEventListener(eventName, (event) => {
      if (eventDetailAllowsAnalytics(event.detail)) analyticsConsentState = 'granted';
      queueGaAttributionRefresh();
    });
  });

  queueGaAttributionRefresh();
  window.setTimeout(queueGaAttributionRefresh, 800);
}

function captureAttribution() {
  storeAttribution(attributionFromParams());
}

function attribution() {
  return {
    ...storedAttribution(),
    ...attributionFromParams(),
  };
}

function withAttribution(url, extraParams = {}) {
  const nextUrl = new URL(url, window.location.href);
  Object.entries({
    ...attribution(),
    ...extraParams,
  }).forEach(([key, value]) => {
    if (value && !nextUrl.searchParams.has(key)) nextUrl.searchParams.set(key, value);
  });
  return nextUrl.href;
}

function ensureCurrentUrlCarriesAttribution(extraParams = {}) {
  const nextUrl = new URL(window.location.href);
  let changed = false;

  Object.entries({
    ...attribution(),
    ...extraParams,
  }).forEach(([key, value]) => {
    if (!value || nextUrl.searchParams.get(key) === value) return;
    nextUrl.searchParams.set(key, value);
    changed = true;
  });

  if (changed) {
    window.history.replaceState(window.history.state, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
  }
}

function pushEvent(event, data = {}) {
  const payload = {
    event,
    event_id: data.event_id || eventId(event),
    page_location: window.location.href,
    ...attribution(),
    ...data,
  };
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
  if (analyticsDebugEnabled()) {
    window.vivienEvents = window.vivienEvents || [];
    window.vivienEvents.push(payload);
  }
}

function isTrustedRestoplaceOrigin(origin) {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    if (url.origin === window.location.origin) return true;
    return RESTOPLACE_TRUSTED_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch (_) {
    return false;
  }
}

function restoplaceMessageText(data) {
  if (typeof data === 'string') return data;
  try {
    return JSON.stringify(data || {});
  } catch (_) {
    return '';
  }
}

function restoplaceGoalFromMessage(data) {
  const raw = restoplaceMessageText(data).toLowerCase();
  if (!raw) return null;
  return Object.keys(RESTOPLACE_GOALS).find((goal) => {
    const pattern = new RegExp(`(^|[^a-z0-9_])${goal}($|[^a-z0-9_])`, 'i');
    return pattern.test(raw);
  }) || null;
}

function isRecentRestoplaceGoal(goal) {
  const now = Date.now();
  const previous = restoplaceGoalSeenAt.get(goal) || 0;
  restoplaceGoalSeenAt.set(goal, now);
  return now - previous < 1500;
}

function pushRestoplaceGoal(goal, origin) {
  const config = RESTOPLACE_GOALS[goal];
  if (!config) return;

  const event_id = eventId(config.event);
  const payload = {
    event_id,
    booking_source: 'restoplace',
    restoplace_goal: goal,
    restoplace_category: config.category,
    restoplace_origin: origin || '',
    conversion: Boolean(config.conversion),
  };

  pushEvent('restoplace_event', payload);
  pushEvent(config.event, payload);
}

function showBookingFallback() {
  const fallback = document.querySelector('[data-booking-fallback]');
  if (fallback) {
    syncBookingLinks();
    fallback.hidden = false;
  }
}

window.openBooking = async function openBooking(options = {}) {
  const source = options.source || 'fallback';
  const auto = Boolean(options.auto);
  captureAttribution();
  await refreshGaAttribution().catch(() => ({}));
  ensureCurrentUrlCarriesAttribution({ booking_source: source });
  syncBookingLinks();
  pushEvent('booking_intent', { booking_source: source, auto });

  const trigger = document.getElementById('restoplace-btn') || document.querySelector('.restoplace-click-open');
  if (trigger) {
    trigger.click();
    pushEvent('restoplace_widget_open_attempt', { booking_source: source, auto });
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
  captureAttribution();
  syncBookingLinks();

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
      window.openBooking({ source: params.get('booking_source') || 'book_auto', auto: true });
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
    if (analyticsDebugEnabled()) {
      window.vivienRestoplaceMessages = window.vivienRestoplaceMessages || [];
      window.vivienRestoplaceMessages.push({
        origin: event.origin || '',
        data_type: typeof event.data,
        data_preview: restoplaceMessageText(event.data).slice(0, 500),
      });
      window.vivienRestoplaceMessages = window.vivienRestoplaceMessages.slice(-50);
    }

    const goal = restoplaceGoalFromMessage(event.data);
    if (!goal || !isTrustedRestoplaceOrigin(event.origin) || isRecentRestoplaceGoal(goal)) return;
    pushRestoplaceGoal(goal, event.origin);
  });
}

function bootSite() {
  observeConsentUpdates();
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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootSite, { once: true });
} else {
  bootSite();
}
