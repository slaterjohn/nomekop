export type ThemeId =
  | "dmg"
  | "pocket"
  | "kanto-red"
  | "cerulean"
  | "lavender"
  | "flame"
  | "gold"
  | "high-contrast";

export type Theme = {
  id: ThemeId;
  label: string;
  /**
   * Four shades, dark → light, mirroring the 4-tone Game Boy LCD.
   * Roles: [0] ink (all text, focus), [1] muted (large text/borders only),
   * [2] accent (fills; ink text allowed on top), [3] bg.
   * test/unit/contrast.test.ts enforces WCAG AA pairings for every theme.
   */
  shades: [string, string, string, string];
  /**
   * Dark-mode palette (Settings → Appearance → Dark / System). Same role order
   * as `shades` (ink, muted, accent, bg) but tuned for a dark surface. Mirrored
   * in app/globals.css under [data-color-scheme="dark"][data-theme="…"] — keep
   * the two in sync. test/unit/contrast.test.ts gates these to the same WCAG AA.
   */
  darkShades: [string, string, string, string];
};

export const THEMES: Theme[] = [
  {
    id: "dmg",
    label: "GAME BOY",
    shades: ["#0f380f", "#306230", "#8bac0f", "#9bbc0f"],
    darkShades: ["#edefe6", "#8d9a5b", "#30351d", "#14160e"],
  },
  {
    id: "pocket",
    label: "POCKET",
    shades: ["#000000", "#555555", "#aaaaaa", "#e8e8e8"],
    darkShades: ["#ebebeb", "#7a7a7a", "#292929", "#121212"],
  },
  {
    id: "kanto-red",
    label: "KANTO RED",
    shades: ["#2d0a0a", "#7a1f1f", "#d98c8c", "#f3e3e3"],
    darkShades: ["#efe6e6", "#9a5b5b", "#351d1d", "#160e0e"],
  },
  {
    id: "cerulean",
    label: "CERULEAN",
    shades: ["#0a1a2d", "#1f4a7a", "#8cb4d9", "#e3edf3"],
    darkShades: ["#e6ebef", "#5b7c9a", "#1d2935", "#0e1216"],
  },
  {
    id: "lavender",
    label: "LAVENDER",
    shades: ["#1f0a2d", "#4a1f7a", "#b48cd9", "#ede3f3"],
    darkShades: ["#ebe6ef", "#7c5b9a", "#291d35", "#120e16"],
  },
  {
    id: "flame",
    label: "FLAME",
    shades: ["#2d1407", "#7a3d1f", "#d9a88c", "#f3e8e3"],
    darkShades: ["#efe9e6", "#9a725b", "#35251d", "#16110e"],
  },
  {
    id: "gold",
    label: "GOLD",
    shades: ["#2d2607", "#6e5a16", "#d9c47a", "#f3efe0"],
    darkShades: ["#efede6", "#9a8c5b", "#35301d", "#16140e"],
  },
  {
    id: "high-contrast",
    label: "HI-CONTRAST",
    shades: ["#000000", "#333333", "#cccccc", "#ffffff"],
    darkShades: ["#ffffff", "#cccccc", "#333333", "#000000"],
  },
];

export const DEFAULT_THEME: ThemeId = "gold";

export const THEME_STORAGE_KEY = "bindermon:v1:theme";

/** "Reduce animation" preference key. Lives here (a server-safe module, not the
 *  "use client" lib/motion) so the pre-paint ThemeScript can read it — a server
 *  component only gets `undefined` for values imported from a client module. */
export const MOTION_STORAGE_KEY = "bindermon:v1:motion";

/** Font-type preference key. "pixel" (default) | "mono" | "sans". Server-safe
 *  (lives here, not in "use client" lib/font) so the pre-paint ThemeScript can
 *  read it and set data-font before first paint. */
export const FONT_STORAGE_KEY = "bindermon:v1:font";

/** Text-size preset key. "0" (100%, default) | "1" (112%) | "2" (125%) |
 *  "3" (140%). Applied as data-font-size on <html>; CSS zoom scales the px-based
 *  UI. Server-safe for the pre-paint script. */
export const FONT_SIZE_STORAGE_KEY = "bindermon:v1:fontSize";

/** Colour-scheme PREFERENCE key. "system" (default) | "light" | "dark". The
 *  stored value is the preference; the RESOLVED light|dark is applied as
 *  data-color-scheme. Server-safe for the pre-paint script. */
export const COLOR_SCHEME_STORAGE_KEY = "bindermon:v1:colorScheme";

/** Boot-splash "shown this session" flag. sessionStorage (per session, not
 *  forever), read by the pre-paint SplashScript so the splash shows once per
 *  session and never replays on the app's full-page-reload navigations. */
export const SPLASH_SESSION_KEY = "bindermon:v1:splashSeen";

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && THEMES.some((t) => t.id === value);
}
