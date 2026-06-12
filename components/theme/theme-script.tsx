import { DEFAULT_THEME, THEME_STORAGE_KEY, THEMES } from "@/lib/themes";
import { MOTION_STORAGE_KEY } from "@/lib/motion";

/**
 * Inline, render-blocking script that applies the persisted theme — and the
 * "reduce animation" preference — before first paint, so neither a non-default
 * palette nor an unwanted animation ever flashes. Runs pre-hydration; must stay
 * dependency-free and tiny.
 */
export function ThemeScript() {
  const ids = JSON.stringify(THEMES.map((t) => t.id));
  const code = `(function(){var d=document.documentElement;try{var t=localStorage.getItem(${JSON.stringify(
    THEME_STORAGE_KEY,
  )});if(${ids}.indexOf(t)===-1){t=${JSON.stringify(
    DEFAULT_THEME,
  )}}d.dataset.theme=t;if(localStorage.getItem(${JSON.stringify(
    MOTION_STORAGE_KEY,
  )})==="1"){d.dataset.reduceMotion="1"}}catch(e){d.dataset.theme=${JSON.stringify(
    DEFAULT_THEME,
  )}}})()`;
  return <script id="bindermon-theme" dangerouslySetInnerHTML={{ __html: code }} />;
}
