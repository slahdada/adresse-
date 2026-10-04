import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Create clean, high-contrast SVG brand icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
      <stop offset="100%" stop-color="#f8fafc" stop-opacity="0.9" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>
  
  <!-- Address Book Card Silhouette -->
  <g transform="translate(96, 88)">
    <!-- Book Spine Bindings -->
    <rect x="0" y="32" width="16" height="32" rx="8" fill="#38bdf8" opacity="0.9"/>
    <rect x="0" y="104" width="16" height="32" rx="8" fill="#38bdf8" opacity="0.9"/>
    <rect x="0" y="176" width="16" height="32" rx="8" fill="#38bdf8" opacity="0.9"/>
    <rect x="0" y="248" width="16" height="32" rx="8" fill="#38bdf8" opacity="0.9"/>

    <!-- Main Card Body -->
    <rect x="24" y="0" width="296" height="336" rx="28" fill="url(#cardGrad)" stroke="#38bdf8" stroke-width="6"/>

    <!-- Contact Avatar Icon -->
    <circle cx="172" cy="116" r="46" fill="#0284c7" />
    <path d="M112 224 C112 178, 232 178, 232 224" fill="#0284c7" />

    <!-- Info Lines -->
    <rect x="76" y="246" width="192" height="14" rx="7" fill="#64748b" opacity="0.75" />
    <rect x="100" y="274" width="144" height="12" rx="6" fill="#94a3b8" opacity="0.6" />

    <!-- Alphabet Tab Indicator -->
    <rect x="290" y="48" width="26" height="42" rx="6" fill="#0ea5e9" />
    <text x="303" y="75" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="bold" fill="#ffffff" text-anchor="middle">A</text>
  </g>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf-8');
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent, 'utf-8');

// Function to create minimal uncompressed PNG using zlib
function createPng(width, height, colorR, colorG, colorB) {
  function crc32(buf) {
    let c;
    const table = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[n] = c;
    }
    let crc = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ (-1)) >>> 0;
  }

  function writeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(4 + 4 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crcBuf = Buffer.alloc(4 + len);
    buf.copy(crcBuf, 0, 4, 8 + len);
    const c = crc32(crcBuf);
    buf.writeUInt32BE(c, 8 + len);
    return buf;
  }

  // Raw image data with 1 filter byte (0) per scanline
  const rowBytes = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowBytes);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter: None
    
    // Draw rounded background and book icon shapes
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      
      // Normalized coords [0, 1]
      const nx = x / width;
      const ny = y / height;
      
      // Distance from center
      const dx = (nx - 0.5) * 2;
      const dy = (ny - 0.5) * 2;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Gradient background #0284c7 -> #0f172a
      let r = Math.round(2 + (15 - 2) * ny);
      let g = Math.round(132 + (23 - 132) * ny);
      let b = Math.round(199 + (42 - 199) * ny);
      let a = 255;

      // Inner card area: nx in [0.25, 0.75], ny in [0.22, 0.78]
      if (nx >= 0.26 && nx <= 0.74 && ny >= 0.22 && ny <= 0.78) {
        // Contact card white
        r = 250; g = 250; b = 252;
        
        // Avatar circle centered around (0.5, 0.42), radius ~0.11
        const adx = (nx - 0.5);
        const ady = (ny - 0.42);
        if (adx * adx + ady * ady < 0.012) {
          r = 2; g = 132; b = 199; // avatar head
        }
        // Avatar shoulder
        const asdx = (nx - 0.5);
        const asdy = (ny - 0.56);
        if (asdx * asdx * 2 + asdy * asdy < 0.018 && ny >= 0.48 && ny <= 0.60) {
          r = 2; g = 132; b = 199;
        }
        // Info lines
        if (ny >= 0.64 && ny <= 0.66 && nx >= 0.35 && nx <= 0.65) {
          r = 100; g = 116; b = 139;
        }
        if (ny >= 0.69 && ny <= 0.71 && nx >= 0.38 && nx <= 0.62) {
          r = 148; g = 163; b = 184;
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  // Compress IDAT
  const compressed = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type 6: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = writeChunk('IHDR', ihdr);
  const idatChunk = writeChunk('IDAT', compressed);
  const iendChunk = writeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Write PNG files
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192, 2, 132, 199));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512, 2, 132, 199));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPng(512, 512, 2, 132, 199));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, 2, 132, 199));

console.log('PWA icons created successfully in public/');
