import { DEFAULT_THEME, THEME_STORAGE_KEY, THEMES } from "@/lib/themes";

/**
 * Inline, render-blocking script that applies the persisted theme before first
 * paint so a non-default palette never flashes. Runs pre-hydration; must stay
 * dependency-free and tiny.
 */
export function ThemeScript() {
  const ids = JSON.stringify(THEMES.map((t) => t.id));
  const code = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
    THEME_STORAGE_KEY,
  )});if(${ids}.indexOf(t)===-1){t=${JSON.stringify(DEFAULT_THEME)}}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme=${JSON.stringify(
    DEFAULT_THEME,
  )}}})()`;
  return <script id="bindermon-theme" dangerouslySetInnerHTML={{ __html: code }} />;
}
