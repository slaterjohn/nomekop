// HAND-AUTHORED FAQ content for Pokémon TCG sets the generator can't reach.
//
// The released-set FAQs are computed from the cache DB (see registry.ts). A set
// only lands in that DB once pokemontcg.io publishes its cards, so there's
// always a gap — often months — where a set is announced, or even already on
// shelves, and we still have no card data for it. These pages cover that gap:
// written from verified official reveals + TCG news, stamped with the date the
// copy was last checked, and honest about what isn't known rather than guessing.
// Every page links its sources (E-E-A-T).
//
// Two lifecycle stages live here, and `releaseDate` vs `checkedOn` decides which
// standing note a page carries (see `footer()`):
//   - announced, not out yet     → "pre-release, details can still change"
//   - out, but not in the cache  → "released; figures are from the announcements"
//
// HAND-OFF: once a set enters the cache DB and `scripts/build-faqs.mjs` is
// re-run, the data-driven templates cover it. registry.ts dedupes by slug (the
// hand-authored page wins) so nothing ever breaks; prune the entry here when the
// live data beats the hand-written copy.
//
// Two things that pruning taught us, when Pitch Black made the trip in August
// 2026 — budget for both before deleting a block:
//
//  1. The dedupe only bites on slugs matching the template scheme in slug.ts.
//     Anything else — a slug that predates the scheme, or a question no template
//     asks — is an indexed URL with no successor, and deleting it 404s. Pitch
//     Black left six behind. They are redirected in next.config.ts; send yours
//     to the closest surviving page, or to the set's `/faqs/set/<id>` hub.
//  2. Templates only answer what card data can answer. Set identity, sub-themes,
//     Build & Battle promos and product line-ups have no data-driven twin, so
//     that copy is retired rather than replaced. That is a content call, not a
//     mechanical one — make it deliberately.
//
// NOTHING IN THIS FILE READS THE CLOCK. It exposes `hasReleased(set, today)`
// and leaves "now" to registry.ts, which reads it per request — see the
// "WHERE NOW COMES FROM" note there. Release-driven expiry (dropping a set from
// "coming soon" once its date passes) is that file's job, not this one's.

import type { FaqPage } from "@/lib/content/faqs/types";

export type UpcomingSource = { label: string; url: string };

export type AnnouncedSet = {
  /** Synthetic id used for grouping (never a real /set/[id]). */
  id: string;
  /** Full official set name. */
  name: string;
  /** Short name used in slugs and headings. */
  shortName: string;
  /** URL slug stem. */
  slug: string;
  /** Era/series the set belongs to — groups it on the FAQ index (see eras.ts). */
  era: string;
  /**
   * Machine-readable release date, ISO `YYYY-MM-DD`. This is the field the
   * auto-expiry in registry.ts compares against today; `releaseLabel` is
   * display prose and is never parsed. Keep the two in step.
   */
  releaseDate: string;
  /** Human release label, e.g. "July 17, 2026". */
  releaseLabel: string;
  /**
   * ISO date this set's copy was last checked against its sources. Purely a
   * content stamp: it dates the "as of …" line and, compared with
   * `releaseDate`, picks the standing note in `footer()`. Bump it whenever you
   * revise the set's pages.
   */
  checkedOn: string;
  /** Canonical sources, surfaced on every page of the set. */
  sources: UpcomingSource[];
};

/**
 * Every set with hand-authored pages, soonest release first. Some entries may
 * already have released — that's the point of `releaseDate`. Call
 * `upcomingFaqSets()` (registry.ts) for the subset that's still to come.
 */
export const ANNOUNCED_SETS: AnnouncedSet[] = [
  {
    id: "upcoming-30th-celebration",
    name: "Pokémon TCG: 30th Celebration",
    shortName: "30th Celebration",
    slug: "30th-celebration",
    era: "Mega Evolution",
    releaseDate: "2026-09-16",
    releaseLabel: "September 16, 2026",
    checkedOn: "2026-09-21",
    sources: [
      { label: "Pokemon.com — 30th Celebration Expansion Is Available Now", url: "https://www.pokemon.com/us/news/the-pokemon-tcg-30th-celebration-expansion-is-available-now" },
      { label: "Pokemon.com — Ultra-Premium Collections—Day & Night", url: "https://www.pokemon.com/us/pokemon-tcg/product-gallery/30th-celebration-ultra-premium-collections-day-night" },
      { label: "Pokemon.com — Battle Deck: Espeon ex / Umbreon ex", url: "https://www.pokemon.com/us/pokemon-tcg/product-gallery/30th-celebration-battle-deck-espeon-ex-and-30th-celebration-battle-deck-umbreon-ex" },
      { label: "PokéGuardian — M6a reveal", url: "https://www.pokeguardian.com/3203041_mega-expansion-pack-30th-celebration-revealed" },
      { label: "PokéGuardian — 30th Celebration set revealed", url: "https://www.pokeguardian.com/3203075_pokemon-tcg-30th-celebration-set-revealed" },
      { label: "Bulbapedia — Espeon ex (30th Celebration 70)", url: "https://bulbapedia.bulbagarden.net/wiki/Espeon_ex_(30th_Celebration_70)" },
      { label: "Bulbapedia — Umbreon ex (30th Celebration 92)", url: "https://bulbapedia.bulbagarden.net/wiki/Umbreon_ex_(30th_Celebration_92)" },
      { label: "Bulbapedia — Premium Deck Set: Espeon & Umbreon (Japan-exclusive)", url: "https://bulbapedia.bulbagarden.net/wiki/30th_Celebration_Premium_Deck_Set_Espeon_%26_Umbreon_(TCG)" },
    ],
  },
  {
    id: "upcoming-delta-reign",
    name: "Pokémon TCG: Mega Evolution — Delta Reign",
    shortName: "Delta Reign",
    slug: "delta-reign",
    era: "Mega Evolution",
    releaseDate: "2026-11-06",
    releaseLabel: "November 6, 2026",
    checkedOn: "2026-09-21",
    sources: [
      { label: "Pokemon.com — Delta Reign Expansion Arrives November 6, 2026", url: "https://www.pokemon.com/us/news/the-pokemon-tcg-mega-evolution-delta-reign-expansion-arrives-november-6-2026" },
      { label: "PokéBeach — Delta Reign officially revealed, full product lineup", url: "https://www.pokebeach.com/2026/08/delta-reign-tcg-set-officially-revealed-for-november-full-product-lineup" },
      { label: "PokéGuardian — Delta Reign tease", url: "https://www.pokeguardian.com/3231721_pokemon-tcg-mega-evolution-delta-reign-teased-november-release" },
      { label: "PokéBeach — official tease", url: "https://www.pokebeach.com/2026/06/storm-emeralda-and-delta-reign-tcg-sets-officially-teased-along-with-pockets-ruler-of-the-skies" },
      { label: "Bulbapedia — Delta Reign (TCG)", url: "https://bulbapedia.bulbagarden.net/wiki/Delta_Reign_(TCG)" },
      { label: "Bulbapedia — Storm Emeralda (TCG)", url: "https://bulbapedia.bulbagarden.net/wiki/Storm_Emeralda_(TCG)" },
      { label: "PokéGuardian — Storm Emeralda main set list", url: "https://www.pokeguardian.com/sets/set-lists/japanese-sets/3244371_m6-storm-emeralda-main-set-list" },
    ],
  },
];

const SET_BY_ID = new Map(ANNOUNCED_SETS.map((s) => [s.id, s]));

export function announcedSetById(id: string): AnnouncedSet | undefined {
  return SET_BY_ID.get(id);
}

/**
 * Strict id lookup for the page bindings below. The old code bound by array
 * index (`UPCOMING_SETS[0]!`), which meant deleting an entry silently re-pointed
 * every page under it at the wrong set — no type error, no test failure, just
 * Pitch Black's answers filed under 30th Celebration. Binding by id turns that
 * into a loud crash at module load.
 */
function announcedSet(id: string): AnnouncedSet {
  const set = SET_BY_ID.get(id);
  if (!set) throw new Error(`No announced set with id "${id}" — check ANNOUNCED_SETS.`);
  return set;
}

/** Today as an ISO date (`YYYY-MM-DD`) in UTC. UTC rather than local so the
 *  boundary is the same wherever the process happens to run. */
export function todayIso(now: number = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

/**
 * Has `set` reached its release date as of `today` (both ISO `YYYY-MM-DD`)?
 *
 * A set releasing TODAY counts as released. It's on shelves, so leaving it under
 * "coming soon" for the rest of the day would be wrong — and picking `<` instead
 * would make the copy ("isn't out yet") false for a full day every launch.
 */
export function hasReleased(set: AnnouncedSet, today: string): boolean {
  return set.releaseDate <= today;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-08-04" → "August 2026". Hand-rolled rather than Intl so the output
 *  can't drift with the runtime's locale or timezone. */
function monthLabel(iso: string): string {
  const [year, month] = iso.split("-");
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

/**
 * The standing note + Sources section appended to every page body.
 *
 * Which note runs is decided by two fixed dates on the set — when it releases
 * and when its copy was last checked — never by the clock. That matters: page
 * bodies are baked into statically rendered HTML, so a `Date.now()` here would
 * freeze whatever "today" was at build time and quietly go stale.
 */
function footer(set: AnnouncedSet): string {
  const links = set.sources.map((s) => `- [${s.label}](${s.url})`).join("\n");
  const asOf = monthLabel(set.checkedOn);
  const note = hasReleased(set, set.checkedOn)
    ? `> **Out now, data pending.** ${set.shortName} released on ${set.releaseLabel}. Our card database hasn't picked it up yet, so the figures here come from Pokémon's own announcements and the TCG press, checked ${asOf} — not from card-by-card data. Exact counts follow once the cards land.`
    : `> **Pre-release set.** ${set.shortName} isn't out yet — everything here is from official reveals and TCG news as of ${asOf}, and details can still change before launch. We'll swap in full card data once it releases.`;
  return ["", note, "", "## Sources", "", links].join("\n");
}

/** Assemble a hand-authored upcoming FAQ page. `sections` are the H2 blocks
 *  (already Markdown); the answer line + footer are added automatically. */
function page(
  set: AnnouncedSet,
  slug: string,
  question: string,
  title: string,
  description: string,
  sections: string,
  related: { href: string; label: string }[],
): FaqPage {
  return {
    slug,
    type: "upcoming",
    setId: set.id,
    question,
    title,
    description,
    body: [`**${description}**`, "", sections.trim(), footer(set)].join("\n"),
    related,
  };
}

const C30 = announcedSet("upcoming-30th-celebration");
const DR = announcedSet("upcoming-delta-reign");

const CELEBRATION_PAGES: FaqPage[] = [
  page(
    C30,
    "when-does-30th-celebration-come-out",
    "When does the 30th Celebration set come out?",
    "When does Pokémon 30th Celebration come out?",
    "Pokémon TCG: 30th Celebration released September 16, 2026 — the first-ever Pokémon TCG set to launch simultaneously worldwide, including Simplified Chinese.",
    [
      "## 30th Celebration release date",
      "",
      "**30th Celebration released on September 16, 2026.** It was a landmark date: Pokémon confirmed it as the **first-ever Pokémon TCG expansion to launch simultaneously worldwide** — every region, including Simplified Chinese, on the same day.",
      "",
      "## Was there a pre-release event?",
      "",
      "No. Because of the synchronized global launch, there was no traditional regional pre-release event (those usually stagger by region) — the set simply went on sale everywhere on the 16th.",
      "",
      "## More products are still to come",
      "",
      "The main booster release on September 16 wasn't the whole line-up. The **Battle Decks — Espeon ex and Umbreon ex** follow on October 30, 2026, and the **Ultra-Premium Collections — Day & Night** follow on November 6, 2026 — the same day as the Delta Reign expansion.",
      "",
      "## Why the date matters",
      "",
      "The set marks **30 years of the Pokémon Trading Card Game** (first released in Japan in October 1996), so The Pokémon Company treated it as a worldwide anniversary moment rather than a normal staggered set.",
    ].join("\n"),
    [
      { href: "what-is-30th-celebration", label: "What is 30th Celebration?" },
      { href: "what-are-the-30-pikachu-cards-in-30th-celebration", label: "The 30 Pikachu cards" },
      { href: "/faqs", label: "All set FAQs" },
    ],
  ),
  page(
    C30,
    "what-is-30th-celebration",
    "What is the Pokémon 30th Celebration set?",
    "What is the Pokémon 30th Celebration set?",
    "30th Celebration is an all-foil anniversary set released September 16, 2026, celebrating 30 years of the Pokémon TCG with classic reprints, a new Futuristic Rare rarity, and 30 unique Pikachu cards.",
    [
      "## A 30th-anniversary celebration set",
      "",
      "**30th Celebration** marks 30 years of the Pokémon TCG. Like *Celebrations* did for the 25th anniversary, it mixes **reprinted classic cards with brand-new ones** — but turns everything up to foil.",
      "",
      "## What makes it special",
      "",
      "- **Every card is foil** — including the Basic Energy. There are no non-foil commons.",
      "- A new **Futuristic Rare** rarity debuted with the set, led by Mewtwo ex and Mew ex from artist YOSHIROTTEN.",
      "- Every pack guarantees **1 of 30 unique Pikachu cards**, each illustrated by a different artist.",
      "- The **Classic Collection** reprints 30 cards spanning the TCG's history, from Base Set to the modern day, in a gold-bordered foil treatment.",
      "",
      "## Who's in it",
      "",
      "Confirmed Pokémon include **Espeon ex and Umbreon ex**, new **Sylveon ex** and **Greninja ex**, the **Mewtwo ex / Mew ex** Futuristic Rares, plus Lapras, Drifloon, Hisuian Zorua and Lycanroc.",
    ].join("\n"),
    [
      { href: "what-is-a-futuristic-rare", label: "What is a Futuristic Rare?" },
      { href: "what-are-the-30-pikachu-cards-in-30th-celebration", label: "The 30 Pikachu cards" },
      { href: "is-there-an-umbreon-card-in-30th-celebration", label: "Is Umbreon in the set?" },
    ],
  ),
  page(
    C30,
    "what-is-a-futuristic-rare",
    "What is a Futuristic Rare in Pokémon TCG?",
    "What is a Futuristic Rare? (30th Celebration)",
    "Futuristic Rare is a new Pokémon TCG rarity that debuted in 30th Celebration (Sept 2026) — Mewtwo ex (157/128) and Mew ex (158/128), both by artist YOSHIROTTEN.",
    [
      "## A new rarity for the 30th anniversary",
      "",
      "**Futuristic Rare** (abbreviated \"FUR\" on the Japanese cards) is a **new rarity tier** introduced with 30th Celebration. Pokémon describes them as cards \"featuring evocative new visuals\" — a fresh, modern art treatment created specially for the anniversary set.",
      "",
      "## The Futuristic Rares",
      "",
      "There are exactly two: **Mewtwo ex (157/128)** and **Mew ex (158/128)**, illustrated by guest artist **YOSHIROTTEN**. They're the last two cards in the set's main numbering, closing it out after the Illustration Rares and Special Illustration Rares.",
      "",
      "## How rare are they?",
      "",
      "Official pull rates haven't been published. As the set's top-tier rarity, closing out the numbering above the Illustration Rares and ex cards, they're among the hardest pulls in 30th Celebration.",
    ].join("\n"),
    [
      { href: "what-is-30th-celebration", label: "What is 30th Celebration?" },
      { href: "how-many-cards-in-30th-celebration", label: "How many cards in the set?" },
      { href: "where-to-preorder-30th-celebration", label: "Products & preorders" },
    ],
  ),
  page(
    C30,
    "what-are-the-30-pikachu-cards-in-30th-celebration",
    "What are the 30 Pikachu cards in 30th Celebration?",
    "The 30 Pikachu cards in 30th Celebration",
    "Every 30th Celebration booster pack guarantees 1 of 30 unique holographic Pikachu cards, each illustrated by a different artist — a 30-card subset celebrating 30 years of the TCG.",
    [
      "## 30 Pikachu, 30 artists",
      "",
      "The signature gimmick of 30th Celebration is its **30 unique Pikachu cards** — one for each year of the Pokémon TCG — with **each Pikachu illustrated by a different artist**. **Every booster pack guarantees one** of the 30, so a Pikachu is the one card you're certain to pull.",
      "",
      "## Which artists?",
      "",
      "Pokémon hasn't revealed the full 30-artist list yet. Names confirmed so far include **OKACHEKE, Yuu Nishida and Atsuko Nishida** (the original Pikachu illustrator). Expect a roster spanning the TCG's history.",
      "",
      "## Collecting all 30",
      "",
      "Because they're a guaranteed pull spread across 30 designs, completing the Pikachu subset is the natural collecting goal for this set — a perfect fit for a dedicated [Pikachu binder](/pokemon/pikachu~34an).",
    ].join("\n"),
    [
      { href: "/pokemon/pikachu~34an", label: "Build a Pikachu binder" },
      { href: "what-is-30th-celebration", label: "What is 30th Celebration?" },
      { href: "what-is-a-futuristic-rare", label: "What is a Futuristic Rare?" },
    ],
  ),
  page(
    C30,
    "is-there-an-umbreon-card-in-30th-celebration",
    "Is there an Umbreon card in 30th Celebration?",
    "Is there an Umbreon card in 30th Celebration?",
    "Yes — Umbreon ex (092/128) is a Double Rare in the main 30th Celebration set, alongside Espeon ex (070/128). Both also get their own English Battle Deck and feature in the Ultra-Premium Collections — Day & Night.",
    [
      "## Yes — Umbreon is in 30th Celebration",
      "",
      "**Umbreon ex** is confirmed for 30th Celebration, numbered **092/128** at Double Rare — printed alongside its fellow Eeveelution **Espeon ex (070/128)**, also a Double Rare.",
      "",
      "## English Espeon/Umbreon products",
      "",
      "Both get dedicated English releases beyond the base set: a **30th Celebration Battle Deck** each (60 foil cards, plus an exclusive Victini promo in the Espeon ex deck and Zeraora promo in the Umbreon ex deck), out October 30, 2026, and a themed **Ultra-Premium Collection — Day & Night**, out November 6, 2026, each bundled with a foil Espeon ex or Umbreon ex promo.",
      "",
      "A separate **Premium Deck Set — Espeon & Umbreon**, with two full-art \"day and night\" versions of the pair, was released in Japan, Taiwan, Hong Kong and mainland China — it has **no confirmed English-language equivalent**.",
      "",
      "## More Eeveelutions",
      "",
      "Umbreon isn't alone — **Sylveon** also appears as a new Pokémon ex in the set, so Eeveelution collectors have several targets in 30th Celebration. Line them up in an [Umbreon binder](/pokemon/umbreon~34an).",
    ].join("\n"),
    [
      { href: "/pokemon/umbreon~34an", label: "Build an Umbreon binder" },
      { href: "where-to-preorder-30th-celebration", label: "Products & preorders" },
      { href: "what-is-30th-celebration", label: "What is 30th Celebration?" },
    ],
  ),
  page(
    C30,
    "how-many-cards-in-30th-celebration",
    "How many cards are in 30th Celebration?",
    "How many cards are in 30th Celebration?",
    "Pokémon's own materials describe 30th Celebration as \"over 150 cards.\" The main numbered set runs at least to 158 — the two Futuristic Rares, Mewtwo ex and Mew ex, are numbered 157/128 and 158/128 — with the 30-card Classic Collection and foil Basic Energy on top of that.",
    [
      "## No single official total yet",
      "",
      "Pokémon's own release copy calls 30th Celebration **\"over 150 cards\"** without giving an exact figure. The Pokémon Company hasn't published one final number covering every subset, so treat any precise \"total card count\" you see elsewhere as a tracker's own tally rather than an official figure.",
      "",
      "## What the numbering tells us",
      "",
      "The main set is printed **/128**, and that numbering keeps going past the base cards: 18 Illustration Rares, 10 Special Illustration Rares, and finally the two **Futuristic Rares — Mewtwo ex (157/128) and Mew ex (158/128)** — which close out the sequence. That puts the core numbered run at **158 cards**.",
      "",
      "## What's on top",
      "",
      "Separately numbered from that /128 run: the **30-card Classic Collection** (reprints from across the TCG's history) and the foil **Basic Energy** cards. Add those in and the full \"everything\" master set is comfortably larger than 158 — but we won't publish a single combined total until Pokémon confirms one.",
      "",
      "## Planning ahead",
      "",
      "Because **every card is foil**, a 30th Celebration master set is unusually chase-heavy. We'll firm up the figures here once our own card data covers the set — see the [binder layout](/sets) tools in the meantime.",
    ].join("\n"),
    [
      { href: "what-are-the-30-pikachu-cards-in-30th-celebration", label: "The 30 Pikachu cards" },
      { href: "/sets", label: "Plan a binder" },
      { href: "what-is-30th-celebration", label: "What is 30th Celebration?" },
    ],
  ),
  page(
    C30,
    "where-to-preorder-30th-celebration",
    "What products and preorders are there for 30th Celebration?",
    "30th Celebration products & preorders",
    "30th Celebration launched September 16, 2026 with Booster Boxes, an Elite Trainer Box and booster bundles. Espeon ex and Umbreon ex Battle Decks follow October 30, and Ultra-Premium Collections — Day & Night follow November 6.",
    [
      "## 30th Celebration product lineup",
      "",
      "Confirmed English products for the anniversary set:",
      "",
      "- **Booster packs** — 6 cards each (5 foil cards plus a foil Basic Energy); English packs include a Pokémon TCG Live code",
      "- **Booster Boxes** and **booster bundles**",
      "- **Elite Trainer Box**",
      "",
      "All released alongside the main set on **September 16, 2026**.",
      "",
      "## Later releases: Espeon and Umbreon products",
      "",
      "Two more products follow, both English-confirmed:",
      "",
      "- **30th Celebration Battle Deck — Espeon ex** and **Battle Deck — Umbreon ex** (October 30, 2026) — 60 foil cards each, plus a deck box, playmat, coin, and an exclusive promo (Victini in the Espeon ex deck, Zeraora in the Umbreon ex deck)",
      "- **30th Celebration Ultra-Premium Collections — Day & Night** (November 6, 2026, $179.99 each) — 29 booster packs, 1 Classic Collection pack, a foil Pikachu ex promo, and a foil Espeon ex or Umbreon ex promo, plus a themed playmat, sleeves and deck box",
      "",
      "A separate **Premium Deck Set — Espeon & Umbreon**, with two full-art \"day and night\" versions of the pair, released in Japan, Taiwan, Hong Kong and mainland China. It has **no confirmed English-language equivalent** — don't confuse it with the English Battle Decks above.",
      "",
      "In Japan, an ultra-premium **Futuristic Box** (with Pikachu ex promos) is also confirmed; an English equivalent hasn't been announced.",
      "",
      "## Buying notes",
      "",
      "The main set had a **simultaneous worldwide launch on September 16, 2026** with no traditional pre-release, so it's in shops now. The Battle Decks and Ultra-Premium Collections are still ahead — preorder those if you want them on release day. The Pokémon Company hasn't published official MSRPs for the base packs/boxes, so prices you see for those are retailer-set.",
    ].join("\n"),
    [
      { href: "is-there-an-umbreon-card-in-30th-celebration", label: "Is Umbreon in the set?" },
      { href: "/binders", label: "Shop binders" },
      { href: "when-does-30th-celebration-come-out", label: "30th Celebration release date" },
    ],
  ),
];

const DELTA_REIGN_PAGES: FaqPage[] = [
  page(
    DR,
    "when-does-delta-reign-come-out",
    "When does Delta Reign come out?",
    "When does Delta Reign come out? (Release date)",
    "Pokémon TCG: Mega Evolution — Delta Reign releases worldwide on November 6, 2026. It's the Mega Rayquaza ex set, first teased in June 2026 and officially revealed with full details in August 2026.",
    [
      "## Delta Reign release date",
      "",
      "**Delta Reign (set code ME06) releases worldwide on November 6, 2026.** The Pokémon Company first teased it on June 18, 2026, then gave the full official reveal in August 2026, confirming it as the sixth main Mega Evolution Series expansion — and the one bringing back **Mega Rayquaza ex**.",
      "",
      "## Pre-release events",
      "",
      "Pre-release events begin **October 24, 2026**, ahead of the full November 6 launch.",
      "",
      "## A first for the TCG",
      "",
      "Notably, Delta Reign launches **the same day as a themed Pokémon TCG Pocket set, \"Ruler of the Skies\"** — the first time a physical set and a Pocket set drop together with a shared theme.",
      "",
      "## Where it sits in 2026",
      "",
      "Delta Reign closes out Pokémon's 2026 line-up, after Pitch Black (July) and the 30th Celebration anniversary set (September).",
    ].join("\n"),
    [
      { href: "what-is-delta-reign", label: "What is Delta Reign?" },
      { href: "is-storm-emerald-the-same-as-delta-reign", label: "Is it the same as Storm Emerald?" },
      { href: "is-there-a-mega-rayquaza-card-in-delta-reign", label: "Is Mega Rayquaza in it?" },
    ],
  ),
  page(
    DR,
    "what-is-delta-reign",
    "What is Pokémon TCG Delta Reign?",
    "What is Pokémon TCG Delta Reign?",
    "Delta Reign (ME06) is the sixth Mega Evolution set, releasing November 6, 2026, headlined by the return of Mega Rayquaza ex alongside three more confirmed Mega ex and a new Legendary Stadium mechanic.",
    [
      "## The Mega Rayquaza set",
      "",
      "**Delta Reign** is the sixth main Mega Evolution Series expansion (**ME06**), built around the return of **Mega Rayquaza ex** — one of the most popular Pokémon in the game. The theme leans on Hoenn and the *Delta Episode*, hence the name.",
      "",
      "## What's officially confirmed",
      "",
      "Pokémon's official reveal confirms **four Mega Evolution Pokémon ex**: **Mega Rayquaza ex**, **Mega Golisopod ex**, **Mega Golurk ex** and **Mega Malamar ex**. The set carries **over 135 cards**, including more than 20 Trainer cards and over 35 cards with special illustrations.",
      "",
      "A new **Legendary Stadium** mechanic debuts: split Stadium cards printed in two halves that must be played together from hand, counting as one Stadium card in play. Delta Reign has three — **Legendary Ocean Trench**, **Legendary Summit** and **Legendary Lava Lake**.",
      "",
      "Delta Reign's Japanese predecessor, **Storm Emeralda**, released in Japan on July 31, 2026, with the same four Mega ex — a useful preview of art and card design, though the English print run, exact rarities and full checklist aren't guaranteed to match card-for-card.",
      "",
      "## The Pocket tie-in",
      "",
      "Delta Reign launches alongside the Pokémon TCG Pocket set **\"Ruler of the Skies\"** on the same November 6 date — a first for the franchise, and a sign of how central Mega Rayquaza is to the release.",
    ].join("\n"),
    [
      { href: "is-there-a-mega-rayquaza-card-in-delta-reign", label: "Is Mega Rayquaza in it?" },
      { href: "is-storm-emerald-the-same-as-delta-reign", label: "Is it the same as Storm Emerald?" },
      { href: "how-many-cards-in-delta-reign", label: "How many cards?" },
    ],
  ),
  page(
    DR,
    "is-storm-emerald-the-same-as-delta-reign",
    "Is Storm Emerald the same as Delta Reign?",
    "Is Storm Emerald the same as Delta Reign?",
    "Yes — \"Storm Emerald\" is an early rendering of the Japanese set name \"Storm Emeralda.\" The official English Mega Rayquaza set is called Delta Reign, releasing November 6, 2026.",
    [
      "## Same set, different name",
      "",
      "If you've seen **\"Storm Emerald\"** floating around, that's the **Japanese set \"Storm Emeralda\" (M6)** — an early/placeholder rendering of its name. The **official English release is titled Delta Reign**, and it's built from the same Mega Rayquaza ex set.",
      "",
      "## Why the confusion",
      "",
      "English Mega Evolution sets often get a different name from their Japanese counterpart. The Japanese **Storm Emeralda already released, on July 31, 2026**; the English **Delta Reign** follows **worldwide on November 6, 2026**. So there's no separate \"Storm Emerald\" English set — it's Delta Reign.",
      "",
      "## What to search for",
      "",
      "For English product, news and preorders, look up **Delta Reign** rather than Storm Emerald — that's the name on Pokémon's official materials.",
    ].join("\n"),
    [
      { href: "what-is-delta-reign", label: "What is Delta Reign?" },
      { href: "when-does-delta-reign-come-out", label: "Delta Reign release date" },
      { href: "is-there-a-mega-rayquaza-card-in-delta-reign", label: "Is Mega Rayquaza in it?" },
    ],
  ),
  page(
    DR,
    "is-there-a-mega-rayquaza-card-in-delta-reign",
    "Is there a Mega Rayquaza card in Delta Reign?",
    "Is there a Mega Rayquaza card in Delta Reign?",
    "Yes — Mega Rayquaza ex is the headline card of Delta Reign, officially confirmed by Pokémon's August 2026 reveal. Its Japanese predecessor, Storm Emeralda, has already given it a Special Art Rare and a Mega Ultra Rare printing.",
    [
      "## Yes — Mega Rayquaza ex headlines Delta Reign",
      "",
      "**Mega Rayquaza ex** is the confirmed star of Delta Reign — featured in the original June 2026 teaser and confirmed as the set's lead card in Pokémon's official August 2026 reveal.",
      "",
      "## What its Japanese printing looks like",
      "",
      "Delta Reign's Japanese predecessor, **Storm Emeralda**, is already out and gave Mega Rayquaza ex a **Special Art Rare** and a **Mega Ultra Rare** printing — the two top-end chase versions of the card. Those specific rarities haven't been individually confirmed for the English Delta Reign print run yet, though the same four Mega ex are carrying over.",
      "",
      "## Building a Rayquaza binder",
      "",
      "Rayquaza is one of the most collected Pokémon in the TCG. Once Delta Reign lands you'll be able to add its prints to a [Rayquaza binder](/pokemon/rayquaza~34an) alongside every other Rayquaza card.",
    ].join("\n"),
    [
      { href: "/pokemon/rayquaza~34an", label: "Build a Rayquaza binder" },
      { href: "what-is-delta-reign", label: "What is Delta Reign?" },
      { href: "when-does-delta-reign-come-out", label: "Delta Reign release date" },
    ],
  ),
  page(
    DR,
    "how-many-cards-in-delta-reign",
    "How many cards are in Delta Reign?",
    "How many cards are in Delta Reign?",
    "Pokémon's official reveal puts Delta Reign at over 135 cards, including more than 20 Trainer cards and over 35 cards with special illustrations. Its Japanese predecessor, Storm Emeralda, has 113 cards, for comparison.",
    [
      "## Officially confirmed: over 135 cards",
      "",
      "Pokémon's official August 2026 reveal describes Delta Reign as **\"over 135 cards,\"** with **more than 20 Trainer cards** and **over 35 cards with special illustrations**. An exact final total hasn't been published, so treat \"over 135\" as the confirmed figure rather than a precise count.",
      "",
      "## What the Japanese predecessor tells us",
      "",
      "**Storm Emeralda**, the Japanese set Delta Reign is built from, released July 31, 2026 with **113 cards**: a **76-card main set** plus **37 secret rares**. It shares the same four Mega ex as Delta Reign, so it's a useful preview — but the English set's higher \"over 135\" figure shows the two checklists don't match card-for-card, so treat Storm Emeralda's numbers as a guide rather than the English total.",
      "",
      "## Check back closer to launch",
      "",
      "We'll fill in the exact final count, chase cards and a [binder layout](/sets) once card-by-card data is available after the November 6, 2026 release.",
    ].join("\n"),
    [
      { href: "what-is-delta-reign", label: "What is Delta Reign?" },
      { href: "is-there-a-mega-rayquaza-card-in-delta-reign", label: "Is Mega Rayquaza in it?" },
      { href: "/sets", label: "Plan a binder" },
    ],
  ),
];

export const ANNOUNCED_FAQ_PAGES: FaqPage[] = [...CELEBRATION_PAGES, ...DELTA_REIGN_PAGES];

/** Sets in scope, each with its pages — soonest release first, for the index.
 *  Date-independent: a set keeps its pages after it releases, right up until
 *  the entry is pruned. */
export function announcedSetsWithPages(): { set: AnnouncedSet; pages: FaqPage[] }[] {
  return ANNOUNCED_SETS.map((set) => ({
    set,
    pages: ANNOUNCED_FAQ_PAGES.filter((p) => p.setId === set.id),
  }));
}
