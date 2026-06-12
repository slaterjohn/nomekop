/**
 * Next.js server-boot hook: starts the nightly TCG cache manager.
 * (next dev / next start, Node runtime only.)
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { scheduleNightlyRefresh } = await import("@/lib/tcg/cache-manager");
    scheduleNightlyRefresh();
  }
}
