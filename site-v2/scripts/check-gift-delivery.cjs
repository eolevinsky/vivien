// Run against a built site served on localhost:4321. Requires Playwright.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    // No checkout or analytics requests leave the local browser test.
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      return url.hostname === '127.0.0.1' && url.port === '4321'
        ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const locale of ['en', 'lv', 'fr', 'ru']) {
      for (const kind of ['gift-card', 'loyalty']) {
        await page.goto(`http://127.0.0.1:4321/${locale}/${kind}/`, { waitUntil: 'networkidle' });
        const form = page.locator('form[data-giftcard-checkout]');
        const field = name => form.locator(`[name="${name}"]`);
        const payload = () => form.evaluate(el => Object.fromEntries(new FormData(el)));
        await field('recipient_first_name').fill('Jane');
        await field('recipient_last_name').fill('Doe');
        await field('payer_email').fill('buyer@example.com');
        await field('amount').fill('50');
        await field('consent').check();
        assert.equal((await payload()).is_gift, '0');
        assert.equal(await field('recipient_email').isVisible(), false);
        assert.equal(await form.evaluate(el => el.checkValidity()), true);

        await form.locator('[data-gift-toggle]').check();
        assert.equal(await field('email_recipient').isVisible(), true);
        assert.equal(await field('recipient_email').isVisible(), false);
        assert.match(await field('message_to_recipient').inputValue(), /Bon appétit/);
        assert.equal(await form.evaluate(el => el.checkValidity()), false);
        await field('sender_name').fill('Alex');
        assert.equal(await form.evaluate(el => el.checkValidity()), true);
        assert.equal((await payload()).sender_name, 'Alex');
        assert.equal('recipient_email' in await payload(), false);

        await field('email_recipient').check();
        assert.equal(await field('recipient_email').isVisible(), true);
        assert.equal(await form.evaluate(el => el.checkValidity()), false);
        await field('recipient_email').fill('jane@example.com');
        await field('message_to_recipient').fill('Happy birthday!');
        const gift = await payload();
        assert.equal(gift.is_gift, '1');
        assert.equal(gift.email_recipient, 'yes');
        assert.equal(gift.recipient_email, 'jane@example.com');
        assert.equal(gift.message_to_recipient, 'Happy birthday!');
        assert.equal(gift.card_kind, kind === 'loyalty' ? 'loyalty' : 'gift');
        assert.equal(await form.evaluate(el => el.checkValidity()), true);

        await field('email_recipient').uncheck();
        assert.equal('recipient_email' in await payload(), false);
        await form.locator('[data-gift-toggle]').uncheck();
        const own = await payload();
        for (const name of ['sender_name', 'recipient_email', 'email_recipient', 'message_to_recipient']) {
          assert.equal(name in own, false, `${name} must not leak from hidden gift fields`);
        }
        assert.equal(own.is_gift, '0');
        assert.equal(await form.evaluate(el => el.checkValidity()), true);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);

        await form.locator('[data-gift-toggle]').check();
        await field('email_recipient').check();
        assert.equal(await field('message_to_recipient').inputValue(), 'Happy birthday!');
        await form.evaluate(el => el.reset());
        await page.waitForFunction(() => document.querySelector('[name="recipient_email"]').disabled);
        assert.equal(await field('recipient_email').isVisible(), false);
        console.log(`PASS ${locale}/${kind}: self, gift, email, validation, toggles, reset, mobile width`);
      }
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
