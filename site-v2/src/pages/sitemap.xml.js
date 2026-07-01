import { allSitemapRoutes, canonicalUrl } from '../content/site.js';

function xmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export async function GET() {
  const urls = allSitemapRoutes().map((record) => {
    const loc = canonicalUrl(record.path);
    const alternates = record.alternates.links.map((alt) => (
      `<xhtml:link rel="alternate" hreflang="${xmlEscape(alt.locale)}" href="${xmlEscape(alt.href)}" />`
    )).join('');
    const xDefault = record.alternates.xDefault
      ? `<xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(record.alternates.xDefault)}" />`
      : '';
    return `<url><loc>${xmlEscape(loc)}</loc>${alternates}${xDefault}</url>`;
  }).join('');

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls}</urlset>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' }
  });
}
