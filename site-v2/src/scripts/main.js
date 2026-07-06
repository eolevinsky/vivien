const ATTRIBUTION_KEYS = [
  'lang',
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
  'ga_client_id_source',
  '_ga',
  'ga_session_id',
];
const ATTRIBUTION_STORAGE_KEY = 'vivien_attribution';
const BOOKING_CLIENT_ID_STORAGE_KEY = 'vivien_booking_client_id';
const GA_MEASUREMENT_ID = window.VIVIEN_GA_MEASUREMENT_ID || 'G-H3TT546F5J';
const DIRECT_GA_EVENTS_ENABLED = window.VIVIEN_GA_DIRECT_ENABLED !== false;
const RESTOPLACE_ADDRESS_HASH = window.VIVIEN_RESTOPLACE_ADDRESS_HASH || '5a003b0dc90935f47c87';
const RESTOPLACE_LOCALES = Array.isArray(window.VIVIEN_RESTOPLACE_LOCALES)
  ? window.VIVIEN_RESTOPLACE_LOCALES
  : ['en', 'lv', 'ru'];
const RESTOPLACE_GETPARAM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'utm_referrer',
  'roistat',
];
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
let inMemoryBookingClientId = '';

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

function storedBookingClientId() {
  if (inMemoryBookingClientId) return inMemoryBookingClientId;
  try {
    inMemoryBookingClientId = window.sessionStorage.getItem(BOOKING_CLIENT_ID_STORAGE_KEY) || '';
  } catch (_) {
    // Session storage may be unavailable in strict privacy modes.
  }
  return inMemoryBookingClientId;
}

function storeBookingClientId(value) {
  inMemoryBookingClientId = value;
  try {
    window.sessionStorage.setItem(BOOKING_CLIENT_ID_STORAGE_KEY, value);
  } catch (_) {
    // Keep the in-memory value for the current page if storage is unavailable.
  }
}

function randomClientIdPart() {
  try {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return String(values[0]).padStart(10, '0');
  } catch (_) {
    return String(Math.floor(Math.random() * 10000000000)).padStart(10, '0');
  }
}

function fallbackGaClientId() {
  const existing = storedBookingClientId();
  if (existing) return existing;

  const value = `${randomClientIdPart()}.${Math.floor(Date.now() / 1000)}`;
  storeBookingClientId(value);
  return value;
}

function ensureBookingGaClientId() {
  if (attribution().ga_client_id) return {};

  const values = {
    ga_client_id: fallbackGaClientId(),
    ga_client_id_source: 'vivien_session_fallback',
  };
  storeAttribution(values);
  return values;
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

function bookingFormLanguage(value) {
  const lang = String(value || '').trim().toLowerCase().slice(0, 2);
  return RESTOPLACE_LOCALES.includes(lang) ? lang : '';
}

function currentBookingLanguage() {
  const params = new URLSearchParams(window.location.search);
  const candidates = [
    params.get('lang'),
    document.documentElement.lang,
    document.body?.dataset.locale,
  ];
  return candidates.map(bookingFormLanguage).find(Boolean) || 'en';
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

function isIosBrowser() {
  const ua = window.navigator.userAgent || '';
  return /iPad|iPhone|iPod/i.test(ua)
    || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
}

function isInAppBrowser() {
  return /FBAN|FBAV|FB_IAB|Instagram|TikTok|musical_ly|Bytedance|Line\/|MicroMessenger/i
    .test(window.navigator.userAgent || '');
}

function shouldUseDirectBookingNavigation() {
  return isIosBrowser() || isInAppBrowser();
}

function restoplaceParamValue(value) {
  const text = String(value || '').trim();
  return text ? text.slice(0, 500) : '';
}

function restoplaceGetparams(extraParams = {}) {
  const current = attribution();
  const params = RESTOPLACE_GETPARAM_KEYS.reduce((memo, key) => {
    const value = restoplaceParamValue(current[key]);
    if (value) memo[key] = value;
    return memo;
  }, {});

  const clientId = restoplaceParamValue(current.ga_client_id);
  if (!params.roistat && clientId) params.roistat = clientId;

  if (!params.utm_source) params.utm_source = 'vivien.lv';
  if (!params.utm_medium) params.utm_medium = 'restoplace';
  if (!params.utm_campaign) params.utm_campaign = 'table_booking';
  if (!params.utm_content) params.utm_content = restoplaceParamValue(extraParams.booking_source) || 'booking_widget';
  if (!params.utm_term) params.utm_term = restoplaceParamValue(current.gclid || current.gbraid || current.wbraid || current.yclid);
  if (!params.utm_referrer) {
    params.utm_referrer = restoplaceParamValue(current.utm_referrer || document.referrer || `${window.location.origin}${window.location.pathname}`);
  }

  return RESTOPLACE_GETPARAM_KEYS.reduce((memo, key) => {
    const value = restoplaceParamValue(params[key]);
    if (value) memo[key] = value;
    return memo;
  }, {});
}

function restoplaceBookingUrl(extraParams = {}) {
  const url = new URL('https://www.restoplace.ws/');
  url.searchParams.set('address', RESTOPLACE_ADDRESS_HASH);
  url.searchParams.set('iframe', '1');
  url.searchParams.set('lang', bookingFormLanguage(extraParams.lang) || currentBookingLanguage());
  url.searchParams.set('source', window.location.hostname);
  if (restoplaceParamValue(extraParams.step_type)) {
    url.searchParams.set('step_type', restoplaceParamValue(extraParams.step_type));
  }
  Object.entries(restoplaceGetparams(extraParams)).forEach(([key, value]) => {
    if (value && !url.searchParams.has(key)) url.searchParams.set(key, value);
  });
  return url.href;
}

function ensureRestoplaceShell() {
  let bg = document.getElementById('restoplace-bg');
  let modal = document.getElementById('restoplace-modal');
  let content = document.getElementById('restoplace-content');

  if (!bg) {
    bg = document.createElement('div');
    bg.id = 'restoplace-bg';
    document.body.appendChild(bg);
  }

  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'restoplace-modal';
    modal.innerHTML = '<div id="restoplace-content"></div>';
    document.body.appendChild(modal);
  }

  if (!content || !modal.contains(content)) {
    content = modal.querySelector('#restoplace-content');
  }
  if (!content) {
    content = document.createElement('div');
    content.id = 'restoplace-content';
    modal.appendChild(content);
  }

  return { bg, modal, content };
}

function openRestoplaceFrame(url) {
  const { bg, modal, content } = ensureRestoplaceShell();
  content.innerHTML = '';

  const iframe = document.createElement('iframe');
  iframe.id = 'restoplace-iframe';
  iframe.src = url;
  iframe.title = 'Brasserie Vivien booking';
  iframe.frameBorder = '0';
  iframe.style.cssText = 'width:100%;height:100%;border:0;background:#34353e;';
  content.appendChild(iframe);

  bg.classList.add('restoplace-btn-open');
  modal.classList.add('restoplace-open');
  document.documentElement.classList.add('restoplace-modal-open');
}

function closeRestoplaceFrame() {
  document.getElementById('restoplace-bg')?.classList.remove('restoplace-btn-open');
  document.getElementById('restoplace-modal')?.classList.remove('restoplace-open');
  document.documentElement.classList.remove('restoplace-modal-open');
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
      ...gaAttributionFromCookies(),
    };

    if (clientId) values.ga_client_id = clientId;
    if (sessionId) values.ga_session_id = sessionId;
    if (values.ga_client_id) values.ga_client_id_source = 'ga4';

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

function gaEventParameterValue(value) {
  if (value === null || value === undefined) return '';
  if (['string', 'number', 'boolean'].includes(typeof value)) return value;
  return String(value);
}

function gaEventParams(payload) {
  return Object.entries(payload).reduce((memo, [key, value]) => {
    if (key === 'event' || value === null || value === undefined || value === '') return memo;
    memo[key] = gaEventParameterValue(value);
    return memo;
  }, {});
}

function sendDirectGaEvent(event, payload) {
  if (!DIRECT_GA_EVENTS_ENABLED || !GA_MEASUREMENT_ID || typeof window.gtag !== 'function') return;
  if (!analyticsConsentGranted()) return;

  try {
    window.gtag('event', event, gaEventParams(payload));
  } catch (_) {
    // GA4 should not break first-party booking or form flows.
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
  sendDirectGaEvent(event, payload);
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
  const stepType = restoplaceParamValue(options.stepType || options.step_type);
  const bookingParams = {
    booking_source: source,
    lang: bookingFormLanguage(options.lang) || currentBookingLanguage(),
  };
  if (stepType) bookingParams.step_type = stepType;
  captureAttribution();
  await refreshGaAttribution().catch(() => ({}));
  ensureBookingGaClientId();
  ensureCurrentUrlCarriesAttribution(bookingParams);
  syncBookingLinks();
  pushEvent('booking_intent', { booking_source: source, step_type: stepType, auto });

  if (shouldUseDirectBookingNavigation()) {
    pushEvent('restoplace_direct_open_attempt', { booking_source: source, step_type: stepType, auto });
    window.location.assign(restoplaceBookingUrl(bookingParams));
    return;
  }

  openRestoplaceFrame(restoplaceBookingUrl(bookingParams));
  pushEvent('restoplace_widget_open_attempt', { booking_source: source, step_type: stepType, auto });

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
    const button = event.target.closest('.js-booking-trigger, .booking-sticky[href*="openBooking=1"]');
    if (!button) return;
    event.preventDefault();
    const sourceFromHref = button.href
      ? new URL(button.href, window.location.href).searchParams.get('booking_source')
      : '';
    const stepTypeFromHref = button.href
      ? new URL(button.href, window.location.href).searchParams.get('step_type')
      : '';
    const langFromHref = button.href
      ? new URL(button.href, window.location.href).searchParams.get('lang')
      : '';
    window.openBooking({
      source: button.dataset.bookingSource || sourceFromHref || 'fallback',
      stepType: button.dataset.bookingStepType || stepTypeFromHref || '',
      lang: button.dataset.bookingLang || langFromHref || '',
      auto: false,
    });
  });

  const params = new URLSearchParams(window.location.search);
  if (params.get('openBooking') === '1') {
    window.setTimeout(() => {
      window.openBooking({
        source: params.get('booking_source') || 'book_auto',
        stepType: params.get('step_type') || '',
        lang: params.get('lang') || '',
        auto: true,
      });
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

function bootSpecialsTabs() {
  document.querySelectorAll('[data-specials-tabs]').forEach((section) => {
    const tabs = Array.from(section.querySelectorAll('[data-specials-tab]'));
    const panes = Array.from(section.querySelectorAll('[data-specials-pane]'));
    if (!tabs.length || !panes.length) return;

    const activate = (tab, focus = false) => {
      const targetId = tab.dataset.specialsTarget || '';
      tabs.forEach((item) => {
        const active = item === tab;
        item.classList.toggle('active', active);
        item.setAttribute('aria-selected', active ? 'true' : 'false');
        item.tabIndex = active ? 0 : -1;
      });
      panes.forEach((pane) => {
        const active = pane.id === targetId;
        pane.classList.toggle('active', active);
        pane.hidden = !active;
      });
      if (focus) tab.focus();
    };

    tabs.forEach((tab, index) => {
      tab.tabIndex = tab.classList.contains('active') ? 0 : -1;
      tab.addEventListener('click', (event) => {
        event.preventDefault();
        activate(tab);
      });
      tab.addEventListener('keydown', (event) => {
        const keys = ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End'];
        if (!keys.includes(event.key)) return;
        event.preventDefault();
        const lastIndex = tabs.length - 1;
        let nextIndex = index;
        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') nextIndex = index === lastIndex ? 0 : index + 1;
        if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') nextIndex = index === 0 ? lastIndex : index - 1;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = lastIndex;
        activate(tabs[nextIndex], true);
      });
    });

    const hashTab = tabs.find((tab) => `#${tab.dataset.specialsTarget}` === window.location.hash);
    if (hashTab) activate(hashTab);
  });
}

function bootEventsCarousel() {
  document.querySelectorAll('[data-events-carousel]').forEach((carousel) => {
    const track = carousel.querySelector('[data-events-track]');
    const slides = Array.from(carousel.querySelectorAll('[data-events-slide]'));
    const dots = Array.from(carousel.querySelectorAll('[data-events-dot]'));
    if (!track || !slides.length) return;

    const delay = Number.parseInt(carousel.dataset.eventsDelay || '5000', 10);
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const linkedEventId = new URLSearchParams(window.location.search).get('event') || '';
    const linkedEventIndex = linkedEventId
      ? slides.findIndex((slide) => slide.dataset.eventId === linkedEventId)
      : -1;
    const hasLinkedEvent = linkedEventIndex >= 0;
    let currentIndex = hasLinkedEvent
      ? linkedEventIndex
      : Math.max(0, slides.findIndex((slide) => slide.classList.contains('active')));
    let timer = 0;
    let resetTimer = 0;

    const firstClone = slides.length > 1 ? slides[0].cloneNode(true) : null;
    if (firstClone) {
      firstClone.classList.remove('active');
      firstClone.setAttribute('aria-hidden', 'true');
      firstClone.dataset.eventsClone = 'true';
      firstClone.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
      track.appendChild(firstClone);
    }

    const setTransition = (enabled) => {
      track.classList.toggle('is-sliding', enabled && !prefersReducedMotion);
    };

    const setPosition = (index, animated = true) => {
      setTransition(animated);
      track.style.transform = `translateX(-${index * 100}%)`;
    };

    const syncStickyCta = (index) => {
      const activeSlide = slides[(index + slides.length) % slides.length];
      if (!activeSlide) return;

      [
        'stickyCtaLabel',
        'stickyBookingSource',
        'stickyBookingStepType',
        'stickyBookingLang',
      ].forEach((key) => {
        if (activeSlide.dataset[key]) {
          carousel.dataset[key] = activeSlide.dataset[key];
        } else {
          delete carousel.dataset[key];
        }
      });

      window.dispatchEvent(new CustomEvent('vivien:sticky-cta-context-change', {
        detail: {
          section: carousel,
        },
      }));
    };

    const syncActiveState = (index) => {
      const activeIndex = (index + slides.length) % slides.length;
      slides.forEach((slide, index) => {
        const active = index === activeIndex;
        slide.classList.toggle('active', active);
        slide.setAttribute('aria-hidden', active ? 'false' : 'true');
      });
      dots.forEach((dot, index) => {
        const active = index === activeIndex;
        dot.classList.toggle('active', active);
        dot.setAttribute('aria-current', active ? 'true' : 'false');
      });
      syncStickyCta(activeIndex);
    };

    const showSlide = (nextIndex, animated = true) => {
      window.clearTimeout(resetTimer);
      if (nextIndex >= slides.length && firstClone) {
        syncActiveState(0);
        setPosition(slides.length, animated);
        resetTimer = window.setTimeout(() => {
          currentIndex = 0;
          setPosition(0, false);
        }, prefersReducedMotion ? 0 : 470);
        return;
      }

      currentIndex = (nextIndex + slides.length) % slides.length;
      syncActiveState(currentIndex);
      setPosition(currentIndex, animated);
    };

    const stop = () => {
      if (!timer) return;
      window.clearInterval(timer);
      timer = 0;
    };

    const start = () => {
      if (hasLinkedEvent || prefersReducedMotion || slides.length < 2 || timer) return;
      timer = window.setInterval(() => showSlide(currentIndex + 1), Number.isFinite(delay) ? delay : 5000);
    };

    dots.forEach((dot) => {
      dot.addEventListener('click', () => {
        stop();
        showSlide(Number.parseInt(dot.dataset.eventsIndex || '0', 10));
        start();
      });
    });

    carousel.addEventListener('mouseenter', stop);
    carousel.addEventListener('mouseleave', start);
    carousel.addEventListener('focusin', stop);
    carousel.addEventListener('focusout', (event) => {
      if (!carousel.contains(event.relatedTarget)) start();
    });

    syncActiveState(currentIndex);
    setPosition(currentIndex, false);
    if (hasLinkedEvent && window.location.hash === '#events') {
      window.setTimeout(() => {
        carousel.scrollIntoView({ block: 'start', behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      }, 60);
    }
    start();
  });
}

function bootStickyCtaContext() {
  const sticky = document.querySelector('.booking-sticky');
  const sections = Array.from(document.querySelectorAll('[data-sticky-cta-label]'));
  if (!sticky || !sections.length || !('IntersectionObserver' in window)) return;

  const defaultLabel = sticky.textContent;
  const defaultHref = sticky.getAttribute('href') || sticky.href;
  const defaultSource = sticky.dataset.bookingSource || '';
  const defaultStepType = sticky.dataset.bookingStepType || '';
  const defaultLang = sticky.dataset.bookingLang || '';
  const visibleSections = new Set();

  const updateSticky = (section) => {
    const label = section?.dataset.stickyCtaLabel || defaultLabel;
    const source = section?.dataset.stickyBookingSource || defaultSource;
    const stepType = section?.dataset.stickyBookingStepType || defaultStepType;
    const lang = section?.dataset.stickyBookingLang || defaultLang;
    sticky.textContent = label;

    if (source) {
      sticky.dataset.bookingSource = source;
    } else {
      delete sticky.dataset.bookingSource;
    }

    if (stepType) {
      sticky.dataset.bookingStepType = stepType;
    } else {
      delete sticky.dataset.bookingStepType;
    }

    if (lang) {
      sticky.dataset.bookingLang = lang;
    } else {
      delete sticky.dataset.bookingLang;
    }

    try {
      const url = new URL(defaultHref, window.location.href);
      if (source) url.searchParams.set('booking_source', source);
      if (stepType) {
        url.searchParams.set('step_type', stepType);
      } else {
        url.searchParams.delete('step_type');
      }
      if (lang) url.searchParams.set('lang', lang);
      sticky.href = url.toString();
    } catch (_) {
      // Keep the existing href if URL parsing is unavailable.
    }
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.28) {
        visibleSections.add(entry.target);
      } else {
        visibleSections.delete(entry.target);
      }
    });

    const activeSection = sections.find((section) => visibleSections.has(section));
    updateSticky(activeSection || null);
  }, {
    rootMargin: '-18% 0px -34% 0px',
    threshold: [0, 0.28, 0.5, 0.72],
  });

  sections.forEach((section) => observer.observe(section));

  window.addEventListener('vivien:sticky-cta-context-change', (event) => {
    const section = event.detail?.section;
    if (section && visibleSections.has(section)) {
      updateSticky(section);
    }
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
    const messageText = restoplaceMessageText(event.data);

    if (messageText === 'closemodal' && isTrustedRestoplaceOrigin(event.origin)) {
      closeRestoplaceFrame();
      return;
    }

    if (analyticsDebugEnabled()) {
      window.vivienRestoplaceMessages = window.vivienRestoplaceMessages || [];
      window.vivienRestoplaceMessages.push({
        origin: event.origin || '',
        data_type: typeof event.data,
        data_preview: messageText.slice(0, 500),
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
  bootSpecialsTabs();
  bootEventsCarousel();
  bootStickyCtaContext();
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
