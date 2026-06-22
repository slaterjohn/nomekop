/**
 * Home-page intro + FAQ copy. Plain data with no client directive so it can be
 * server-rendered by the FAQ section and reused verbatim for FAQPage JSON-LD.
 */

export type FaqEntry = { question: string; answer: string };

/** ~70-word plain-text intro rendered above the FAQ. */
export const APP_INTRO: string =
  "Nomekop plans Pokemon TCG binder layouts in the browser. Pick any expansion, " +
  "choose a 4, 9, 12 or 16-pocket binder, and see exactly which card goes in which " +
  "pocket, page by page. It handles master sets — reverse holos plus Poké Ball and " +
  "Master Ball patterns — prints A4 layout sheets, checklists and cut-out " +
  "placeholders, tracks which cards you own, and shows current TCGplayer market " +
  "prices. Built for collectors who sleeve full sets, not just chase cards.";

export const FAQ_ENTRIES: FaqEntry[] = [
  {
    question: "What is a Pokemon master set?",
    answer:
      "A master set is every card in an expansion plus all of its parallel printings: " +
      "each card's regular print, its reverse holo, and in sets like Prismatic " +
      "Evolutions the Poké Ball and Master Ball patterns too. A standard set is just " +
      "one copy of each card. Master sets need roughly twice the pockets, so " +
      "Nomekop has a dedicated master-set mode that lays out every variant for you.",
  },
  {
    question: "What are reverse holo cards?",
    answer:
      "Reverse holos flip the usual foil treatment: the card body is foiled while the " +
      "artwork stays matte — the opposite of a standard holofoil. Most commons, " +
      "uncommons and rares have had a reverse holo version since Legendary Collection " +
      "introduced them in 2002. Master-set collectors usually slot the reverse holo " +
      "directly beside the regular print, which is how Nomekop's master mode " +
      "arranges them.",
  },
  {
    question: "What are Poké Ball and Master Ball pattern cards?",
    answer:
      "They are special foil mirrors stamped with a repeating Poké Ball or Master " +
      "Ball design, introduced with Prismatic Evolutions and used again in Black Bolt " +
      "and White Flare. The Poké Ball pattern covers roughly the same pool of cards " +
      "as the reverse holos, while the rarer Master Ball pattern appears only on " +
      "Pokémon. Nomekop's master mode has a toggle for each run and can interleave " +
      "the patterns beside their cards or group them at the end of the binder.",
  },
  {
    question: "What size binder do I need for a full set?",
    answer:
      "Divide the card count by the pockets per page: a 198-card set in a 12-pocket " +
      "binder fills 16.5 page sides, so you need 17; the same set in a 9-pocket " +
      "binder needs 22. A master set with reverse holos roughly doubles that. Binders " +
      "commonly come in 4, 9, 12 and 16-pocket sizes, and Nomekop computes the " +
      "exact page count for any set, mode and pocket size before you buy.",
  },
  {
    question: "How do I print binder page layouts?",
    answer:
      "Nomekop renders your layout as A4 sheets with one binder page per sheet and " +
      "10mm margins, so each grid stays readable. Download the whole run as a PDF or " +
      "print it straight from the browser. Set checklists and cut-out pocket " +
      "placeholders — slips you keep in empty pockets until you pull the card — " +
      "print the same way.",
  },
  {
    question: "Where do card prices come from?",
    answer:
      "Prices are TCGplayer market data delivered through the Pokemon TCG API, and " +
      "Nomekop refreshes them at least every 12 hours. Treat them as a guide to " +
      "current market value rather than a quote. Very new sets can show cards " +
      "without prices until TCGplayer lists them.",
  },
  {
    question: "Can I install Nomekop on my phone or desktop?",
    answer:
      "Yes — Nomekop is a progressive web app, so you can add it to your home " +
      "screen and run it in its own window with no browser bar. On iPhone or iPad, " +
      "open it in Safari, tap Share, then \"Add to Home Screen\". On Android Chrome " +
      "or desktop Chrome and Edge, use \"Install app\" from the browser menu or the " +
      "install icon in the address bar. Installed, it launches like an app and even " +
      "opens offline. The collections you track are stored on your own device, so " +
      "they stay put — there's no account and nothing is uploaded.",
  },
];
