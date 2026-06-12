/**
 * Next.js server-boot hook: starts the daily TCG cache refresher.
 * (next dev / next start, Node runtime only.)
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { scheduleDailyRefresh } = await import("@/lib/tcg/refresh");
    scheduleDailyRefresh();
  }
}
