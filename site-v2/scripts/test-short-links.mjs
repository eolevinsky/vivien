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

console.log(`short-link fixtures passed: ${redirectFixtures.length}`);
