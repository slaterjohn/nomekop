// Vitest stub: "server-only"/"client-only" are runtime guards that throw
// outside their context. In tests we treat them as no-ops so server modules
// (lib/tcg/tcgdex, pokemon-i18n, content/render…) can be imported.
export {};
