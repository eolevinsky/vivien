import { defineConfig } from 'astro/config';

const buildTarget = process.env.VIVIEN_BUILD_TARGET || 'production';
const configuredBase = process.env.VIVIEN_BASE_PATH;
const base = configuredBase || (buildTarget === 'staging' ? '/_staging/v2' : '/');

export default defineConfig({
  site: process.env.VIVIEN_SITE_URL || 'https://vivien.lv',
  base,
  output: 'static',
  trailingSlash: 'always',
});
