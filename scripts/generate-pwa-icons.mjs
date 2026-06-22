// Generates the PWA install icons from app/icon.svg (the 16×16 pixel Poké Ball
// on DMG green). Pixel art scales cleanly at integer factors, so each icon is a
// nearest-neighbour upscale — no anti-aliasing, stays crisp at every size.
//
//   node scripts/generate-pwa-icons.mjs
//
// Outputs (RGB, no alpha — the art is fully opaque on a green field):
//   public/icon-192.png           home-screen / manifest icon (purpose: any)
//   public/icon-512.png           large manifest icon          (purpose: any)
//   public/icon-maskable-512.png  Android adaptive icon — art inset into the
//                                 80% safe zone so the launcher mask can't clip it
//   app/apple-icon.png            iOS touch icon (Next wires <link rel=apple-touch-icon>)
import { deflateSync } from "node:zlib";
import { readFile, writeFile } from "node:fs/promises";

const SVG_PATH = "app/icon.svg";
const GRID = 16; // the source viewBox is 16×16
const BG = "#9bbc0f"; // DMG green — also the manifest background_color

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/** Parse the <rect> list into a 16×16 grid of [r,g,b], honouring SVG paint
 *  order (later rects overwrite earlier ones). */
async function loadGrid() {
  const svg = await readFile(SVG_PATH, "utf8");
  const grid = Array.from({ length: GRID }, () =>
    Array.from({ length: GRID }, () => hexToRgb(BG)),
  );
  const rectRe = /<rect\b([^>]*)\/>/g;
  const attr = (s, name) => {
    const m = s.match(new RegExp(`${name}="([^"]*)"`));
    return m ? m[1] : null;
  };
  let m;
  while ((m = rectRe.exec(svg))) {
    const a = m[1];
    const x = Number(attr(a, "x") ?? 0);
    const y = Number(attr(a, "y") ?? 0);
    const w = Number(attr(a, "width") ?? 0);
    const h = Number(attr(a, "height") ?? 0);
    const rgb = hexToRgb(attr(a, "fill") ?? BG);
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        if (yy >= 0 && yy < GRID && xx >= 0 && xx < GRID) grid[yy][xx] = rgb;
      }
    }
  }
  return grid;
}

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

function encodePng(width, height, rgbAt) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type 2 = truecolour RGB
  const rows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 3);
    row[0] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const [r, g, b] = rgbAt(x, y);
      row[1 + x * 3] = r;
      row[2 + x * 3] = g;
      row[3 + x * 3] = b;
    }
    rows.push(row);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Full-bleed: the whole grid fills the icon (integer scale = crisp). */
function fullBleed(grid, size) {
  const scale = size / GRID;
  return encodePng(size, size, (x, y) => grid[Math.floor(y / scale)][Math.floor(x / scale)]);
}

/** Inset: the grid is drawn at an integer scale, centred on a green field, so a
 *  circular/squircle launcher mask never clips the ball. */
function inset(grid, size, artScale) {
  const art = GRID * artScale;
  const offset = Math.floor((size - art) / 2);
  const bg = hexToRgb(BG);
  return encodePng(size, size, (x, y) => {
    const gx = Math.floor((x - offset) / artScale);
    const gy = Math.floor((y - offset) / artScale);
    if (gx < 0 || gx >= GRID || gy < 0 || gy >= GRID) return bg;
    return grid[gy][gx];
  });
}

const grid = await loadGrid();

const outputs = [
  ["public/icon-192.png", fullBleed(grid, 192)],
  ["public/icon-512.png", fullBleed(grid, 512)],
  // 24× art (384px) sits well inside the 80% (≈410px) maskable safe zone.
  ["public/icon-maskable-512.png", inset(grid, 512, 24)],
  // 10× art (160px) on a 180px field leaves a 10px margin for iOS corner rounding.
  ["app/apple-icon.png", inset(grid, 180, 10)],
];

for (const [path, png] of outputs) {
  await writeFile(path, png);
  console.log(`${path} written (${png.length} bytes)`);
}
