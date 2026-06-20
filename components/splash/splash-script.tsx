import { SPLASH_SESSION_KEY } from "@/lib/themes";

/**
 * Inline, render-blocking script that decides — before first paint — whether
 * the boot splash should show this load. The splash is SSR-rendered visible on
 * every load; the app navigates via full page reloads for many links, so
 * without this it would replay on each navigation.
 *
 * On the first load of a session it sets the sessionStorage flag (and leaves
 * the splash to show). On every later load it finds the flag and marks
 * `<html data-splash-seen>`, which CSS uses to hide the overlay pre-paint (no
 * flash) and which SplashScreen reads to skip the jingle/timer. Pre-hydration,
 * dependency-free, tiny — same pattern as ThemeScript.
 */
export function SplashScript() {
  const key = JSON.stringify(SPLASH_SESSION_KEY);
  const code = `(function(){try{if(sessionStorage.getItem(${key})){document.documentElement.dataset.splashSeen="1"}else{sessionStorage.setItem(${key},"1")}}catch(e){}})()`;
  return <script id="bindermon-splash" dangerouslySetInnerHTML={{ __html: code }} />;
}
