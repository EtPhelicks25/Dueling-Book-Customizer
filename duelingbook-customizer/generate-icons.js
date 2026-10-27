/**
 * generate-icons.js
 * Run with: node generate-icons.js
 *
 * Creates simple placeholder PNG icons for the extension.
 * Uses a minimal 1-pixel-per-color BMP approach encoded as base64 PNG.
 *
 * For production, replace these with proper designed icons.
 */

const fs = require('fs');
const { createCanvas } = (() => {
  // Try to use canvas package if available; otherwise create
  // minimal valid PNGs manually.
  try {
    return require('canvas');
  } catch {
    return { createCanvas: null };
  }
})();

// Minimal valid PNG generator (no dependencies)
function createMinimalPNG(size) {
  // We'll create a simple colored square PNG
  // Using raw PNG construction

  function crc32(buf) {
    let c;
    const crcTable = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      crcTable[n] = c;
    }
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const body = Buffer.concat([typeBytes, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([len, body, crc]);
  }

  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);  // width
  ihdr.writeUInt32BE(size, 4);  // height
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // IDAT — raw image data (filter byte 0 + RGB pixels per row)
  const rawRows = [];
  for (let y = 0; y < size; y++) {
    const row = [0]; // filter byte: None
    for (let x = 0; x < size; x++) {
      // Simple gradient card icon: red-ish (#e94560)
      row.push(0xe9, 0x45, 0x60);
    }
    rawRows.push(Buffer.from(row));
  }
  const rawData = Buffer.concat(rawRows);

  // Deflate with zlib
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(rawData);

  // Build PNG
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const sizes = [16, 48, 128];
sizes.forEach(size => {
  const png = createMinimalPNG(size);
  fs.writeFileSync(`icons/icon${size}.png`, png);
  console.log(`Created icons/icon${size}.png (${png.length} bytes)`);
});
