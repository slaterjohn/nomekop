// English is the source of truth: its shape (`Dictionary`) is what every other
// language must implement. Keep values UI-length and proper nouns intact
// (NOMEKOP, Pokémon, Pokédex, Vault X are never translated).

export const en = {
  nav: {
    sets: "Sets",
    pokemon: "Pokémon",
    pokedex: "Pokédex",
    art: "Art",
    binders: "Binders",
  },
  footer: {
    label: "Footer",
    setBinders: "Set binders",
    pokemon: "Pokémon",
    pokedex: "Pokédex",
    illustrators: "Illustrators",
    allSets: "All sets",
    funFacts: "Fun facts",
    legal: "Legal & credits",
    disclaimer: "NOMEKOP · A fan-made tool · Not affiliated with Nintendo / The Pokémon Company",
  },
  settings: {
    open: "Settings",
    close: "Close settings",
    title: "Settings",
    description: "Make it yours — language, palette, sound, and motion. Saved to this browser.",
    language: "Language",
    palette: "Palette",
    soundMotion: "Sound & motion",
    sound: "Sound",
    reduceAnimation: "Reduce animation",
  },
  binder: {
    options: "Binder options",
    preview: "Preview",
    printDownload: "Print & download",
    getBinder: "Get a binder",
    binderSize: "Binder size",
    language: "Language",
    order: "Binder order",
    newestFirst: "Newest first",
    oldestFirst: "Oldest first",
    custom: "Custom",
    rows: "Rows",
    cols: "Cols",
    pocketsToPages: "{slots} pockets → {pages} pages",
    languageNote: "Non-English cards come from TCGdex and have no prices.",
    page: "Page {page} of {total}",
    pickACard: "pick a card",
    noPrices: "no prices",
  },
  common: {
    restore: "Restore",
    dismiss: "Dismiss",
    resetPicks: "Reset picks",
    previousPage: "Previous page",
    nextPage: "Next page",
    compareBinders: "Compare all binders",
    skipToContent: "Skip to content",
  },
  home: {
    heroTitle: "Build the perfect binder",
    tagline: "Pokémon TCG binder maker",
    tilesHeading: "Choose your binder",
  },
  binders: {
    title: "Binders",
    intro:
      "NOMEKOP lays out your collection; a good binder holds it. Here's the Vault X lineup by pocket size — more pockets per page means fewer pages and a denser display, fewer pockets means bigger, easier-to-read cards.",
  },
};

// English is the source of truth: its shape (keys) is the contract every other
// language implements. Values are plain strings so translations are assignable.
export type Dictionary = typeof en;
