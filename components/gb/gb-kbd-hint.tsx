/**
 * The Game Boy button legend. Decorative duplication of real semantics
 * (everything it describes is independently announced), so aria-hidden;
 * hidden entirely on touch-only devices.
 */
export function GbKbdHint() {
  return (
    <div
      aria-hidden="true"
      className="hidden border-t-4 border-gb-ink bg-gb-bg px-4 py-2 text-center font-pixel text-[9px] tracking-wide [@media(hover:hover)]:block"
    >
      ▲▼ NAVIGATE · ENTER SELECT · SPACE TICK · ◀▶ FLIP PAGES · TAB MOVE ON
    </div>
  );
}
