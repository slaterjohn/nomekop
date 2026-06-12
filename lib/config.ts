import { z } from "zod";

const gridDim = z.coerce.number().int().min(1).max(5);

const schema = z.object({
  set: z.string().regex(/^[a-z0-9.]*$/i).catch(""),
  rows: gridDim.catch(3),
  cols: gridDim.catch(3),
  mode: z.enum(["standard", "master"]).catch("standard"),
  secrets: z
    .enum(["0", "1"])
    .transform((v) => v === "1")
    .catch(true),
  style: z.enum(["clean", "retro"]).catch("clean"),
});

export type BinderConfig = z.infer<typeof schema>;

export const DEFAULT_CONFIG: BinderConfig = {
  set: "",
  rows: 3,
  cols: 3,
  mode: "standard",
  secrets: true,
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
  if (config.style !== DEFAULT_CONFIG.style) qs.set("style", config.style);
  return qs;
}

export const LAYOUT_PRESETS = [
  { label: "2×2", rows: 2, cols: 2 },
  { label: "3×3", rows: 3, cols: 3 },
  { label: "4×3", rows: 4, cols: 3 },
  { label: "4×4", rows: 4, cols: 4 },
] as const;
