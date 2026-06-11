// Generates public/card-stub.png — a tiny 63×88 two-tone card placeholder used
// when IMG_STUB=1 (tests/e2e) so nothing touches the real image CDN.
//   node scripts/make-stub-png.mjs
import { deflateSync } from "node:zlib";
import { writeFile } from "node:fs/promises";

const W = 63;
const H = 88;

function crc32buf(buf) {
  let crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    crc ^= buf[n];
    for (let k = 0; k < 8; k++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32buf(body));
  return Buffer.concat([len, body, crc]);
}

// IHDR: 8-bit grayscale
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 0; // grayscale
// scanlines: filter byte 0 + pixels; dark 4px frame, light interior, dark inner circle
const rows = [];
for (let y = 0; y < H; y++) {
  const row = Buffer.alloc(1 + W);
  row[0] = 0;
  for (let x = 0; x < W; x++) {
    const border = x < 4 || y < 4 || x >= W - 4 || y >= H - 4;
    const cx = x - W / 2;
    const cy = y - H / 2;
    const ball = cx * cx + cy * cy < 100;
    row[1 + x] = border || ball ? 0x30 : 0xc8;
  }
  rows.push(row);
}
const idat = deflateSync(Buffer.concat(rows));

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", idat),
  chunk("IEND", Buffer.alloc(0)),
]);

await writeFile("public/card-stub.png", png);
console.log(`public/card-stub.png written (${png.length} bytes)`);
