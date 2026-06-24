import type { BinderConfig } from "@/lib/config";

// Compact, human-readable share tokens for binder layouts:
//   <setId>~<rows><cols><mode><secrets><pb><mb><ep><place><style>
//   e.g. sv8pt5~34m1111ic → Prismatic Evolutions, 3×4, master, everything on,
//        interleaved, clean print. Reversible — no server storage needed.
//   The <ep> (Energy pattern) bit is newer: legacy tokens omit it and decode
//   with Energy patterns on, since <place>/<style> are letters, not 0/1.

const MODE = { standard: "s", master: "m" } as const;
const PLACE = { mix: "i", end: "e" } as const;
const STYLE = { clean: "c", retro: "r" } as const;

const bit = (b: boolean) => (b ? "1" : "0");

export function encodeShareToken(config: BinderConfig): string {
  return [
    config.set,
    "~",
    config.rows,
    config.cols,
    MODE[config.mode],
    bit(config.secrets),
    bit(config.pb),
    bit(config.mb),
    bit(config.ep),
    PLACE[config.place],
    STYLE[config.style],
  ].join("");
}

// The 7th capture group (ep) is optional: legacy tokens have no Energy-pattern
// bit. place/style are letters so an absent ep can't be mistaken for them.
const TOKEN_RE = /^([a-z0-9.]+)~([1-5])([1-5])([sm])([01])([01])([01])([01])?([ie])([cr])$/i;

export function decodeShareToken(token: string): BinderConfig | null {
  const m = TOKEN_RE.exec(token);
  if (!m) return null;
  const [, set, rows, cols, mode, secrets, pb, mb, ep, place, style] = m;
  return {
    set: set!,
    rows: Number.parseInt(rows!, 10),
    cols: Number.parseInt(cols!, 10),
    mode: mode!.toLowerCase() === "m" ? "master" : "standard",
    secrets: secrets === "1",
    pb: pb === "1",
    mb: mb === "1",
    ep: ep === undefined ? true : ep === "1",
    place: place!.toLowerCase() === "e" ? "end" : "mix",
    style: style!.toLowerCase() === "r" ? "retro" : "clean",
  };
}
