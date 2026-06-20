// English is the source of truth: its shape (`Dictionary`) is what every other
// language must implement. Keep values UI-length and proper nouns intact
// (NOMEKOP, Pokémon, Pokédex, Vault X, TCGdex are never translated). {tokens}
// are filled at runtime via lib/i18n/format — keep them exactly.

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
    faqs: "Set FAQs",
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
    font: "Font",
    fontPixel: "Pixel",
    fontMono: "Mono",
    fontSans: "Sans",
    soundMotion: "Sound & motion",
    sound: "Sound",
    reduceAnimation: "Reduce animation",
    privacy: "Privacy",
    cookies: "Analytics cookies",
  },
  common: {
    restore: "Restore",
    dismiss: "Dismiss",
    resetPicks: "Reset picks",
    previousPage: "Previous page",
    nextPage: "Next page",
    compareBinders: "Compare all binders",
    skipToContent: "Skip to content",
    popular: "Popular",
    back: "Back",
  },
  home: {
    heroTitle: "Build the perfect binder",
    tagline: "Pokémon TCG binder maker",
    tilesHeading: "Choose your binder",
  },
  binder: {
    options: "Binder options",
    preview: "Preview",
    printDownload: "Print & download",
    getBinder: "Get a binder",
    binderSize: "Binder size",
    language: "Language",
    custom: "Custom",
    rows: "Rows",
    cols: "Cols",
    pocketsToPages: "{slots} pockets → {pages} pages",
    pageOf: "Page {page} of {total}",
    languageNote: "Non-English cards come from TCGdex and have no prices.",
    // Cards-to-include menu (Pokémon binder)
    cardsToInclude: "Cards to include",
    allPrints: "All prints",
    allPrintsHint: "every appearance ({count})",
    secretsOnly: "Secrets only",
    secretsHint: "secret rares only ({count})",
    rarestPerSet: "Rarest per set",
    rarestHint: "one chase card per set",
    // Order menu
    order: "Binder order",
    newestFirst: "Newest first",
    newestHint: "latest sets up front",
    oldestFirst: "Oldest first",
    oldestHint: "vintage leads",
    // Print & download
    binderPdf: "Binder PDF",
    placeholdersPdf: "Placeholders PDF",
    // Get-a-binder shelf
    shelfExact: "Your {pockets}-pocket layout matches these binders — you’ll need {pages} pages.",
    shelfNearest:
      "No off-the-shelf {pockets}-pocket binder exists; the closest size is shown below.",
    affiliateYes: "Links may earn Nomekop a small commission at no cost to you. ",
    affiliateNo: "Nomekop is not affiliated with Vault X; links are plain searches. ",
    // Binder page headings (one Pokémon / one illustrator)
    heading: "{name} binder",
    inLanguages: "in {count} languages",
    pokemonSubline: "Every {name} print across {sets} sets — {cards} cards found{langs}.",
    illustratorSubline: "Every card by {name} across {sets} sets — {cards} cards found{langs}.",
  },
  setDetail: {
    cardsLine: "{series} · {year} · {printed} printed / {total} total cards",
    binderLayouts: "Binder layouts",
    standardSet: "Standard set",
    masterSet: "Master set",
    binderFit: "Binder fit by size",
    recommended: "Recommended",
    openInBuilder: "Open in binder builder",
    masterSetLayout: "Master set layout",
  },
  builder: {
    configure: "Configure binder",
    findBinder: "Find the right binder",
  },
  binders: {
    title: "Binders",
    intro:
      "NOMEKOP lays out your collection; a good binder holds it. Here's the Vault X lineup by pocket size — more pockets per page means fewer pages and a denser display, fewer pockets means bigger, easier-to-read cards.",
    buildingPrompt:
      "Building a layout? Pick a set or a Pokédex and each result recommends the binder that fits.",
    holdsPages: "{line} · holds {pages} pages · around {price}",
    priceFootnote:
      "Prices are RRP guidance, not live — check the retailer. A 9-pocket zip binder is the safe default for most collections; size up to 12 or 16 pockets to fit a master set in one book.",
    catalogYes: "Some links may earn Nomekop a small commission at no cost to you.",
    catalogNo: "Nomekop is not affiliated with these brands; links are plain searches.",
  },
  sets: {
    title: "All sets",
    intro:
      "{count} Pokémon TCG expansions across {series} series — pick one for its card list, binder page counts and printables.",
    biggestLink: "See the biggest sets by card count ▶",
    showInLanguage: "Show sets in",
    overlayNote:
      "Showing {language} sets from TCGdex. A {code} badge marks an English set that also exists in {language}; translated names sit beside their English entry; {language}-only sets are listed at the end. No prices for non-English cards.",
    exclusiveHeading: "{language}-only sets",
    exclusiveNote: "{count} sets released only in {language} — no English edition.",
    cards: "{count} cards",
    cardsLine: "{year} · {printed}/{total} cards",
  },
  pokedexLanding: {
    title: "Pokédex binders",
    intro:
      "One pocket per Pokémon in National Dex order. Each pocket defaults to that Pokémon's secret card — or its rarest print — and you can swap any pick. Your choices are saved and the link stays shareable.",
    chooseGeneration: "Choose a generation",
  },
  pokedex: {
    savedPicks: "Found {count} saved picks for this Pokédex.",
    stats: "{count} Pokémon → {pages} pages · {withCards}/{count} have cards",
    customPicks: " · {count} custom picks",
    help: "Pockets default to each Pokémon's secret card, then its rarest print. Click any pocket to swap the card — your picks are saved and live in this page's URL.",
    swapTitle: "#{dex} — pick a card",
    printsAvailable: "{count} prints available · rarest first",
    secret: "secret",
  },
  pokemonLanding: {
    title: "Pokémon binders",
    intro:
      "One Pokémon, every card it has ever appeared on — across every set. Filter to secrets or the rarest print per set, order by release date, then print it.",
    factLink: "Which Pokémon appears on the most cards? ▶",
    chooseHeading: "Choose your Pokémon",
    nameLabel: "Pokémon name",
    placeholder: "e.g. Charizard",
    build: "Build binder",
  },
  illustratorLanding: {
    title: "Illustrator binders",
    intro:
      "One artist, every card they have ever drawn — across every set. Order by release date, then print the whole gallery.",
    factLink: "Who are the most prolific illustrators? ▶",
    chooseHeading: "Choose your illustrator",
    nameLabel: "Illustrator name",
    placeholder: "e.g. Ken Sugimori",
    build: "Build binder",
  },
  facts: {
    title: "Fun facts",
    intro:
      "Bite-sized Pokémon TCG trivia, straight from the card database that powers NOMEKOP. Every figure is real — and every answer is also available as Markdown for your favourite AI.",
  },
  legal: {
    title: "Legal & credits",
  },
  audio: {
    musicPlay: "Play background music",
    musicStop: "Stop background music",
    splashSkip: "Skip",
  },
  consent: {
    message:
      "Cookies for anonymous analytics — they help us improve Nomekop. No ads, no selling your data.",
    allow: "Allow",
    deny: "Deny",
    close: "Close",
    label: "Cookie consent",
  },
};

// English is the source of truth: its shape (keys) is the contract every other
// language implements. Values are plain strings (no `as const`) so translations
// are assignable.
export type Dictionary = typeof en;
