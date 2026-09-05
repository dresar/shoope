const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(width, height, drawFn) {
  // RGBA buffer: 4 bytes per pixel + 1 filter byte per scanline
  const scanlineLength = width * 4 + 1;
  const rawData = Buffer.alloc(scanlineLength * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(12 + length);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crc = crc32(chunk.subarray(4, 8 + length));
  chunk.writeUInt32BE(crc, 8 + length);
  return chunk;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[i] = c >>> 0;
  }
  return table;
})();

// Drawing logic: Rounded square with Shopee orange (#EE4D2D) and a shopping bag / link symbol in white
function drawIcon(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const r = w * 0.22; // border radius
  
  // Check rounded rectangle bounds
  const dx = Math.max(Math.abs(x - cx) - (w * 0.45 - r), 0);
  const dy = Math.max(Math.abs(y - cy) - (h * 0.45 - r), 0);
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > r) {
    return [0, 0, 0, 0]; // Transparent outside
  }

  // Gradient orange background
  const normY = y / h;
  const baseR = 238;
  const baseG = Math.floor(77 + normY * 30);
  const baseB = 45;

  // Center link / 'S' shape in white
  const relX = (x - cx) / (w * 0.5);
  const relY = (y - cy) / (h * 0.5);

  // Bag handle
  const handleRadius = 0.35;
  const distHandle = Math.sqrt(relX * relX + (relY + 0.2) * (relY + 0.2));
  const isHandle = distHandle > 0.22 && distHandle < 0.36 && relY < -0.15;

  // Bag body or 'S' pattern
  const isBagBody = Math.abs(relX) < 0.55 && relY > -0.2 && relY < 0.65;
  const isBagInner = Math.abs(relX) < 0.45 && relY > -0.1 && relY < 0.55;

  // Simple bolt/link shape
  const isBolt = (Math.abs(relX + relY * 0.3) < 0.18 && relY > -0.25 && relY < 0.35) ||
                 (Math.abs(relX - relY * 0.2) < 0.18 && relY >= 0.1 && relY < 0.5);

  if (isHandle || (isBagBody && !isBagInner) || (isBagInner && isBolt)) {
    return [255, 255, 255, 255]; // White
  }

  return [baseR, baseG, baseB, 255];
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 48, 128].forEach(size => {
  const pngBuf = createPNG(size, size, drawIcon);
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), pngBuf);
  console.log(`Generated icon-${size}.png (${size}x${size})`);
});
