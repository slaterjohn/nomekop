import {
  COLOR_SCHEME_STORAGE_KEY,
  DEFAULT_THEME,
  FONT_SIZE_STORAGE_KEY,
  FONT_STORAGE_KEY,
  MOTION_STORAGE_KEY,
  THEME_STORAGE_KEY,
  THEMES,
} from "@/lib/themes";

/**
 * Inline, render-blocking script that applies every persisted appearance pref —
 * theme, reduce-animation, font type, text size, and colour scheme — before
 * first paint, so none of them ever flash. Runs pre-hydration; must stay
 * dependency-free and tiny (a single try/catch IIFE, raw localStorage).
 */
export function ThemeScript() {
  const ids = JSON.stringify(THEMES.map((t) => t.id));
  const code = `(function(){var d=document.documentElement;try{var t=localStorage.getItem(${JSON.stringify(
    THEME_STORAGE_KEY,
  )});if(${ids}.indexOf(t)===-1){t=${JSON.stringify(
    DEFAULT_THEME,
  )}}d.dataset.theme=t;if(localStorage.getItem(${JSON.stringify(
    MOTION_STORAGE_KEY,
  )})==="1"){d.dataset.reduceMotion="1"}var f=localStorage.getItem(${JSON.stringify(
    FONT_STORAGE_KEY,
  )});d.dataset.font=(f==="mono"||f==="sans")?f:"pixel";var s=localStorage.getItem(${JSON.stringify(
    FONT_SIZE_STORAGE_KEY,
  )});d.dataset.fontSize=(s==="1"||s==="2"||s==="3")?s:"0";var c=localStorage.getItem(${JSON.stringify(
    COLOR_SCHEME_STORAGE_KEY,
  )});d.dataset.colorScheme=(c==="dark"||(c!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches))?"dark":"light"}catch(e){d.dataset.theme=${JSON.stringify(
    DEFAULT_THEME,
  )}}})()`;
  return <script id="bindermon-theme" dangerouslySetInnerHTML={{ __html: code }} />;
}
