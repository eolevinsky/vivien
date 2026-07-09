import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const DEFAULT_OPTIONS = {
  baseUrl: 'https://vivien.lv',
  locale: 'en',
  event: 'bastille-day',
  outputDir: 'public/assets/img/qr',
  colors: ['#850305', '#F3E9DC'],
  minVersion: 4,
  pixelsPerModule: 40,
};

const MAX_VERSION = 10;
const QUIET_ZONE = 4;
const FORMAT_BITS_QUARTILE = 0b11;
const ECC_CODEWORDS_PER_BLOCK_BY_VERSION_Q = [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24];
const ECC_BLOCKS_BY_VERSION_Q = [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8];

let VERSION = 4;
let QR_SIZE = 21 + (VERSION - 1) * 4;
let VIEWBOX_SIZE = QR_SIZE + QUIET_ZONE * 2;
let PIXELS_PER_MODULE = DEFAULT_OPTIONS.pixelsPerModule;
let PNG_SIZE = VIEWBOX_SIZE * PIXELS_PER_MODULE;
let RAW_CODEWORDS = 100;
let DATA_CODEWORDS = 48;
let ECC_CODEWORDS_PER_BLOCK = 26;
let BLOCK_COUNT = 2;
let FINDERS = [];
let ALIGNMENTS = [];

function configureQrVersion(version, pixelsPerModule) {
  invariant(Number.isInteger(version) && version >= 1 && version <= MAX_VERSION, `Unsupported QR version: ${version}`);

  VERSION = version;
  QR_SIZE = 21 + (VERSION - 1) * 4;
  VIEWBOX_SIZE = QR_SIZE + QUIET_ZONE * 2;
  PIXELS_PER_MODULE = pixelsPerModule;
  PNG_SIZE = VIEWBOX_SIZE * PIXELS_PER_MODULE;
  RAW_CODEWORDS = Math.floor(getRawDataModuleCount(VERSION) / 8);
  ECC_CODEWORDS_PER_BLOCK = ECC_CODEWORDS_PER_BLOCK_BY_VERSION_Q[VERSION];
  BLOCK_COUNT = ECC_BLOCKS_BY_VERSION_Q[VERSION];
  DATA_CODEWORDS = RAW_CODEWORDS - ECC_CODEWORDS_PER_BLOCK * BLOCK_COUNT;
  FINDERS = [
    { x: 0, y: 0, size: 7 },
    { x: QR_SIZE - 7, y: 0, size: 7 },
    { x: 0, y: QR_SIZE - 7, size: 7 },
  ];
  ALIGNMENTS = makeAlignmentRegions(VERSION);
}

function getRawDataModuleCount(version) {
  let result = (16 * version + 128) * version + 64;

  if (version >= 2) {
    const alignmentPatternCount = Math.floor(version / 7) + 2;
    result -= (25 * alignmentPatternCount - 10) * alignmentPatternCount - 55;
  }

  if (version >= 7) {
    result -= 36;
  }

  return result;
}

function makeAlignmentRegions(version) {
  if (version === 1) {
    return [];
  }

  const alignmentPatternCount = Math.floor(version / 7) + 2;
  const alignmentStep = Math.ceil((version * 4 + 4) / (alignmentPatternCount * 2 - 2)) * 2;
  const centers = new Array(alignmentPatternCount);
  centers[0] = 6;

  for (let i = alignmentPatternCount - 1, position = QR_SIZE - 7; i >= 1; i -= 1, position -= alignmentStep) {
    centers[i] = position;
  }

  const regions = [];

  for (const y of centers) {
    for (const x of centers) {
      const overlapsFinder =
        (x === 6 && y === 6) ||
        (x === 6 && y === QR_SIZE - 7) ||
        (x === QR_SIZE - 7 && y === 6);

      if (!overlapsFinder) {
        regions.push({ x: x - 2, y: y - 2, size: 5 });
      }
    }
  }

  return regions;
}

function getByteModeCapacity(version) {
  configureQrVersion(version, PIXELS_PER_MODULE);
  return Math.floor((DATA_CODEWORDS * 8 - 12) / 8);
}

function pickVersion(byteLength, minVersion) {
  for (let version = minVersion; version <= MAX_VERSION; version += 1) {
    if (byteLength <= getByteModeCapacity(version)) {
      return version;
    }
  }

  throw new Error(
    `Payload is ${byteLength} bytes, but the built-in QR encoder supports up to ` +
      `${getByteModeCapacity(MAX_VERSION)} bytes at error correction Q. Use a shorter URL.`,
  );
}

const EXP = new Array(512).fill(0);
const LOG = new Array(256).fill(0);

let gfValue = 1;
for (let i = 0; i < 255; i += 1) {
  EXP[i] = gfValue;
  LOG[gfValue] = i;
  gfValue <<= 1;
  if ((gfValue & 0x100) !== 0) {
    gfValue ^= 0x11d;
  }
}
for (let i = 255; i < EXP.length; i += 1) {
  EXP[i] = EXP[i - 255];
}

function invariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function gfMultiply(left, right) {
  if (left === 0 || right === 0) {
    return 0;
  }

  return EXP[LOG[left] + LOG[right]];
}

function polyMultiply(left, right) {
  const result = new Array(left.length + right.length - 1).fill(0);
  for (let i = 0; i < left.length; i += 1) {
    for (let j = 0; j < right.length; j += 1) {
      result[i + j] ^= gfMultiply(left[i], right[j]);
    }
  }
  return result;
}

function reedSolomonGenerator(degree) {
  let result = [1];
  for (let i = 0; i < degree; i += 1) {
    result = polyMultiply(result, [1, EXP[i]]);
  }
  return result;
}

function reedSolomonRemainder(data, generator) {
  const result = new Array(generator.length - 1).fill(0);

  for (const value of data) {
    const factor = value ^ result.shift();
    result.push(0);

    for (let i = 0; i < result.length; i += 1) {
      result[i] ^= gfMultiply(generator[i + 1], factor);
    }
  }

  return result;
}

class BitBuffer {
  constructor() {
    this.bits = [];
  }

  append(value, length) {
    invariant(length >= 0 && length <= 31, `Invalid bit length: ${length}`);
    for (let i = length - 1; i >= 0; i -= 1) {
      this.bits.push((value >>> i) & 1);
    }
  }

  appendByte(value) {
    this.append(value, 8);
  }

  get length() {
    return this.bits.length;
  }

  toCodewords() {
    invariant(this.bits.length % 8 === 0, 'Bit buffer length must be byte-aligned');
    const result = [];

    for (let i = 0; i < this.bits.length; i += 8) {
      let value = 0;
      for (let j = 0; j < 8; j += 1) {
        value = (value << 1) | this.bits[i + j];
      }
      result.push(value);
    }

    return result;
  }
}

function makeDataCodewords(text) {
  const bytes = [...new TextEncoder().encode(text)];
  const buffer = new BitBuffer();

  buffer.append(0b0100, 4);
  buffer.append(bytes.length, 8);
  for (const byte of bytes) {
    buffer.appendByte(byte);
  }

  const capacityBits = DATA_CODEWORDS * 8;
  invariant(buffer.length <= capacityBits, 'Payload does not fit QR version 4-Q');

  buffer.append(0, Math.min(4, capacityBits - buffer.length));
  while (buffer.length % 8 !== 0) {
    buffer.append(0, 1);
  }

  const padBytes = [0xec, 0x11];
  let padIndex = 0;
  while (buffer.length < capacityBits) {
    buffer.appendByte(padBytes[padIndex % padBytes.length]);
    padIndex += 1;
  }

  const codewords = buffer.toCodewords();
  invariant(codewords.length === DATA_CODEWORDS, 'Unexpected number of data codewords');
  return codewords;
}

function makeCodewords(text) {
  const data = makeDataCodewords(text);
  const generator = reedSolomonGenerator(ECC_CODEWORDS_PER_BLOCK);
  const shortBlockLength = Math.floor(RAW_CODEWORDS / BLOCK_COUNT);
  const shortBlockCount = BLOCK_COUNT - (RAW_CODEWORDS % BLOCK_COUNT);
  const blocks = [];
  let dataOffset = 0;

  for (let blockIndex = 0; blockIndex < BLOCK_COUNT; blockIndex += 1) {
    const isShortBlock = blockIndex < shortBlockCount;
    const blockDataLength = shortBlockLength - ECC_CODEWORDS_PER_BLOCK + (isShortBlock ? 0 : 1);
    const blockData = data.slice(dataOffset, dataOffset + blockDataLength);
    dataOffset += blockData.length;

    blocks.push({
      data: blockData,
      ecc: reedSolomonRemainder(blockData, generator),
    });
  }

  const result = [];
  const maxDataLength = Math.max(...blocks.map((block) => block.data.length));

  for (let i = 0; i < maxDataLength; i += 1) {
    for (const block of blocks) {
      if (i < block.data.length) {
        result.push(block.data[i]);
      }
    }
  }

  for (let i = 0; i < ECC_CODEWORDS_PER_BLOCK; i += 1) {
    for (const block of blocks) {
      result.push(block.ecc[i]);
    }
  }

  invariant(dataOffset === data.length, 'Not all data codewords were assigned to QR blocks');
  invariant(result.length === RAW_CODEWORDS, `Version ${VERSION} must contain exactly ${RAW_CODEWORDS} codewords`);
  return result;
}

function makeMatrix() {
  return {
    modules: Array.from({ length: QR_SIZE }, () => new Array(QR_SIZE).fill(false)),
    functionModules: Array.from({ length: QR_SIZE }, () => new Array(QR_SIZE).fill(false)),
  };
}

function setFunctionModule(qr, x, y, isDark) {
  if (x < 0 || y < 0 || x >= QR_SIZE || y >= QR_SIZE) {
    return;
  }
  qr.modules[y][x] = isDark;
  qr.functionModules[y][x] = true;
}

function drawFinderPattern(qr, left, top) {
  for (let y = -1; y <= 7; y += 1) {
    for (let x = -1; x <= 7; x += 1) {
      setFunctionModule(qr, left + x, top + y, false);
    }
  }

  for (let y = 0; y < 7; y += 1) {
    for (let x = 0; x < 7; x += 1) {
      const isBorder = x === 0 || x === 6 || y === 0 || y === 6;
      const isCenter = x >= 2 && x <= 4 && y >= 2 && y <= 4;
      setFunctionModule(qr, left + x, top + y, isBorder || isCenter);
    }
  }
}

function drawAlignmentPattern(qr, centerX, centerY) {
  for (let y = -2; y <= 2; y += 1) {
    for (let x = -2; x <= 2; x += 1) {
      const distance = Math.max(Math.abs(x), Math.abs(y));
      setFunctionModule(qr, centerX + x, centerY + y, distance === 2 || distance === 0);
    }
  }
}

function drawFunctionPatterns(qr) {
  drawFinderPattern(qr, 0, 0);
  drawFinderPattern(qr, QR_SIZE - 7, 0);
  drawFinderPattern(qr, 0, QR_SIZE - 7);

  for (let i = 8; i < QR_SIZE - 8; i += 1) {
    const isDark = i % 2 === 0;
    setFunctionModule(qr, i, 6, isDark);
    setFunctionModule(qr, 6, i, isDark);
  }

  for (const region of ALIGNMENTS) {
    drawAlignmentPattern(qr, region.x + 2, region.y + 2);
  }
  drawVersionBits(qr);
  drawFormatBits(qr, 0);
}

function drawVersionBits(qr) {
  if (VERSION < 7) {
    return;
  }

  let remainder = VERSION;
  for (let i = 0; i < 12; i += 1) {
    remainder = (remainder << 1) ^ (((remainder >>> 11) & 1) * 0x1f25);
  }

  const bits = (VERSION << 12) | remainder;

  for (let i = 0; i < 18; i += 1) {
    const bit = getBit(bits, i);
    const a = QR_SIZE - 11 + (i % 3);
    const b = Math.floor(i / 3);
    setFunctionModule(qr, a, b, bit);
    setFunctionModule(qr, b, a, bit);
  }
}

function drawFormatBits(qr, mask) {
  const data = (FORMAT_BITS_QUARTILE << 3) | mask;
  let remainder = data;

  for (let i = 0; i < 10; i += 1) {
    remainder = (remainder << 1) ^ (((remainder >>> 9) & 1) * 0x537);
  }

  const bits = ((data << 10) | remainder) ^ 0x5412;

  for (let i = 0; i <= 5; i += 1) {
    setFunctionModule(qr, 8, i, getBit(bits, i));
  }
  setFunctionModule(qr, 8, 7, getBit(bits, 6));
  setFunctionModule(qr, 8, 8, getBit(bits, 7));
  setFunctionModule(qr, 7, 8, getBit(bits, 8));
  for (let i = 9; i < 15; i += 1) {
    setFunctionModule(qr, 14 - i, 8, getBit(bits, i));
  }

  for (let i = 0; i < 8; i += 1) {
    setFunctionModule(qr, QR_SIZE - 1 - i, 8, getBit(bits, i));
  }
  for (let i = 8; i < 15; i += 1) {
    setFunctionModule(qr, 8, QR_SIZE - 15 + i, getBit(bits, i));
  }

  setFunctionModule(qr, 8, QR_SIZE - 8, true);
}

function getBit(value, index) {
  return ((value >>> index) & 1) !== 0;
}

function drawCodewords(qr, codewords) {
  let bitIndex = 0;
  const bitLength = codewords.length * 8;

  for (let right = QR_SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) {
      right = 5;
    }

    const upward = ((right + 1) & 2) === 0;
    for (let vert = 0; vert < QR_SIZE; vert += 1) {
      const y = upward ? QR_SIZE - 1 - vert : vert;

      for (let j = 0; j < 2; j += 1) {
        const x = right - j;
        if (qr.functionModules[y][x]) {
          continue;
        }

        let isDark = false;
        if (bitIndex < bitLength) {
          isDark = getBit(codewords[Math.floor(bitIndex / 8)], 7 - (bitIndex % 8));
          bitIndex += 1;
        }
        qr.modules[y][x] = isDark;
      }
    }
  }

  invariant(bitIndex === bitLength, 'Not all QR codeword bits were placed');
}

function cloneMatrix(qr) {
  return {
    modules: qr.modules.map((row) => [...row]),
    functionModules: qr.functionModules.map((row) => [...row]),
  };
}

function maskBit(mask, x, y) {
  switch (mask) {
    case 0:
      return (x + y) % 2 === 0;
    case 1:
      return y % 2 === 0;
    case 2:
      return x % 3 === 0;
    case 3:
      return (x + y) % 3 === 0;
    case 4:
      return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
    case 5:
      return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6:
      return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    case 7:
      return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
    default:
      throw new Error(`Unknown mask: ${mask}`);
  }
}

function applyMask(qr, mask) {
  for (let y = 0; y < QR_SIZE; y += 1) {
    for (let x = 0; x < QR_SIZE; x += 1) {
      if (!qr.functionModules[y][x] && maskBit(mask, x, y)) {
        qr.modules[y][x] = !qr.modules[y][x];
      }
    }
  }
}

function penaltyScore(qr) {
  let result = 0;

  for (let y = 0; y < QR_SIZE; y += 1) {
    result += linePenalty(qr.modules[y]);
  }

  for (let x = 0; x < QR_SIZE; x += 1) {
    const column = [];
    for (let y = 0; y < QR_SIZE; y += 1) {
      column.push(qr.modules[y][x]);
    }
    result += linePenalty(column);
  }

  for (let y = 0; y < QR_SIZE - 1; y += 1) {
    for (let x = 0; x < QR_SIZE - 1; x += 1) {
      const color = qr.modules[y][x];
      if (
        qr.modules[y][x + 1] === color &&
        qr.modules[y + 1][x] === color &&
        qr.modules[y + 1][x + 1] === color
      ) {
        result += 3;
      }
    }
  }

  for (let y = 0; y < QR_SIZE; y += 1) {
    result += finderPenalty(qr.modules[y]);
  }

  for (let x = 0; x < QR_SIZE; x += 1) {
    const column = [];
    for (let y = 0; y < QR_SIZE; y += 1) {
      column.push(qr.modules[y][x]);
    }
    result += finderPenalty(column);
  }

  let darkCount = 0;
  for (let y = 0; y < QR_SIZE; y += 1) {
    for (let x = 0; x < QR_SIZE; x += 1) {
      if (qr.modules[y][x]) {
        darkCount += 1;
      }
    }
  }

  const totalModules = QR_SIZE * QR_SIZE;
  result += Math.floor(Math.abs((darkCount * 100) / totalModules - 50) / 5) * 10;

  return result;
}

function linePenalty(line) {
  let result = 0;
  let runColor = line[0];
  let runLength = 1;

  for (let i = 1; i < line.length; i += 1) {
    if (line[i] === runColor) {
      runLength += 1;
    } else {
      if (runLength >= 5) {
        result += runLength - 2;
      }
      runColor = line[i];
      runLength = 1;
    }
  }

  if (runLength >= 5) {
    result += runLength - 2;
  }

  return result;
}

function finderPenalty(line) {
  const pattern = [true, false, true, true, true, false, true];
  let result = 0;

  for (let i = 0; i <= line.length - pattern.length; i += 1) {
    let matches = true;
    for (let j = 0; j < pattern.length; j += 1) {
      if (line[i + j] !== pattern[j]) {
        matches = false;
        break;
      }
    }

    if (!matches) {
      continue;
    }

    const hasLightBefore = i >= 4 && line.slice(i - 4, i).every((value) => !value);
    const hasLightAfter =
      i + pattern.length + 4 <= line.length &&
      line.slice(i + pattern.length, i + pattern.length + 4).every((value) => !value);

    if (hasLightBefore || hasLightAfter) {
      result += 40;
    }
  }

  return result;
}

function makeQrMatrix(text) {
  const base = makeMatrix();
  drawFunctionPatterns(base);
  drawCodewords(base, makeCodewords(text));

  let bestQr = null;
  let bestMask = -1;
  let bestPenalty = Number.POSITIVE_INFINITY;

  for (let mask = 0; mask < 8; mask += 1) {
    const candidate = cloneMatrix(base);
    applyMask(candidate, mask);
    drawFormatBits(candidate, mask);
    const penalty = penaltyScore(candidate);

    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestMask = mask;
      bestQr = candidate;
    }
  }

  return { qr: bestQr, mask: bestMask, penalty: bestPenalty };
}

function isInRegion(x, y, regions) {
  return regions.some((region) => (
    x >= region.x &&
    y >= region.y &&
    x < region.x + region.size &&
    y < region.y + region.size
  ));
}

function isMarkerModule(x, y) {
  return isInRegion(x, y, FINDERS) || isInRegion(x, y, ALIGNMENTS);
}

function moduleX(x) {
  return x + QUIET_ZONE;
}

function moduleY(y) {
  return y + QUIET_ZONE;
}

function makeOctagonPath(x, y, size, cut) {
  const points = [
    [x + cut, y],
    [x + size - cut, y],
    [x + size, y + cut],
    [x + size, y + size - cut],
    [x + size - cut, y + size],
    [x + cut, y + size],
    [x, y + size - cut],
    [x, y + cut],
  ];

  return `M ${points.map(([px, py]) => `${round(px)} ${round(py)}`).join(' L ')} Z`;
}

function makeDecoFramePath(x, y, size, inset, outerCut, innerCut) {
  const outer = makeOctagonPath(x, y, size, outerCut);
  const inner = makeOctagonPath(x + inset, y + inset, size - inset * 2, innerCut);
  return `${outer} ${inner}`;
}

function round(value) {
  return Number(value.toFixed(3));
}

function svgDot(x, y, color) {
  return `<circle cx="${round(moduleX(x) + 0.5)}" cy="${round(moduleY(y) + 0.5)}" r="0.43" fill="${color}"/>`;
}

function svgFinder(region, color) {
  const x = moduleX(region.x);
  const y = moduleY(region.y);
  const border = makeDecoFramePath(x, y, 7, 1, 0.6, 0.42);
  const center = makeOctagonPath(x + 2, y + 2, 3, 0.42);
  const accentA = makeOctagonPath(x + 0.55, y + 0.55, 0.9, 0.18);
  const accentB = makeOctagonPath(x + 5.55, y + 0.55, 0.9, 0.18);
  const accentC = makeOctagonPath(x + 0.55, y + 5.55, 0.9, 0.18);
  const accentD = makeOctagonPath(x + 5.55, y + 5.55, 0.9, 0.18);

  return [
    `<path d="${border}" fill="${color}" fill-rule="evenodd"/>`,
    `<path d="${center}" fill="${color}"/>`,
    `<path d="${accentA} ${accentB} ${accentC} ${accentD}" fill="${color}"/>`,
  ].join('\n');
}

function svgAlignment(region, color) {
  const x = moduleX(region.x);
  const y = moduleY(region.y);
  const border = makeDecoFramePath(x, y, 5, 1, 0.45, 0.32);
  const center = makeOctagonPath(x + 2, y + 2, 1, 0.18);

  return [
    `<path d="${border}" fill="${color}" fill-rule="evenodd"/>`,
    `<path d="${center}" fill="${color}"/>`,
  ].join('\n');
}

function makeSvg(qr, color, targetUrl) {
  const dots = [];
  for (let y = 0; y < QR_SIZE; y += 1) {
    for (let x = 0; x < QR_SIZE; x += 1) {
      if (qr.modules[y][x] && !isMarkerModule(x, y)) {
        dots.push(svgDot(x, y, color));
      }
    }
  }

  const markers = [
    ...FINDERS.map((region) => svgFinder(region, color)),
    ...ALIGNMENTS.map((region) => svgAlignment(region, color)),
  ];

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PNG_SIZE}" height="${PNG_SIZE}" viewBox="0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}" role="img" aria-label="QR code for ${targetUrl}">`,
    `<title>QR code for ${targetUrl}</title>`,
    `<desc>Transparent Art Deco dotted QR code for ${targetUrl}</desc>`,
    '<g shape-rendering="geometricPrecision">',
    ...dots,
    ...markers,
    '</g>',
    '</svg>',
    '',
  ].join('\n');
}

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function drawCoverage(image, pixelX, pixelY, color, coverage) {
  if (coverage <= 0 || pixelX < 0 || pixelY < 0 || pixelX >= PNG_SIZE || pixelY >= PNG_SIZE) {
    return;
  }

  const offset = (pixelY * PNG_SIZE + pixelX) * 4;
  image[offset] = color.r;
  image[offset + 1] = color.g;
  image[offset + 2] = color.b;
  image[offset + 3] = Math.max(image[offset + 3], Math.round(coverage * 255));
}

function drawCircle(image, cx, cy, radius, color) {
  const minX = Math.floor((cx - radius) * PIXELS_PER_MODULE);
  const maxX = Math.ceil((cx + radius) * PIXELS_PER_MODULE);
  const minY = Math.floor((cy - radius) * PIXELS_PER_MODULE);
  const maxY = Math.ceil((cy + radius) * PIXELS_PER_MODULE);
  const samples = [0.25, 0.75];
  const radiusSquared = radius * radius;

  for (let pixelY = minY; pixelY < maxY; pixelY += 1) {
    for (let pixelX = minX; pixelX < maxX; pixelX += 1) {
      let covered = 0;
      for (const sy of samples) {
        for (const sx of samples) {
          const x = (pixelX + sx) / PIXELS_PER_MODULE;
          const y = (pixelY + sy) / PIXELS_PER_MODULE;
          const dx = x - cx;
          const dy = y - cy;
          if (dx * dx + dy * dy <= radiusSquared) {
            covered += 1;
          }
        }
      }
      drawCoverage(image, pixelX, pixelY, color, covered / 4);
    }
  }
}

function drawPolygon(image, points, color) {
  const minX = Math.floor(Math.min(...points.map(([x]) => x)) * PIXELS_PER_MODULE);
  const maxX = Math.ceil(Math.max(...points.map(([x]) => x)) * PIXELS_PER_MODULE);
  const minY = Math.floor(Math.min(...points.map(([, y]) => y)) * PIXELS_PER_MODULE);
  const maxY = Math.ceil(Math.max(...points.map(([, y]) => y)) * PIXELS_PER_MODULE);
  const samples = [0.25, 0.75];

  for (let pixelY = minY; pixelY < maxY; pixelY += 1) {
    for (let pixelX = minX; pixelX < maxX; pixelX += 1) {
      let covered = 0;
      for (const sy of samples) {
        for (const sx of samples) {
          const x = (pixelX + sx) / PIXELS_PER_MODULE;
          const y = (pixelY + sy) / PIXELS_PER_MODULE;
          if (pointInPolygon(x, y, points)) {
            covered += 1;
          }
        }
      }
      drawCoverage(image, pixelX, pixelY, color, covered / 4);
    }
  }
}

function drawFrame(image, outer, inner, color) {
  const minX = Math.floor(Math.min(...outer.map(([x]) => x)) * PIXELS_PER_MODULE);
  const maxX = Math.ceil(Math.max(...outer.map(([x]) => x)) * PIXELS_PER_MODULE);
  const minY = Math.floor(Math.min(...outer.map(([, y]) => y)) * PIXELS_PER_MODULE);
  const maxY = Math.ceil(Math.max(...outer.map(([, y]) => y)) * PIXELS_PER_MODULE);
  const samples = [0.25, 0.75];

  for (let pixelY = minY; pixelY < maxY; pixelY += 1) {
    for (let pixelX = minX; pixelX < maxX; pixelX += 1) {
      let covered = 0;
      for (const sy of samples) {
        for (const sx of samples) {
          const x = (pixelX + sx) / PIXELS_PER_MODULE;
          const y = (pixelY + sy) / PIXELS_PER_MODULE;
          if (pointInPolygon(x, y, outer) && !pointInPolygon(x, y, inner)) {
            covered += 1;
          }
        }
      }
      drawCoverage(image, pixelX, pixelY, color, covered / 4);
    }
  }
}

function pointInPolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

function octagonPoints(x, y, size, cut) {
  return [
    [x + cut, y],
    [x + size - cut, y],
    [x + size, y + cut],
    [x + size, y + size - cut],
    [x + size - cut, y + size],
    [x + cut, y + size],
    [x, y + size - cut],
    [x, y + cut],
  ];
}

function drawFinderPng(image, region, color) {
  const x = moduleX(region.x);
  const y = moduleY(region.y);
  drawFrame(
    image,
    octagonPoints(x, y, 7, 0.6),
    octagonPoints(x + 1, y + 1, 5, 0.42),
    color,
  );
  drawPolygon(image, octagonPoints(x + 2, y + 2, 3, 0.42), color);

  for (const [accentX, accentY] of [
    [0.55, 0.55],
    [5.55, 0.55],
    [0.55, 5.55],
    [5.55, 5.55],
  ]) {
    drawPolygon(image, octagonPoints(x + accentX, y + accentY, 0.9, 0.18), color);
  }
}

function drawAlignmentPng(image, region, color) {
  const x = moduleX(region.x);
  const y = moduleY(region.y);
  drawFrame(
    image,
    octagonPoints(x, y, 5, 0.45),
    octagonPoints(x + 1, y + 1, 3, 0.32),
    color,
  );
  drawPolygon(image, octagonPoints(x + 2, y + 2, 1, 0.18), color);
}

function makePng(qr, hexColor) {
  const image = Buffer.alloc(PNG_SIZE * PNG_SIZE * 4);
  const color = hexToRgb(hexColor);

  for (let y = 0; y < QR_SIZE; y += 1) {
    for (let x = 0; x < QR_SIZE; x += 1) {
      if (qr.modules[y][x] && !isMarkerModule(x, y)) {
        drawCircle(image, moduleX(x) + 0.5, moduleY(y) + 0.5, 0.43, color);
      }
    }
  }

  for (const region of FINDERS) {
    drawFinderPng(image, region, color);
  }

  for (const region of ALIGNMENTS) {
    drawAlignmentPng(image, region, color);
  }

  return encodePng(image, PNG_SIZE, PNG_SIZE);
}

function encodePng(rgba, width, height) {
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);

  for (let y = 0; y < height; y += 1) {
    const sourceStart = y * width * 4;
    const targetStart = y * stride;
    raw[targetStart] = 0;
    rgba.copy(raw, targetStart + 1, sourceStart, sourceStart + width * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', makeIhdr(width, height)),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function makeIhdr(width, height) {
  const buffer = Buffer.alloc(13);
  buffer.writeUInt32BE(width, 0);
  buffer.writeUInt32BE(height, 4);
  buffer[8] = 8;
  buffer[9] = 6;
  buffer[10] = 0;
  buffer[11] = 0;
  buffer[12] = 0;
  return buffer;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([length, typeBuffer, data, crc]);
}

const CRC_TABLE = makeCrcTable();

function makeCrcTable() {
  const table = [];
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
}

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) {
    c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function parseArgs(argv) {
  const options = {
    ...DEFAULT_OPTIONS,
    colors: [...DEFAULT_OPTIONS.colors],
    name: null,
    prefix: null,
    url: null,
    help: false,
  };
  const colors = [];

  for (let i = 0; i < argv.length; i += 1) {
    const { flag, value: inlineValue } = splitArg(argv[i]);
    const readValue = () => {
      if (inlineValue !== null) {
        return inlineValue;
      }

      i += 1;
      invariant(i < argv.length, `Missing value for ${flag}`);
      return argv[i];
    };

    switch (flag) {
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--url':
        options.url = readValue();
        break;
      case '--base-url':
        options.baseUrl = readValue();
        break;
      case '--locale':
        options.locale = readValue();
        break;
      case '--event':
        options.event = readValue();
        break;
      case '--name':
        options.name = readValue();
        break;
      case '--prefix':
        options.prefix = readValue();
        break;
      case '--output-dir':
        options.outputDir = readValue();
        break;
      case '--color':
        colors.push(readValue());
        break;
      case '--colors':
        colors.push(...readValue().split(','));
        break;
      case '--min-version':
        options.minVersion = parseInteger(readValue(), flag);
        break;
      case '--pixels-per-module':
        options.pixelsPerModule = parseInteger(readValue(), flag);
        break;
      default:
        throw new Error(`Unknown option: ${flag}`);
    }
  }

  if (colors.length > 0) {
    options.colors = colors;
  }

  options.colors = options.colors.map(normalizeColor);
  invariant(options.colors.length > 0, 'At least one color is required');
  invariant(options.minVersion >= 1 && options.minVersion <= MAX_VERSION, `--min-version must be 1-${MAX_VERSION}`);
  invariant(options.pixelsPerModule >= 8, '--pixels-per-module must be at least 8');

  return options;
}

function splitArg(arg) {
  const equalsIndex = arg.indexOf('=');
  if (equalsIndex === -1) {
    return { flag: arg, value: null };
  }

  return {
    flag: arg.slice(0, equalsIndex),
    value: arg.slice(equalsIndex + 1),
  };
}

function parseInteger(value, flag) {
  const result = Number.parseInt(value, 10);
  invariant(Number.isInteger(result) && `${result}` === value, `${flag} must be an integer`);
  return result;
}

function normalizeColor(color) {
  const normalized = color.trim();
  invariant(/^#[0-9a-f]{6}$/i.test(normalized), `Color must be #RRGGBB: ${color}`);
  return `#${normalized.slice(1).toUpperCase()}`;
}

function colorName(color) {
  return color.slice(1).toLowerCase();
}

function buildTargetUrl(options) {
  if (options.url) {
    return options.url;
  }

  const baseUrl = options.baseUrl.replace(/\/+$/, '');
  const locale = encodeURIComponent(options.locale.replace(/^\/+|\/+$/g, ''));
  const event = encodeURIComponent(options.event.replace(/^\/+|\/+$/g, ''));

  invariant(locale.length > 0, '--locale cannot be empty');
  invariant(event.length > 0, '--event cannot be empty');

  return `${baseUrl}/poster/${locale}/${event}`;
}

function inferOutputName(options, targetUrl) {
  if (options.name) {
    return options.name;
  }

  if (!options.url && options.event) {
    return options.event;
  }

  const pathname = new URL(targetUrl).pathname.replace(/\/+$/, '');
  return pathname.split('/').filter(Boolean).at(-1) || 'poster';
}

function sanitizeFileStem(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'poster';
}

function printHelp() {
  console.log(`Usage:
  node scripts/generate-poster-qr.mjs [options]

Defaults recreate the Bastille Day poster QR files.

Options:
  --event <slug>              Event slug for /poster/<locale>/<event>
  --locale <locale>           Poster locale, default: en
  --url <url>                 Exact URL; overrides --event and --locale
  --name <stem>               Output name stem, default: event slug or URL leaf
  --prefix <stem>             Full output prefix, default: <name>-qr
  --colors <list>             Comma-separated #RRGGBB colors
  --color <#RRGGBB>           Add one color; can be repeated
  --output-dir <path>         Output directory, default: public/assets/img/qr
  --min-version <1-10>        Minimum QR version, default: 4
  --pixels-per-module <n>     PNG scale, default: 40
  --help                      Show this help

Examples:
  node scripts/generate-poster-qr.mjs --event cherry-days --locale ru --colors "#850305,#F3E9DC"
  node scripts/generate-poster-qr.mjs --url https://vivien.lv/poster/en/bastille-day --name bastille-day
`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const targetUrl = buildTargetUrl(options);
  const byteLength = new TextEncoder().encode(targetUrl).length;
  const version = pickVersion(byteLength, options.minVersion);
  configureQrVersion(version, options.pixelsPerModule);

  const outputName = sanitizeFileStem(inferOutputName(options, targetUrl));
  const outputPrefix = sanitizeFileStem(options.prefix || `${outputName}-qr`);
  const variants = options.colors.map((color) => ({
    name: colorName(color),
    color,
  }));

  const { qr, mask, penalty } = makeQrMatrix(targetUrl);
  mkdirSync(options.outputDir, { recursive: true });

  const files = [];

  for (const variant of variants) {
    const svgFile = `${outputPrefix}-${variant.name}.svg`;
    const pngFile = `${outputPrefix}-${variant.name}.png`;

    writeFileSync(join(options.outputDir, svgFile), makeSvg(qr, variant.color, targetUrl), 'utf8');
    writeFileSync(join(options.outputDir, pngFile), makePng(qr, variant.color));
    files.push(svgFile, pngFile);
  }

  console.log(
    JSON.stringify(
      {
        url: targetUrl,
        version: VERSION,
        errorCorrection: 'Q',
        size: QR_SIZE,
        quietZone: QUIET_ZONE,
        bytes: byteLength,
        mask,
        penalty,
        pngSize: `${PNG_SIZE}x${PNG_SIZE}`,
        outputDir: options.outputDir,
        files,
      },
      null,
      2,
    ),
  );
}

main();
