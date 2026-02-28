import { deflateSync } from "zlib";
import { writeFileSync, mkdirSync } from "fs";

function computeCRC(buf: Buffer): number {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type: string, data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, "ascii");
  const crcVal = computeCRC(Buffer.concat([typeBytes, data]));
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, typeBytes, data, crc]);
}

function createSolidPNG(width: number, height: number): Buffer {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type RGB
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  // Each row: 1 filter byte + width*3 RGB bytes
  const rowSize = 1 + width * 3;
  const raw = Buffer.alloc(height * rowSize, 0);

  for (let y = 0; y < height; y++) {
    raw[y * rowSize] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const px = y * rowSize + 1 + x * 3;
      // Dark background (#0a0a0a = 10,10,10)
      // White "L" shape as a simple logo placeholder
      const safe = 0.15;
      const normX = x / width;
      const normY = y / height;
      const inVertical =
        normX >= 0.25 && normX < 0.45 && normY >= 0.2 && normY < 0.8;
      const inHorizontal =
        normX >= 0.25 && normX < 0.75 && normY >= 0.65 && normY < 0.8;
      const inSafeZone =
        normX < safe || normY < safe || normX >= 1 - safe || normY >= 1 - safe;
      const isLogo = inVertical || inHorizontal;

      if (inSafeZone) {
        raw[px] = 24;
        raw[px + 1] = 24;
        raw[px + 2] = 27;
      } else if (isLogo) {
        raw[px] = 255;
        raw[px + 1] = 255;
        raw[px + 2] = 255;
      } else {
        raw[px] = 10;
        raw[px + 1] = 10;
        raw[px + 2] = 10;
      }
    }
  }

  const compressed = deflateSync(raw);
  const idat = makeChunk("IDAT", compressed);
  const iend = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([sig, makeChunk("IHDR", ihdrData), idat, iend]);
}

mkdirSync("public/icons", { recursive: true });

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
for (const s of sizes) {
  const buf = createSolidPNG(s, s);
  writeFileSync(`public/icons/icon-${s}x${s}.png`, buf);
  console.log(`✓ icon-${s}x${s}.png (${buf.length} bytes)`);
}

writeFileSync(
  "public/icons/icon-maskable-192x192.png",
  createSolidPNG(192, 192)
);
console.log("✓ icon-maskable-192x192.png");

writeFileSync(
  "public/icons/icon-maskable-512x512.png",
  createSolidPNG(512, 512)
);
console.log("✓ icon-maskable-512x512.png");

console.log("All icons generated.");
