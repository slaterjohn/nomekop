// Environment-controlled feature toggles.
//
// These use the `NEXT_PUBLIC_` prefix so a single flag is visible to BOTH server
// and client code. Next.js inlines `NEXT_PUBLIC_*` references into the browser
// bundle at build time (see node_modules/next/dist/docs/01-app/02-guides/
// environment-variables.md), which means:
//   - every access must be a *static* `process.env.NEXT_PUBLIC_…` literal — a
//     dynamic/computed key (e.g. `process.env[name]`) is NOT inlined; and
//   - the browser value is frozen at build time, so set the flag the same at
//     build and runtime to keep server and client in agreement.

/**
 * Pokémon cards in non-English languages — the binder language pickers, the
 * Pokédex whole-binder language swap, the `/sets` language overlay, the
 * `/lset/<lang>/<id>` localized-set route, and all the TCGdex-backed data
 * behind them. Hidden by default; set `NEXT_PUBLIC_CARD_LANGUAGES=1` to enable.
 *
 * This is deliberately separate from app *interface* localisation (translating
 * the UI chrome itself — see `lib/i18n`), which stays on regardless of this flag.
 */
export function cardLanguagesEnabled(): boolean {
  return process.env.NEXT_PUBLIC_CARD_LANGUAGES === "1";
}
