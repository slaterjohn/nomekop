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
    checkedOn: "2026-09-07",
    sources: [
      { label: "Pokemon.com — 30th Celebration", url: "https://www.pokemon.com/us/pokemon-news/get-ready-for-pokemon-tcg-30th-celebration" },
      { label: "Pokemon.com — 30th Celebration product showcase", url: "https://www.pokemon.com/us/news/pokemon-tcg-30th-celebration-product-showcase" },
      { label: "PokéGuardian — M6a reveal", url: "https://www.pokeguardian.com/3203041_mega-expansion-pack-30th-celebration-revealed" },
      { label: "Bulbapedia — 30th Celebration (TCG)", url: "https://bulbapedia.bulbagarden.net/wiki/30th_Celebration_(TCG)" },
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
    checkedOn: "2026-09-07",
    sources: [
      { label: "Pokemon.com — Delta Reign expansion arrives November 6, 2026", url: "https://www.pokemon.com/us/news/the-pokemon-tcg-mega-evolution-delta-reign-expansion-arrives-november-6-2026" },
      { label: "PokéGuardian — Delta Reign revealed", url: "https://www.pokeguardian.com/3231721_pokemon-tcg-mega-evolution-delta-reign-revealed" },
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
    "Pokémon TCG: 30th Celebration releases September 16, 2026 — the first-ever Pokémon TCG set to launch simultaneously worldwide, including Simplified Chinese.",
    [
      "## 30th Celebration release date",
      "",
      "**30th Celebration releases on September 16, 2026.** It's a landmark date: Pokémon has confirmed it as the **first-ever Pokémon TCG expansion to launch simultaneously worldwide** — every region, including Simplified Chinese, on the same day.",
      "",
      "## Will there be pre-release events?",
      "",
      "Because of the synchronized global launch, no traditional pre-release event has been announced (those usually stagger by region). Expect it to simply go on sale everywhere on the 16th.",
      "",
      "## Why the date matters",
      "",
      "The set marks **30 years of the Pokémon Trading Card Game** (first released in Japan in October 1996), so The Pokémon Company is treating it as a worldwide anniversary moment rather than a normal staggered set.",
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
    "30th Celebration is an all-foil anniversary set out September 16, 2026, celebrating 30 years of the Pokémon TCG with classic reprints, a new Futuristic Rare rarity, and 30 unique Pikachu cards.",
    [
      "## A 30th-anniversary celebration set",
      "",
      "**30th Celebration** marks 30 years of the Pokémon TCG. Like *Celebrations* did for the 25th anniversary, it mixes **reprinted classic cards with brand-new ones** — but turns everything up to foil.",
      "",
      "## What makes it special",
      "",
      "- **Every card is foil** — including the Basic Energy. There are no non-foil commons.",
      "- A brand-new **Futuristic Rare** rarity debuts, led by Mewtwo ex and Mew ex from artist YOSHIROTTEN.",
      "- Every pack guarantees **1 of 30 unique Pikachu cards**, each illustrated by a different artist.",
      "- **30 iconic classics get reprinted** with special foiling and a \"30\" anniversary Pikachu stamp — including the Base Set Charizard.",
      "",
      "## Who's in it",
      "",
      "Confirmed Pokémon include an **Espeon & Umbreon** day/night Illustration pair, new **Sylveon ex** and **Greninja ex**, the **Mewtwo ex / Mew ex** Futuristic Rares, plus Lapras, Drifloon, Hisuian Zorua and Lycanroc.",
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
    "Futuristic Rare is a brand-new Pokémon TCG rarity debuting in 30th Celebration (Sept 2026), featuring bold new visuals — the first ones are Mewtwo ex and Mew ex by artist YOSHIROTTEN.",
    [
      "## A new rarity for the 30th anniversary",
      "",
      "**Futuristic Rare** (abbreviated \"FUR\" on the Japanese cards) is a **new rarity tier** introduced with 30th Celebration. Pokémon describes them as cards \"featuring evocative new visuals\" — a fresh, modern art treatment created specially for the anniversary set.",
      "",
      "## The first Futuristic Rares",
      "",
      "The debut Futuristic Rares are **Mewtwo ex** and **Mew ex**, illustrated by guest artist **YOSHIROTTEN**. As a brand-new chase rarity headlining an anniversary set, these are expected to be among the most sought-after cards in 30th Celebration.",
      "",
      "## How rare are they?",
      "",
      "Exact pull rates haven't been confirmed. As a top-tier secret-style rarity in an all-foil set, expect them to sit at the very top of the chase, above the set's Illustration Rares and ex cards.",
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
      "Because they're a guaranteed pull spread across 30 designs, completing the Pikachu subset is the natural collecting goal for this set — a perfect fit for a dedicated [Pikachu binder](/pokemon/pikachu~34an) once the cards are out.",
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
    "Yes — Umbreon appears in 30th Celebration as part of an Espeon & Umbreon day/night Illustration Rare pair, and headlines its own all-foil Umbreon ex Battle Deck.",
    [
      "## Yes — Umbreon is in 30th Celebration",
      "",
      "Umbreon is confirmed for 30th Celebration as one half of an **Espeon & Umbreon \"day and night\" Illustration Rare pairing** — a fan-favourite Eeveelution duo given matching anniversary artwork.",
      "",
      "## The Umbreon ex Battle Deck",
      "",
      "Umbreon also headlines its own confirmed **all-foil 60-card Battle Deck**, sold as a standalone product alongside a matching Espeon ex Battle Deck. (Japan gets a combined two-deck Premium Deck Set instead — the English release splits the pair into separate decks.) Between the Illustration Rare and the Battle Deck, there's plenty of Umbreon to chase here.",
      "",
      "## More Eeveelutions",
      "",
      "Umbreon isn't alone — **Sylveon** also appears as a new Pokémon ex in the set, so Eeveelution collectors have several targets in 30th Celebration. Line them up in an [Umbreon binder](/pokemon/umbreon~34an) once it releases.",
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
    "The Pokémon Company hasn't published a final English card count for 30th Celebration. Set-list tracking by Bulbapedia currently puts the English release at 160+ cards, plus the 30 Pikachu, Futuristic Rares and secret rares on top.",
    [
      "## The count isn't official yet",
      "",
      "The Pokémon Company **hasn't published a final English card count** for 30th Celebration — the set hasn't even been assigned an official set code yet. Bulbapedia's set-list tracking currently has the English release at **160+ cards**, built up from the checklist as it's been revealed. Treat that as a running tally rather than a confirmed final number until Pokémon publishes one.",
      "",
      "## What we do know",
      "",
      "On top of the main set, you've got the **30 unique Pikachu**, the new **Futuristic Rares** (Mewtwo ex, Mew ex), **30 reprinted classics** with anniversary stamps, and secret rares — so the full \"everything\" master set will be considerably larger than the base number.",
      "",
      "## Planning ahead",
      "",
      "Because **every card is foil**, a 30th Celebration master set is unusually chase-heavy. Once the checklist is confirmed we'll add exact figures and a [binder layout](/sets) for it.",
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
    "30th Celebration launches September 16 with Booster Boxes and an Elite Trainer Box, followed through the autumn by Battle Decks, a Ditto Premium Collection, an Ultra-Premium Collection, Mini Tins and a Binder Collection. Packs hold 6 foil cards.",
    [
      "## 30th Celebration product lineup",
      "",
      "Confirmed products for the anniversary set, per Pokémon's own product showcase:",
      "",
      "- **Booster packs** — 6 cards each: 5 foil cards (including one of the 30 Pikachu) plus a foil Basic Energy; English packs include a Pokémon TCG Live code",
      "- **Booster Boxes** and **booster bundles** (6 packs), out September 16",
      "- **Elite Trainer Box** — 9 booster packs, a full-art Nidorina promo, 65 sleeves, 16 foil Basic Energy cards, damage-counter dice, a coin-flip die, a plastic coin, and a 6-divider box",
      "- **Pokémon Center Elite Trainer Box** — 11 packs and two Nidorina promos, one with the Pokémon Center logo",
      "- **Mini Tins** (October 2) — 2 packs, a sticker sheet and an art card each",
      "- **Umbreon ex and Espeon ex Battle Decks** (October 30) — standalone all-foil 60-card decks, each with a deck box, coin and playmat",
      "- **Ditto Premium Collection** (November 6) — 8 packs, an acrylic display and a promo card",
      "- **Ultra-Premium Collection** (November 6) — 29 booster packs plus one Classic Collection booster pack",
      "- **Binder Collection** (December 4) — 5 packs and a 9-pocket binder",
      "",
      "In Japan, an ultra-premium **Futuristic Box** (with Pikachu ex promos) is also confirmed; no English equivalent has been announced.",
      "",
      "## Preorder notes",
      "",
      "With a **simultaneous worldwide launch on September 16, 2026** and no traditional pre-release, preorders are the way to lock in the day-one products; the later-wave items (Battle Decks, Ditto and Ultra-Premium Collections, Mini Tins, Binder Collection) follow on the dates above. The Pokémon Company hasn't published official MSRPs, so prices you see quoted are retailer-set.",
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
    "Pokémon TCG: Mega Evolution — Delta Reign releases worldwide on November 6, 2026, with prerelease events running October 24 to November 1. It's the Mega Rayquaza ex set, fully revealed by Pokémon on August 20, 2026.",
    [
      "## Delta Reign release date",
      "",
      "**Delta Reign (set code ME06) releases worldwide on November 6, 2026.** The Pokémon Company teased it in June 2026 and gave the full official reveal — card count, product lineup and all — on August 20, 2026, as the sixth main Mega Evolution Series expansion, bringing back **Mega Rayquaza ex**.",
      "",
      "## Prerelease events",
      "",
      "Local prerelease events run **October 24 to November 1, 2026**, ahead of the November 6 general release. Build & Battle Boxes, each with one of four unique promo cards, are the prerelease product.",
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
    "Delta Reign (ME06) is the sixth Mega Evolution set, releasing November 6, 2026, headlined by the return of Mega Rayquaza ex alongside three more Mega ex and a new Legendary Stadium mechanic. Pokémon gave the full official reveal on August 20, 2026.",
    [
      "## The Mega Rayquaza set",
      "",
      "**Delta Reign** is the sixth main Mega Evolution Series expansion (**ME06**), built around the return of **Mega Rayquaza ex** — one of the most popular Pokémon in the game. The theme leans on Hoenn and the *Delta Episode*, hence the name.",
      "",
      "## What's confirmed",
      "",
      "Pokémon gave Delta Reign its full official reveal on **August 20, 2026**, confirming **more than 135 cards**: four Mega Evolution Pokémon ex (**Mega Rayquaza ex**, **Mega Golisopod ex**, **Mega Golurk ex**, **Mega Malamar ex**), six Pokémon ex, six Stadium cards forming three **Legendary Stadiums**, 14 illustration rare Pokémon, 17 ultra rare Pokémon/Trainer cards, and six special illustration rare Pokémon/Supporter cards. A **Legendary Stadium** is a new mechanic — two Stadium cards played together as a pair, with linked artwork across both halves; any booster pack that pulls one contains both halves. Delta Reign's Japanese predecessor, **Storm Emeralda**, released July 31, 2026 with a similar but not identical line-up (113 cards) — see below for how the two compare.",
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
    "\"Storm Emerald\" is an early rendering of the Japanese set name \"Storm Emeralda.\" The official English release, Delta Reign, shares its four Mega ex and the Legendary Stadium mechanic with Storm Emeralda but has its own, larger confirmed card count.",
    [
      "## Related sets, not identical",
      "",
      "If you've seen **\"Storm Emerald\"** floating around, that's the **Japanese set \"Storm Emeralda\" (M6)** — an early/placeholder rendering of its name. The **official English release is titled Delta Reign**, built from the same Mega Rayquaza ex theme.",
      "",
      "## How they compare, now both are confirmed",
      "",
      "The Japanese **Storm Emeralda released July 31, 2026** with **113 cards** (76 main set + 37 secret rares) and the same four Mega ex Delta Reign has — Mega Rayquaza ex, Mega Golisopod ex, Mega Golurk ex and Mega Malamar ex. Delta Reign's own official reveal on **August 20, 2026** confirmed **more than 135 cards** for the English set — a larger count than its Japanese predecessor, not a straight port. Pokémon hasn't published a card-by-card comparison, so treat Delta Reign as its own English checklist that shares Storm Emeralda's headline cards and mechanics rather than an identical set.",
      "",
      "## Why the confusion",
      "",
      "English Mega Evolution sets often get a different name from their Japanese counterpart, and the two release nearly four months apart. So there's no separate \"Storm Emerald\" English set — for English product, news and preorders, look up **Delta Reign** rather than Storm Emerald, which is the name on Pokémon's official materials.",
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
    "Yes — Mega Rayquaza ex is the headline card of Delta Reign, one of four confirmed Mega ex in Pokémon's official August 2026 reveal. Its Japanese predecessor, Storm Emeralda, gave it a Special Art Rare and a Mega Ultra Rare printing.",
    [
      "## Yes — Mega Rayquaza ex headlines Delta Reign",
      "",
      "**Mega Rayquaza ex** is the confirmed star of Delta Reign — featured in the June 2026 teaser and confirmed as one of the set's four Mega Evolution Pokémon ex in Pokémon's full official reveal on **August 20, 2026**, alongside Mega Golisopod ex, Mega Golurk ex and Mega Malamar ex.",
      "",
      "## What its Japanese printing looks like",
      "",
      "Delta Reign's Japanese predecessor, **Storm Emeralda**, is already out and gave Mega Rayquaza ex a **Special Art Rare** and a **Mega Ultra Rare** printing — the two top-end chase versions of the card. Pokémon hasn't published Delta Reign's card-by-card rarity list yet, so it isn't confirmed which specific rarities Mega Rayquaza ex gets in the English release — but as the set's headline card, expect it to sit among Delta Reign's top chase pulls.",
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
    "Pokémon's official August 2026 reveal confirms Delta Reign at more than 135 cards, including four Mega Evolution ex, six Pokémon ex, six Legendary Stadium cards, 14 illustration rares, 17 ultra rares and six special illustration rares.",
    [
      "## Officially confirmed: 135+ cards",
      "",
      "Pokémon's full reveal on **August 20, 2026** put Delta Reign at **more than 135 cards**, broken down as:",
      "",
      "- **4** Mega Evolution Pokémon ex (Mega Rayquaza ex, Mega Golisopod ex, Mega Golurk ex, Mega Malamar ex)",
      "- **6** Pokémon ex",
      "- **6** Stadium cards, forming **3** Legendary Stadium pairs",
      "- **14** illustration rare Pokémon",
      "- **17** ultra rare Pokémon/Trainer cards",
      "- **6** special illustration rare Pokémon/Supporter cards",
      "",
      "\"More than 135\" is the figure as Pokémon has stated it — treat it as the official count rather than a rounded estimate, but the exact final tally (including any further secret rares) hasn't been spelled out card-by-card.",
      "",
      "## How it compares to Storm Emeralda",
      "",
      "Delta Reign's Japanese predecessor, **Storm Emeralda**, released July 31, 2026 with **113 cards** — a 76-card main set plus 37 secret rares. Delta Reign's confirmed 135+ is noticeably larger, so it isn't a straight card-for-card port of the Japanese set.",
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
