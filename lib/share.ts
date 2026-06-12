import type { BinderConfig } from "@/lib/config";

// Compact, human-readable share tokens for binder layouts:
//   <setId>~<rows><cols><mode><secrets><pb><mb><place><style>
//   e.g. sv8pt5~34m111ic  → Prismatic Evolutions, 3×4, master, everything on,
//        interleaved, clean print. Reversible — no server storage needed.

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
    PLACE[config.place],
    STYLE[config.style],
  ].join("");
}

const TOKEN_RE = /^([a-z0-9.]+)~([1-5])([1-5])([sm])([01])([01])([01])([ie])([cr])$/i;

export function decodeShareToken(token: string): BinderConfig | null {
  const m = TOKEN_RE.exec(token);
  if (!m) return null;
  const [, set, rows, cols, mode, secrets, pb, mb, place, style] = m;
  return {
    set: set!,
    rows: Number.parseInt(rows!, 10),
    cols: Number.parseInt(cols!, 10),
    mode: mode!.toLowerCase() === "m" ? "master" : "standard",
    secrets: secrets === "1",
    pb: pb === "1",
    mb: mb === "1",
    place: place!.toLowerCase() === "e" ? "end" : "mix",
    style: style!.toLowerCase() === "r" ? "retro" : "clean",
  };
}
