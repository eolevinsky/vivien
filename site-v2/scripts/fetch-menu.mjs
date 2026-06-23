import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(root, 'src/content/menu-cache.json');
const locales = ['en', 'lv', 'fr', 'ru'];
const endpoint = process.env.A3_MENU_ENDPOINT || 'https://app.a3-as.com/api/guest/scheduled-visits/widget/bootstrap';
const merchant = process.env.A3_MENU_MERCHANT || 'vivien-riga';

function formatPrice(minor, currency = 'EUR', locale = 'en') {
  if (typeof minor !== 'number') return '';
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
}

function normalize(data, locale) {
  const menu = data?.storefrontMenu;
  if (!menu) throw new Error('Missing storefrontMenu');
  const currencyCode = menu.currencyCode || 'EUR';
  const categories = (menu.categories || []).map((category) => ({
    id: String(category.id),
    name: category.name || category.title || '',
  })).filter((category) => category.id && category.name);
  const items = (menu.items || []).map((item) => ({
    id: String(item.id || item.uuid || item.name),
    categoryId: String(item.categoryId || item.category_id || ''),
    name: item.name || '',
    description: item.description || '',
    price: formatPrice(item.priceWithVatMinor ?? item.priceMinor, item.currencyCode || currencyCode, locale),
  })).filter((item) => item.id && item.name);
  return { currencyCode, categories, items };
}

async function readExisting() {
  try {
    return JSON.parse(await readFile(outputPath, 'utf8'));
  } catch {
    return { updatedAt: null, source: 'fallback', locales: {} };
  }
}

const existing = await readExisting();
const next = { updatedAt: new Date().toISOString(), source: endpoint, merchant, locales: { ...existing.locales } };
let successCount = 0;

for (const locale of locales) {
  try {
    const url = new URL(endpoint);
    url.searchParams.set('merchant', merchant);
    url.searchParams.set('locale', locale);
    const response = await fetch(url, { headers: { 'User-Agent': 'VivienSiteV2Build/1.0' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    next.locales[locale] = normalize(await response.json(), locale);
    successCount += 1;
  } catch (error) {
    console.warn(`[menu] ${locale}: ${error.message}`);
  }
}

if (!successCount) {
  console.warn('[menu] Keeping existing cache because A3 menu fetch failed for every locale.');
  process.exit(0);
}

await writeFile(outputPath, `${JSON.stringify(next, null, 2)}\n`);
console.log(`[menu] Cached ${successCount}/${locales.length} locale(s).`);
