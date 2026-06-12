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
};

export const THEMES: Theme[] = [
  { id: "dmg", label: "GAME BOY", shades: ["#0f380f", "#306230", "#8bac0f", "#9bbc0f"] },
  { id: "pocket", label: "POCKET", shades: ["#000000", "#555555", "#aaaaaa", "#e8e8e8"] },
  { id: "kanto-red", label: "KANTO RED", shades: ["#2d0a0a", "#7a1f1f", "#d98c8c", "#f3e3e3"] },
  { id: "cerulean", label: "CERULEAN", shades: ["#0a1a2d", "#1f4a7a", "#8cb4d9", "#e3edf3"] },
  { id: "lavender", label: "LAVENDER", shades: ["#1f0a2d", "#4a1f7a", "#b48cd9", "#ede3f3"] },
  { id: "flame", label: "FLAME", shades: ["#2d1407", "#7a3d1f", "#d9a88c", "#f3e8e3"] },
  { id: "gold", label: "GOLD", shades: ["#2d2607", "#6e5a16", "#d9c47a", "#f3efe0"] },
  {
    id: "high-contrast",
    label: "HI-CONTRAST",
    shades: ["#000000", "#333333", "#cccccc", "#ffffff"],
  },
];

export const DEFAULT_THEME: ThemeId = "dmg";

export const THEME_STORAGE_KEY = "bindermon:v1:theme";

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && THEMES.some((t) => t.id === value);
}
