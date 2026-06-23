import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(root, 'src/content/gallery-cache.json');
const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
const endpoint = process.env.IMAGEKIT_ENDPOINT;
const folder = process.env.IMAGEKIT_FOLDER || '/vivien.lv';

const fallbackItems = [
  { src: '/assets/img/gallery/1_Vivien_and_Oysters.jpg', alt: 'Vivien oysters and table setting' },
  { src: '/assets/img/gallery/2_Vivien_at_Work.jpg', alt: 'Vivien team at work' },
  { src: '/assets/img/gallery/3_Wine_Stand.jpg', alt: 'Wine stand at Brasserie Vivien' },
  { src: '/assets/img/gallery/4_The_Mim.jpg', alt: 'Brasserie Vivien interior moment' },
  { src: '/assets/img/gallery/5_Accordeonist.jpg', alt: 'Accordionist at Vivien' },
  { src: '/assets/img/gallery/6_Seiling_with_lamps.jpg', alt: 'Vivien ceiling lamps' },
  { src: '/assets/img/gallery/7_Opera_Singer.jpg', alt: 'Opera singer at Vivien' },
  { src: '/assets/img/gallery/8_Guitar_and_Singer.jpg', alt: 'Guitar and singer at Vivien' },
];

async function writeFallback(reason) {
  await writeFile(outputPath, `${JSON.stringify({
    updatedAt: new Date().toISOString(),
    source: `local fallback: ${reason}`,
    items: fallbackItems,
  }, null, 2)}\n`);
}

if (!privateKey || !endpoint) {
  await writeFallback('IMAGEKIT_PRIVATE_KEY or IMAGEKIT_ENDPOINT is not configured');
  console.log('[gallery] Wrote local fallback gallery.');
  process.exit(0);
}

try {
  const url = new URL('https://api.imagekit.io/v1/files');
  url.searchParams.set('path', folder);
  url.searchParams.set('limit', '50');
  const auth = Buffer.from(`${privateKey}:`).toString('base64');
  const response = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const files = await response.json();
  const items = files
    .filter((file) => file.fileType === 'image')
    .map((file) => ({
      src: `${endpoint.replace(/\/$/, '')}${file.filePath}`,
      alt: file.customMetadata?.alt || file.name.replace(/\.[a-z0-9]+$/i, '').replaceAll('-', ' '),
      width: file.width || 1200,
      height: file.height || 900,
    }));
  if (!items.length) throw new Error('ImageKit folder returned no images');
  await writeFile(outputPath, `${JSON.stringify({
    updatedAt: new Date().toISOString(),
    source: `imagekit:${folder}`,
    items,
  }, null, 2)}\n`);
  console.log(`[gallery] Cached ${items.length} ImageKit image(s).`);
} catch (error) {
  console.warn(`[gallery] ${error.message}`);
  await writeFallback(error.message);
}
