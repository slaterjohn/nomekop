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
// live data beats the hand-written copy. Caveat on that dedupe: it only bites on
// slugs that match the template scheme in slug.ts. A few Pitch Black slugs
// predate the scheme (`when-does-pitch-black-come-out`, `what-is-pitch-black`)
// and are deliberately left alone because they're already indexed — prune them
// by hand, don't rely on the collision.
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
    id: "upcoming-pitch-black",
    name: "Pokémon TCG: Mega Evolution — Pitch Black",
    shortName: "Pitch Black",
    slug: "pitch-black",
    era: "Mega Evolution",
    releaseDate: "2026-07-17",
    releaseLabel: "July 17, 2026",
    checkedOn: "2026-08-04",
    sources: [
      { label: "Pokemon.com — Pitch Black", url: "https://www.pokemon.com/us/pokemon-tcg/mega-evolution-pitch-black" },
      { label: "Pokemon.com — release announcement", url: "https://www.pokemon.com/us/pokemon-news/the-pokemon-tcg-mega-evolution-pitch-black-expansion-arrives-july-17-2026" },
      { label: "Bulbapedia — Pitch Black (TCG)", url: "https://bulbapedia.bulbagarden.net/wiki/Pitch_Black_(TCG)" },
    ],
  },
  {
    id: "upcoming-30th-celebration",
    name: "Pokémon TCG: 30th Celebration",
    shortName: "30th Celebration",
    slug: "30th-celebration",
    era: "Mega Evolution",
    releaseDate: "2026-09-16",
    releaseLabel: "September 16, 2026",
    checkedOn: "2026-06-24",
    sources: [
      { label: "Pokemon.com — 30th Celebration", url: "https://www.pokemon.com/us/pokemon-news/get-ready-for-pokemon-tcg-30th-celebration" },
      { label: "PokéGuardian — M6a reveal", url: "https://www.pokeguardian.com/3203041_mega-expansion-pack-30th-celebration-revealed" },
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
    checkedOn: "2026-06-24",
    sources: [
      { label: "PokéGuardian — Delta Reign tease", url: "https://www.pokeguardian.com/3231721_pokemon-tcg-mega-evolution-delta-reign-teased-november-release" },
      { label: "PokéBeach — official tease", url: "https://www.pokebeach.com/2026/06/storm-emeralda-and-delta-reign-tcg-sets-officially-teased-along-with-pockets-ruler-of-the-skies" },
      { label: "Bulbapedia — Delta Reign (TCG)", url: "https://bulbapedia.bulbagarden.net/wiki/Delta_Reign_(TCG)" },
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

const PB = announcedSet("upcoming-pitch-black");
const C30 = announcedSet("upcoming-30th-celebration");
const DR = announcedSet("upcoming-delta-reign");

// Pitch Black released on 2026-07-17 but is NOT in the cache DB (last written
// 2026-06-24), so `scripts/build-faqs.mjs` can't cover it and these pages stay
// hand-authored. They were rewritten from pre-release into released framing on
// 2026-08-04 using only the sources already cited on the set — no counts, chase
// cards or release facts were added that those sources don't support. Once the
// cache picks the set up and data.json is regenerated, prune this block.
const PITCH_BLACK_PAGES: FaqPage[] = [
  page(
    PB,
    "when-does-pitch-black-come-out",
    "When did Pitch Black come out?",
    "When did Pitch Black come out? (Release date)",
    "Pokémon TCG: Mega Evolution — Pitch Black came out worldwide on July 17, 2026. Build & Battle Boxes went on sale early at pre-release events from July 4.",
    [
      "## Pitch Black release date",
      "",
      "Pitch Black (set code **ME05**) went on sale worldwide on **July 17, 2026**. It's the fifth main expansion of the Mega Evolution Series; Chaos Rising, in May 2026, was the one before it.",
      "",
      "## The pre-release window",
      "",
      "Anyone who went to a pre-release opened it nearly a fortnight early. Pokémon sold **Build & Battle Boxes at select Play! Pokémon stores from July 4, 2026**, ahead of the July 17 street date.",
      "",
      "## What comes after Pitch Black",
      "",
      "Pitch Black opened a busy second half of 2026. The all-foil **30th Celebration** set follows on September 16, and **Mega Evolution — Delta Reign** (Mega Rayquaza ex) closes the year on November 6.",
    ].join("\n"),
    [
      { href: "what-is-pitch-black", label: "What is Pitch Black?" },
      { href: "chase-cards-in-pitch-black", label: "Pitch Black chase cards" },
      { href: "/faqs", label: "All set FAQs" },
    ],
  ),
  page(
    PB,
    "what-is-pitch-black",
    "What is Pokémon TCG Pitch Black?",
    "What is Pokémon TCG Pitch Black?",
    "Pitch Black (ME05) is a dark-themed Mega Evolution set released on July 17, 2026 — the first English set built on Pokémon Legends: Z-A's Mega Dimension, headlined by Mega Darkrai ex and Mega Zeraora ex.",
    [
      "## A dark-themed Mega Evolution expansion",
      "",
      "**Pitch Black** is the fifth main Mega Evolution Series expansion (**ME05**), out since July 17, 2026. It's the first English set to draw on the **Mega Dimension DLC of Pokémon Legends: Z-A**, and the art leans hard into a dark, gothic look.",
      "",
      "## New Mega Pokémon",
      "",
      "The headliners are **Mega Darkrai ex** and **Mega Zeraora ex**. **Mega Chandelure ex** and **Mega Excadrill ex** are in the set too, which makes four new Mega ex cards. (Pokémon never confirmed whether all four trace back to the Legends: Z-A DLC.)",
      "",
      "## The \"Antique\" fossil sub-theme",
      "",
      "Pitch Black also introduced an **\"Antique\" fossil archetype**: a **Fossil Quarry** Stadium that searches out Antique Item cards, with support from **Relicanth**, **Dhelmise** and **Chi-Yu**. Pokémon's preview put the set at over 115 cards, more than 20 of them Trainers and over 35 carrying special illustrations, so the Megas are only part of what's worth chasing.",
    ].join("\n"),
    [
      { href: "what-mega-pokemon-are-in-pitch-black", label: "Every Mega in Pitch Black" },
      { href: "what-are-the-antique-cards-in-pitch-black", label: "The Antique fossil cards" },
      { href: "how-many-cards-in-pitch-black", label: "How many cards in Pitch Black?" },
    ],
  ),
  page(
    PB,
    "how-many-cards-in-pitch-black",
    "How many cards are in Pitch Black?",
    "How many cards are in Pitch Black?",
    "Pokémon's preview put Pitch Black at over 115 cards, including more than 20 Trainers and over 35 cards with special illustrations. We don't have an exact printed total yet.",
    [
      "## The announced Pitch Black card count",
      "",
      "Pokémon's official preview describes Pitch Black as **\"over 115 cards,\"** of which **more than 20 are Trainer cards** and **over 35 carry special illustrations** of Pokémon and Trainers.",
      "",
      "## Why we can't give you an exact number",
      "",
      "The Pokémon Company never published a base-set-plus-secret-rare breakdown, and Pitch Black hasn't reached our card database yet, so we won't print a precise printed total we can't stand behind. Anything more exact than \"over 115\" would be a guess.",
      "",
      "## How that compares",
      "",
      "An \"over 115\" main set is in line with the recent Mega Evolution expansions. The 35-plus special illustrations point to a deep pool of Illustration Rares and ex cards sitting on top of the numbered base set.",
      "",
      "## Planning a Pitch Black binder",
      "",
      "A master set will run well above 115 once reverse holos and special illustrations are counted. Exact page counts and a [binder layout](/sets) follow once the cards reach our data.",
    ].join("\n"),
    [
      { href: "chase-cards-in-pitch-black", label: "Pitch Black chase cards" },
      { href: "/sets", label: "Plan a binder" },
      { href: "when-does-pitch-black-come-out", label: "Pitch Black release date" },
    ],
  ),
  page(
    PB,
    "chase-cards-in-pitch-black",
    "What are the chase cards in Pitch Black?",
    "What are the chase cards in Pitch Black?",
    "Mega Darkrai ex is Pitch Black's top chase card, with Mega Zeraora ex close behind. Both have special-illustration versions, and Mega Chandelure ex and Mega Excadrill ex round out the set's four Megas.",
    [
      "## Pitch Black's headline chase cards",
      "",
      "The card everyone wants is **Mega Darkrai ex**, the set's dark-themed cover star. **Mega Zeraora ex** is the other headliner. Both have **special-illustration (alt-art) versions**, and those are the expensive pulls.",
      "",
      "## The full Mega line-up",
      "",
      "**Mega Chandelure ex** and **Mega Excadrill ex** fill out the four new Mega ex cards. With **over 35 special-illustration cards** across the set, there's a long run of Illustration Rares and Special Illustration Rares beyond the Megas.",
      "",
      "## Still unverified",
      "",
      "Card lists circulating in the community mention extras like a Mega Slowbro ex and new special Energy. Those never appeared in Pokémon's official reveals, so treat them as unconfirmed until you've seen them on a printed checklist.",
      "",
      "## What we can't tell you yet",
      "",
      "We have no market data for Pitch Black — its cards aren't in our database — so any price attached to these cards elsewhere is a marketplace figure, not one of ours.",
    ].join("\n"),
    [
      { href: "is-there-a-mega-darkrai-card-in-pitch-black", label: "Is Mega Darkrai in Pitch Black?" },
      { href: "is-there-a-mega-zeraora-card-in-pitch-black", label: "Is Mega Zeraora in Pitch Black?" },
      { href: "what-mega-pokemon-are-in-pitch-black", label: "Every Mega in Pitch Black" },
    ],
  ),
  page(
    PB,
    "what-mega-pokemon-are-in-pitch-black",
    "Which Mega Pokémon are in Pitch Black?",
    "Which Mega Pokémon are in Pitch Black?",
    "Pitch Black has four new Mega ex cards: Mega Darkrai ex and Mega Zeraora ex as the headliners, plus Mega Chandelure ex and Mega Excadrill ex.",
    [
      "## The four Megas",
      "",
      "Pitch Black added four Mega Pokémon ex to the game:",
      "",
      "- **Mega Darkrai ex** — the set's cover star",
      "- **Mega Zeraora ex** — the second headliner",
      "- **Mega Chandelure ex**",
      "- **Mega Excadrill ex**",
      "",
      "## Where they come from",
      "",
      "Pitch Black is the first English set to draw on the **Mega Dimension DLC of Pokémon Legends: Z-A**, which is where its dark theme comes from. Pokémon never confirmed that all four Megas originate there, so don't assume the DLC accounts for the whole line-up.",
      "",
      "## What isn't in the set",
      "",
      "Community checklists have mentioned a Mega Slowbro ex. It didn't appear in Pokémon's official reveals, so treat it as unverified until a printed checklist says otherwise.",
    ].join("\n"),
    [
      { href: "is-there-a-mega-darkrai-card-in-pitch-black", label: "Is Mega Darkrai in Pitch Black?" },
      { href: "is-there-a-mega-zeraora-card-in-pitch-black", label: "Is Mega Zeraora in Pitch Black?" },
      { href: "chase-cards-in-pitch-black", label: "Pitch Black chase cards" },
    ],
  ),
  page(
    PB,
    "is-there-a-mega-darkrai-card-in-pitch-black",
    "Is there a Mega Darkrai card in Pitch Black?",
    "Is there a Mega Darkrai card in Pitch Black?",
    "Yes — Mega Darkrai ex is Pitch Black's headline chase card and the set's cover star, and it also appears with a special-illustration alternate art.",
    [
      "## Yes — Mega Darkrai ex headlines Pitch Black",
      "",
      "**Mega Darkrai ex** is the face of Pitch Black and its single biggest chase card. As a Legends: Z-A Mega Dimension boss, it's the natural cover star for a set built on a dark, gothic theme.",
      "",
      "## Which Mega Darkrai to chase",
      "",
      "Alongside the standard **Mega Darkrai ex** there's a **special-illustration (alt-art)** version, and that's where the money goes. Alt-arts of cover-star Megas are usually the most valuable cards in a Mega Evolution set. Pokémon's preview counted over 35 special illustrations across Pitch Black without naming them individually, so check a printed checklist for exact card numbers.",
      "",
      "## Building a Darkrai binder",
      "",
      "Want every Darkrai card, not just this one? Slot Pitch Black's Darkrai prints into a [Darkrai binder](/pokemon/darkrai~34an) alongside Darkrai from every other set.",
    ].join("\n"),
    [
      { href: "/pokemon/darkrai~34an", label: "Build a Darkrai binder" },
      { href: "chase-cards-in-pitch-black", label: "Pitch Black chase cards" },
      { href: "what-is-pitch-black", label: "What is Pitch Black?" },
    ],
  ),
  page(
    PB,
    "is-there-a-mega-zeraora-card-in-pitch-black",
    "Is there a Mega Zeraora card in Pitch Black?",
    "Is there a Mega Zeraora card in Pitch Black?",
    "Yes — Mega Zeraora ex is one of Pitch Black's two headline Megas, alongside Mega Darkrai ex, and it also appears with a special-illustration alternate art.",
    [
      "## Yes — Mega Zeraora ex is in Pitch Black",
      "",
      "**Mega Zeraora ex** is one of the two cards Pokémon led the Pitch Black reveal with; Mega Darkrai ex is the other. The pair headline the set's four new Megas.",
      "",
      "## Which one to chase",
      "",
      "There's the standard **Mega Zeraora ex** and a **special-illustration (alt-art)** version, and the alt-art is the one that carries a premium. Mega Darkrai ex is the cover star, so it usually draws the most attention of the two.",
      "",
      "## Building a Zeraora binder",
      "",
      "Collecting Zeraora across every set it's appeared in? A [Zeraora binder](/pokemon/zeraora~34an) lays out every print in one layout.",
    ].join("\n"),
    [
      { href: "/pokemon/zeraora~34an", label: "Build a Zeraora binder" },
      { href: "is-there-a-mega-darkrai-card-in-pitch-black", label: "Is Mega Darkrai in Pitch Black?" },
      { href: "what-mega-pokemon-are-in-pitch-black", label: "Every Mega in Pitch Black" },
    ],
  ),
  page(
    PB,
    "what-are-the-antique-cards-in-pitch-black",
    "What are the Antique cards in Pitch Black?",
    "What are the Antique cards in Pitch Black?",
    "Antique is a fossil-themed archetype introduced in Pitch Black, built around a Fossil Quarry Stadium that searches out Antique Item cards, with Relicanth, Dhelmise and Chi-Yu supporting it.",
    [
      "## The Antique archetype",
      "",
      "**Antique** is a fossil sub-theme Pokémon revealed alongside Pitch Black's Megas. It hangs off **Fossil Quarry**, a Stadium card that searches out **Antique Item** cards, so the Items are the engine rather than a side attraction.",
      "",
      "## Which Pokémon support it",
      "",
      "Pokémon named **Relicanth**, **Dhelmise** and **Chi-Yu** as part of the Antique line-up. Dhelmise also turns up as one of the four Build & Battle Box promos.",
      "",
      "## Worth collecting on its own",
      "",
      "Pitch Black has **more than 20 Trainer cards**, and the Antique Items are a chunk of that. If you collect by theme rather than by rarity, they're a self-contained mini-set inside the expansion.",
    ].join("\n"),
    [
      { href: "what-promos-are-in-the-pitch-black-build-and-battle-box", label: "Build & Battle promos" },
      { href: "what-is-pitch-black", label: "What is Pitch Black?" },
      { href: "how-many-cards-in-pitch-black", label: "How many cards in Pitch Black?" },
    ],
  ),
  page(
    PB,
    "what-promos-are-in-the-pitch-black-build-and-battle-box",
    "Which promos are in the Pitch Black Build & Battle Box?",
    "Pitch Black Build & Battle Box promos",
    "The Pitch Black Build & Battle Box holds 4 booster packs, a 40-card deck, and 1 of 4 foil promos: Miraidon, Slowbro, Dhelmise or Bastiodon.",
    [
      "## The four promos",
      "",
      "Every Pitch Black Build & Battle Box contains **4 booster packs**, a **40-card ready-to-play deck**, and **one of four foil promos**:",
      "",
      "- **Miraidon**",
      "- **Slowbro**",
      "- **Dhelmise**",
      "- **Bastiodon**",
      "",
      "Which one you get is random, so all four means opening four boxes or trading for the rest.",
      "",
      "## When they went on sale",
      "",
      "Build & Battle Boxes were sold at pre-release events from **July 4, 2026**, ahead of the set's July 17 launch.",
      "",
      "## Do they count towards the set?",
      "",
      "They're foil promos with their own card numbers, so yes — they belong in a complete Pitch Black collection even though they never come out of a booster pack. Dhelmise doubles as part of the set's Antique fossil theme.",
    ].join("\n"),
    [
      { href: "where-to-preorder-pitch-black", label: "All Pitch Black products" },
      { href: "what-are-the-antique-cards-in-pitch-black", label: "The Antique fossil cards" },
      { href: "/binders", label: "Shop binders" },
    ],
  ),
  page(
    PB,
    "where-to-preorder-pitch-black",
    "What Pitch Black products are there?",
    "Pitch Black products (ETB, boosters, Build & Battle)",
    "Pitch Black launched with an Elite Trainer Box, a 36-pack Booster Display, a Booster Bundle, a Pokémon Center–exclusive ETB, and a Build & Battle Box that went on sale early from July 4.",
    [
      "## Pitch Black product line-up",
      "",
      "Pokémon gave Pitch Black the standard Mega Evolution release slate:",
      "",
      "- **Elite Trainer Box (ETB)** — packs, sleeves, dice and accessories",
      "- **Booster Display** — 36 booster packs",
      "- **Booster Bundle** — a smaller multi-pack option",
      "- **Pokémon Center–exclusive ETB** — alternate artwork",
      "- **Build & Battle Box** — 4 packs plus a 40-card deck, with **1 of 4 foil promos** (Miraidon, Slowbro, Dhelmise or Bastiodon)",
      "",
      "## Getting it early",
      "",
      "The **Build & Battle Box went on sale at pre-release events from July 4, 2026**, nearly a fortnight before the July 17 retail launch. That was the earliest anyone opened Pitch Black cards.",
      "",
      "## A note on prices",
      "",
      "The Pokémon Company doesn't publish official MSRPs for these. Figures you'll see quoted (ETBs around $50–60, for instance) are retailer listings, and they move about by store and by stock.",
    ].join("\n"),
    [
      { href: "what-promos-are-in-the-pitch-black-build-and-battle-box", label: "Build & Battle promos" },
      { href: "/binders", label: "Shop binders" },
      { href: "when-does-pitch-black-come-out", label: "Pitch Black release date" },
    ],
  ),
];

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
    "Yes — Umbreon appears in 30th Celebration as part of an Espeon & Umbreon day/night Illustration Rare pair, and headlines a dedicated Espeon & Umbreon Premium Deck Set.",
    [
      "## Yes — Umbreon is in 30th Celebration",
      "",
      "Umbreon is confirmed for 30th Celebration as one half of an **Espeon & Umbreon \"day and night\" Illustration Rare pairing** — a fan-favourite Eeveelution duo given matching anniversary artwork.",
      "",
      "## The Espeon & Umbreon Premium Deck Set",
      "",
      "Umbreon also headlines a confirmed **30th Celebration Premium Deck Set — Espeon & Umbreon**, which includes two ready-to-play 60-card decks. Between the Illustration Rare and the deck set, there's plenty of Umbreon to chase here.",
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
    "The official English card count for 30th Celebration hasn't been confirmed. Early estimates put the set around 150 cards, plus the 30 Pikachu, Futuristic Rares and secret rares on top.",
    [
      "## The count isn't official yet",
      "",
      "The Pokémon Company **hasn't published a final English card count** for 30th Celebration. Based on the Japanese reveal and early tracking, estimates land **around 150 cards** in the main set, but treat any number as unconfirmed until the full checklist drops.",
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
    "30th Celebration launches with Booster Boxes, an Elite Trainer Box, booster bundles, and an Espeon & Umbreon Premium Deck Set. Packs hold 6 foil cards (5 cards + a foil Basic Energy).",
    [
      "## 30th Celebration product lineup",
      "",
      "Confirmed products for the anniversary set include:",
      "",
      "- **Booster packs** — 6 cards each (5 foil cards plus a foil Basic Energy); English packs include a Pokémon TCG Live code",
      "- **Booster Boxes** and **booster bundles**",
      "- **Elite Trainer Box**",
      "- **30th Celebration Premium Deck Set — Espeon & Umbreon** (two 60-card decks)",
      "",
      "In Japan, an ultra-premium **Futuristic Box** (with Pikachu ex promos) is also confirmed; an English equivalent hasn't been announced.",
      "",
      "## Preorder notes",
      "",
      "With a **simultaneous worldwide launch on September 16, 2026** and no traditional pre-release, preorders are the way to lock in product. The Pokémon Company hasn't published official MSRPs, so prices you see are retailer-set.",
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
    "Pokémon TCG: Mega Evolution — Delta Reign releases worldwide on November 6, 2026. It's the Mega Rayquaza ex set, officially teased in June 2026.",
    [
      "## Delta Reign release date",
      "",
      "**Delta Reign (set code ME06) releases worldwide on November 6, 2026.** The Pokémon Company officially teased it on June 18, 2026, as the sixth main Mega Evolution Series expansion — and the one bringing back **Mega Rayquaza ex**.",
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
    "Delta Reign (ME06) is the sixth Mega Evolution set, out November 6, 2026, headlined by the return of Mega Rayquaza ex with a Hoenn / Delta Episode theme. Most of its card list is still unrevealed.",
    [
      "## The Mega Rayquaza set",
      "",
      "**Delta Reign** is the sixth main Mega Evolution Series expansion (**ME06**), built around the return of **Mega Rayquaza ex** — one of the most popular Pokémon in the game. The theme leans on Hoenn and the *Delta Episode*, hence the name.",
      "",
      "## What's confirmed so far",
      "",
      "As of June 2026, Delta Reign has only just been teased, so **most of the set is still unrevealed** — the only confirmed card is **Mega Rayquaza ex** (its art appeared in the teaser). Card count, the full Pokémon list, products and pricing are all still to be announced.",
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
      "If you've seen **\"Storm Emerald\"** floating around, that's the **Japanese set \"Storm Emeralda\" (M6)** — an early/placeholder rendering of its name. The **official English release is titled Delta Reign**, and it's the same Mega Rayquaza ex set.",
      "",
      "## Why the confusion",
      "",
      "English Mega Evolution sets often get a different name from their Japanese counterpart. The Japanese **Storm Emeralda** releases first (around late July 2026 in Japan); the English **Delta Reign** follows **worldwide on November 6, 2026**. So there's no separate \"Storm Emerald\" English set — it's Delta Reign.",
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
    "Yes — Mega Rayquaza ex is the confirmed headline card of Delta Reign and the reason the set exists. It's the only card officially revealed so far.",
    [
      "## Yes — Mega Rayquaza ex headlines Delta Reign",
      "",
      "**Mega Rayquaza ex** is the confirmed star of Delta Reign — its artwork featured in the official June 2026 teaser, and the whole set is themed around its return. It's currently the **only card officially revealed**.",
      "",
      "## What we don't know yet",
      "",
      "Pokémon hasn't shown how many Mega Rayquaza prints the set will have or what its top alt-art chase will be. Based on past Mega cover stars, a **Special Illustration Rare Mega Rayquaza ex** is the card to watch — but that's expectation, not confirmation.",
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
    "Delta Reign's card count hasn't been revealed yet. As of June 2026, only the November 6 release date and Mega Rayquaza ex are confirmed — the full set list is still to come.",
    [
      "## Not revealed yet",
      "",
      "As of June 2026, **Pokémon hasn't announced a card count for Delta Reign.** The set was only just teased, so the size, secret-rare lineup and full checklist are all still to be confirmed.",
      "",
      "## What to expect",
      "",
      "Recent Mega Evolution main sets have run well over 100 cards before secret rares, so Delta Reign will likely be a full-size expansion — but any specific number you see right now is an estimate, not official.",
      "",
      "## Check back closer to launch",
      "",
      "We'll fill in the exact count, chase cards and a [binder layout](/sets) as Pokémon reveals the set ahead of its November 6, 2026 release.",
    ].join("\n"),
    [
      { href: "what-is-delta-reign", label: "What is Delta Reign?" },
      { href: "is-there-a-mega-rayquaza-card-in-delta-reign", label: "Is Mega Rayquaza in it?" },
      { href: "/sets", label: "Plan a binder" },
    ],
  ),
];

export const ANNOUNCED_FAQ_PAGES: FaqPage[] = [
  ...PITCH_BLACK_PAGES,
  ...CELEBRATION_PAGES,
  ...DELTA_REIGN_PAGES,
];

/** Sets in scope, each with its pages — soonest release first, for the index.
 *  Date-independent: a set keeps its pages after it releases, right up until
 *  the entry is pruned. */
export function announcedSetsWithPages(): { set: AnnouncedSet; pages: FaqPage[] }[] {
  return ANNOUNCED_SETS.map((set) => ({
    set,
    pages: ANNOUNCED_FAQ_PAGES.filter((p) => p.setId === set.id),
  }));
}
