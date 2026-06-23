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

const existing = JSON.parse(await readFile(outputPath, 'utf8'));
const next = { generatedAt: new Date().toISOString(), docs: { ...existing.docs } };

for (const [slug, url] of Object.entries(docs)) {
  const response = await fetch(url, { headers: { 'User-Agent': 'VivienLegalSnapshot/1.0' } });
  if (!response.ok) throw new Error(`${slug}: HTTP ${response.status}`);
  const html = await response.text();
  next.docs[slug] = {
    sourceUrl: url,
    sourceTitle: titleFrom(html),
    bodyHtml: cleanBody(html),
  };
}

next.docs['cookie-policy'] = existing.docs['cookie-policy'];
await writeFile(outputPath, `${JSON.stringify(next, null, 2)}\n`);
console.log(`[legal] Wrote ${Object.keys(docs).length} Restoplace legal snapshots.`);
