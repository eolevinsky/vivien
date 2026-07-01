import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(root, 'src/data/legal-docs.json');
const docs = {
  terms: 'https://vivien.restoplace.ws/form/stipulation/?address=5a003b0dc90935f47c87',
  privacy: 'https://vivien.restoplace.ws/form/politics/?address=5a003b0dc90935f47c87',
  'public-offer': 'https://vivien.restoplace.ws/form/offer/?address=5a003b0dc90935f47c87',
  'personal-data-consent': 'https://vivien.restoplace.ws/form/personaldata/?address=5a003b0dc90935f47c87',
};
const localizedTitles = {
  terms: 'Lietošanas noteikumi',
  privacy: 'Privātuma politika',
  'public-offer': 'Publiskais piedāvājums',
  'personal-data-consent': 'Manu personas datu apstrāde',
};
const localizedBodyReplacements = {
  terms: [
    ['kurai rezervācija veiktaю.', 'kurai rezervācija veikta.'],
  ],
  'public-offer': [
    ['<p><p><b>Депозит (будет входить в счёт):</b></p><p>Bārs: Стол №103 - 0 €</p></p>', '<p><p><b>Depozīts (tiks ieskaitīts rēķinā):</b></p><p>Bārs: galds Nr. 103 - 0 €</p></p>'],
  ],
};
const cyrillicPattern = /[А-Яа-яЁё]/;
const locallyCuratedBodySlugs = new Set(['terms', 'personal-data-consent']);

function cleanBody(html) {
  const bodyMatch = html.match(/<div class=['"]txt['"]>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<style/i);
  let body = bodyMatch ? bodyMatch[1] : '<p>Source body extraction failed. Re-check Restoplace source manually.</p>';
  body = body
    .replace(/\sstyle="[^"]*"/g, '')
    .replace(/<font[^>]*>/g, '')
    .replace(/<\/font>/g, '')
    .replace(/<span class=['"]mini-img['"][\s\S]*?<\/span>/g, '')
    .replace(/%MAESTRO_LOGO%/g, '')
    .replace(/\s?width="[^"]*"/g, '')
    .replace(/\s?height="[^"]*"/g, '')
    .trim();
  return body;
}

function titleFrom(html) {
  return html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1]?.replace(/<[^>]*>/g, '').trim()
    || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim()
    || 'Legal document';
}

function localizeBody(slug, body, existingDoc) {
  let localized = body;
  for (const [from, to] of localizedBodyReplacements[slug] || []) {
    localized = localized.replace(from, to);
  }

  if (
    locallyCuratedBodySlugs.has(slug)
    && existingDoc?.bodyHtml
    && !cyrillicPattern.test(existingDoc.bodyHtml)
  ) {
    localized = existingDoc.bodyHtml;
  } else if (
    cyrillicPattern.test(localized)
    && existingDoc?.bodyHtml
    && !cyrillicPattern.test(existingDoc.bodyHtml)
  ) {
    localized = existingDoc.bodyHtml;
  }

  return localized;
}

const existing = JSON.parse(await readFile(outputPath, 'utf8'));
const next = { generatedAt: new Date().toISOString(), docs: { ...existing.docs } };

for (const [slug, url] of Object.entries(docs)) {
  const response = await fetch(url, { headers: { 'User-Agent': 'VivienLegalSnapshot/1.0' } });
  if (!response.ok) throw new Error(`${slug}: HTTP ${response.status}`);
  const html = await response.text();
  const bodyHtml = localizeBody(slug, cleanBody(html), existing.docs[slug]);
  next.docs[slug] = {
    sourceUrl: url,
    sourceTitle: localizedTitles[slug] || titleFrom(html),
    bodyHtml,
  };
}

next.docs['cookie-policy'] = existing.docs['cookie-policy'];
await writeFile(outputPath, `${JSON.stringify(next, null, 2)}\n`);
console.log(`[legal] Wrote ${Object.keys(docs).length} Restoplace legal snapshots.`);
