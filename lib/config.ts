import { z } from "zod";

const gridDim = z.coerce.number().int().min(1).max(5);

const onOff = z
  .enum(["0", "1"])
  .transform((v) => v === "1")
  .catch(true);

const schema = z.object({
  set: z.string().regex(/^[a-z0-9.]*$/i).catch(""),
  // Default binder: 12 pockets — 3 rows × 4 columns (the common 12-pocket size).
  rows: gridDim.catch(3),
  cols: gridDim.catch(4),
  mode: z.enum(["standard", "master"]).catch("standard"),
  secrets: onOff,
  /** Poké Ball / Master Ball / Energy pattern mirror runs (only meaningful for pattern sets). */
  pb: onOff,
  mb: onOff,
  ep: onOff,
  /** Parallel placement: interleaved beside each card, or grouped at the end. */
  place: z.enum(["mix", "end"]).catch("mix"),
  style: z.enum(["clean", "retro"]).catch("clean"),
});

export type BinderConfig = z.infer<typeof schema>;

export const DEFAULT_CONFIG: BinderConfig = {
  set: "",
  rows: 3,
  cols: 4,
  mode: "standard",
  secrets: true,
  pb: true,
  mb: true,
  ep: true,
  place: "mix",
  style: "clean",
};

type RawParams = Record<string, string | string[] | undefined>;

/** Lenient parse: every invalid field falls back to its default. */
export function parseConfig(params: RawParams): BinderConfig {
  const first: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(params)) {
    first[k] = Array.isArray(v) ? v[0] : v;
  }
  return schema.parse(first);
}

/** Serializes omitting defaults, so shared URLs stay short. */
export function serializeConfig(config: BinderConfig): URLSearchParams {
  const qs = new URLSearchParams();
  if (config.set) qs.set("set", config.set);
  if (config.rows !== DEFAULT_CONFIG.rows) qs.set("rows", String(config.rows));
  if (config.cols !== DEFAULT_CONFIG.cols) qs.set("cols", String(config.cols));
  if (config.mode !== DEFAULT_CONFIG.mode) qs.set("mode", config.mode);
  if (config.secrets !== DEFAULT_CONFIG.secrets) qs.set("secrets", config.secrets ? "1" : "0");
  if (config.pb !== DEFAULT_CONFIG.pb) qs.set("pb", config.pb ? "1" : "0");
  if (config.mb !== DEFAULT_CONFIG.mb) qs.set("mb", config.mb ? "1" : "0");
  if (config.ep !== DEFAULT_CONFIG.ep) qs.set("ep", config.ep ? "1" : "0");
  if (config.place !== DEFAULT_CONFIG.place) qs.set("place", config.place);
  if (config.style !== DEFAULT_CONFIG.style) qs.set("style", config.style);
  return qs;
}

/** Pocket-count presets matching common binder sizes; CUSTOM reveals steppers. */
export const POCKET_PRESETS = [
  { label: "4 PKT", pockets: 4, rows: 2, cols: 2 },
  { label: "9 PKT", pockets: 9, rows: 3, cols: 3 },
  { label: "12 PKT", pockets: 12, rows: 3, cols: 4 },
  { label: "16 PKT", pockets: 16, rows: 4, cols: 4 },
] as const;
