import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildHtaccess,
  buildShortLinksDoc,
  redirectFixtures,
  resolveRedirect,
} from './generate-short-links.mjs';
import {
  sectionSlugs,
  shortLinkGroups,
} from './short-links.config.mjs';

const siteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htaccessPath = path.join(siteDir, 'public/.htaccess');
const docsPath = path.join(siteDir, 'docs/SHORT_LINKS.md');

const htaccess = fs.readFileSync(htaccessPath, 'utf8');
const docs = fs.readFileSync(docsPath, 'utf8');

assert.equal(htaccess, buildHtaccess(htaccess), 'public/.htaccess is out of sync with scripts/short-links.config.mjs');
assert.equal(docs, buildShortLinksDoc(), 'docs/SHORT_LINKS.md is out of sync with scripts/short-links.config.mjs');

for (const fixture of redirectFixtures) {
  assert.equal(resolveRedirect(fixture.path, htaccess), fixture.location, fixture.path);
}

const requiredSectionSlugs = ['gallery', 'contact'];
requiredSectionSlugs.forEach((section) => {
  assert.ok(sectionSlugs.includes(section), `sectionSlugs should include ${section}`);
});

let sectionChecks = 0;
shortLinkGroups
  .filter((group) => group.kind === 'event')
  .forEach((group) => {
    assert.equal(group.sectionLinks, true, `${group.prefix} should support section short links`);

    requiredSectionSlugs.forEach((section) => {
      const campaign = `${group.prefix.replaceAll('-', '_')}_${section}_test`;
      assert.equal(
        resolveRedirect(`/${group.prefix}/ru/${section}/${campaign}`, htaccess),
        `https://vivien.lv/ru/?lang=ru&utm_source=${group.source}&utm_medium=${group.medium}&utm_campaign=${campaign}&utm_content=section_${section}#${section}`,
        `${group.prefix}/${section}`,
      );
      sectionChecks += 1;
    });
  });

console.log(`short-link fixtures passed: ${redirectFixtures.length}; section checks passed: ${sectionChecks}`);
