// HAND-AUTHORED pre-release FAQ content for upcoming Pokémon TCG sets.
//
// Unlike the released-set FAQs (generated from the cache DB in registry.ts),
// these sets have no card data yet, so each page is written from verified
// official reveals + TCG news, dated, and clearly labelled pre-release. Every
// page links its sources (E-E-A-T) and is honest about what is "not yet
// revealed" rather than guessing.
//
// HAND-OFF: when a set actually releases and enters the cache DB, the
// data-driven templates cover it automatically. registry.ts dedupes by slug
// (the hand-authored page wins) so nothing ever breaks; prune the relevant
// entry here once the live data is better than the pre-release copy.

import type { FaqPage } from "@/lib/content/faqs/types";

export type UpcomingSource = { label: string; url: string };

export type UpcomingSet = {
  /** Synthetic id used for grouping (never a real /set/[id]). */
  id: string;
  /** Full official set name. */
  name: string;
  /** Short name used in slugs and headings. */
  shortName: string;
  /** URL slug stem. */
  slug: string;
  /** Human release label, e.g. "July 17, 2026". */
  releaseLabel: string;
  /** Canonical sources, surfaced on every page of the set. */
  sources: UpcomingSource[];
};

export const AS_OF = "June 2026";

export const UPCOMING_SETS: UpcomingSet[] = [
  {
    id: "upcoming-pitch-black",
    name: "Pokémon TCG: Mega Evolution — Pitch Black",
    shortName: "Pitch Black",
    slug: "pitch-black",
    releaseLabel: "July 17, 2026",
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
    releaseLabel: "September 16, 2026",
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
    releaseLabel: "November 6, 2026",
    sources: [
      { label: "PokéGuardian — Delta Reign tease", url: "https://www.pokeguardian.com/3231721_pokemon-tcg-mega-evolution-delta-reign-teased-november-release" },
      { label: "PokéBeach — official tease", url: "https://www.pokebeach.com/2026/06/storm-emeralda-and-delta-reign-tcg-sets-officially-teased-along-with-pockets-ruler-of-the-skies" },
      { label: "Bulbapedia — Delta Reign (TCG)", url: "https://bulbapedia.bulbagarden.net/wiki/Delta_Reign_(TCG)" },
    ],
  },
];

const SET_BY_ID = new Map(UPCOMING_SETS.map((s) => [s.id, s]));
export function upcomingSetById(id: string): UpcomingSet | undefined {
  return SET_BY_ID.get(id);
}

/** Shared pre-release note + Sources section appended to every page body. */
function footer(set: UpcomingSet): string {
  const links = set.sources.map((s) => `- [${s.label}](${s.url})`).join("\n");
  return [
    "",
    `> **Pre-release set.** ${set.shortName} isn't out yet — everything here is from official reveals and TCG news as of ${AS_OF}, and details can still change before launch. We'll swap in full card data once it releases.`,
    "",
    "## Sources",
    "",
    links,
  ].join("\n");
}

/** Assemble a hand-authored upcoming FAQ page. `sections` are the H2 blocks
 *  (already Markdown); the answer line + footer are added automatically. */
function page(
  set: UpcomingSet,
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

const PB = UPCOMING_SETS[0]!;
const C30 = UPCOMING_SETS[1]!;
const DR = UPCOMING_SETS[2]!;

const PITCH_BLACK_PAGES: FaqPage[] = [
  page(
    PB,
    "when-does-pitch-black-come-out",
    "When does Pitch Black come out?",
    "When does Pitch Black come out? (Release date)",
    "Pokémon TCG: Mega Evolution — Pitch Black releases worldwide on July 17, 2026, with pre-release events and Build & Battle early sales from July 4.",
    [
      "## Pitch Black release date",
      "",
      "Pitch Black (set code **ME05**) is confirmed for a **worldwide release on July 17, 2026** — the fifth main expansion of the Mega Evolution Series, following Chaos Rising (May 2026).",
      "",
      "## Pre-release events",
      "",
      "You can usually open it early: Pokémon confirmed **Build & Battle Box pre-release / early-sale events at select Play! Pokémon stores starting July 4, 2026** (the pre-release window typically runs the week or so before launch). That's the earliest most players will get hands-on cards before the July 17 street date.",
      "",
      "## What's next after Pitch Black",
      "",
      "Pitch Black is the July drop in a busy 2026: the all-foil **30th Celebration** set follows in September, and **Mega Evolution — Delta Reign** (Mega Rayquaza ex) closes out the year on November 6.",
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
    "Pitch Black (ME05) is a dark-themed Mega Evolution set out July 17, 2026, the first English set built on Pokémon Legends: Z-A's Mega Dimension, headlined by Mega Darkrai ex and Mega Zeraora ex.",
    [
      "## A dark-themed Mega Evolution expansion",
      "",
      "**Pitch Black** is the fifth main Mega Evolution Series expansion (**ME05**). It's the first English set to draw on the **Mega Dimension DLC of Pokémon Legends: Z-A**, leaning into a dark, gothic theme led by new Mega Pokémon.",
      "",
      "## New Mega Pokémon",
      "",
      "The headliners are **Mega Darkrai ex** and **Mega Zeraora ex**, with **Mega Chandelure ex** and **Mega Excadrill ex** also confirmed in the set. (Whether all four originate from the Legends: Z-A DLC hasn't been fully confirmed.)",
      "",
      "## The \"Antique\" fossil sub-theme",
      "",
      "Pitch Black also introduces an officially revealed **\"Antique\" fossil archetype** — a **Fossil Quarry** Stadium that searches out Antique Item cards, plus support like **Relicanth**, **Dhelmise** and **Chi-Yu**. With over 115 cards (including 20+ Trainers and 35+ special illustrations), there's a lot more than the Megas to chase.",
    ].join("\n"),
    [
      { href: "chase-cards-in-pitch-black", label: "Pitch Black chase cards" },
      { href: "is-there-a-mega-darkrai-card-in-pitch-black", label: "Is Mega Darkrai in Pitch Black?" },
      { href: "how-many-cards-in-pitch-black", label: "How many cards in Pitch Black?" },
    ],
  ),
  page(
    PB,
    "how-many-cards-in-pitch-black",
    "How many cards are in Pitch Black?",
    "How many cards are in Pitch Black?",
    "Pokémon has confirmed Pitch Black will have over 115 cards, including more than 20 Trainers and over 35 cards with special illustrations. The exact final count isn't official yet.",
    [
      "## The confirmed Pitch Black card count",
      "",
      "Pokémon's official preview says Pitch Black contains **\"over 115 cards,\"** including **more than 20 Trainer cards** and **over 35 cards with special illustrations** of Pokémon and Trainers. A precise base-set + secret-rare breakdown hasn't been published by The Pokémon Company yet.",
      "",
      "## How that compares",
      "",
      "An \"over 115\" main set is in line with recent Mega Evolution expansions, and the **35+ special illustrations** mean a deep chase pool of Illustration Rares and ex cards on top of the base numbered set.",
      "",
      "## Planning a Pitch Black binder",
      "",
      "Once the full checklist drops we'll have exact figures (and a [Pitch Black binder layout](/build) you can plan), but you can already expect a master set well above the ~115 base — every reverse holo and special-illustration card adds to the page count.",
    ].join("\n"),
    [
      { href: "chase-cards-in-pitch-black", label: "Pitch Black chase cards" },
      { href: "/build", label: "Plan a binder" },
      { href: "when-does-pitch-black-come-out", label: "Pitch Black release date" },
    ],
  ),
  page(
    PB,
    "chase-cards-in-pitch-black",
    "What are the chase cards in Pitch Black?",
    "What are the chase cards in Pitch Black?",
    "Mega Darkrai ex is Pitch Black's top chase card, alongside Mega Zeraora ex (both with special-illustration versions). Mega Chandelure ex and Mega Excadrill ex round out the headline Megas.",
    [
      "## Pitch Black's headline chase cards",
      "",
      "The card everyone's after is **Mega Darkrai ex** — the set's dark-themed cover star. Close behind is **Mega Zeraora ex**, with both Megas getting **special-illustration (alt-art) versions** that will be the priciest pulls.",
      "",
      "## The full Mega lineup",
      "",
      "Beyond the two headliners, **Mega Chandelure ex** and **Mega Excadrill ex** are confirmed in the set, giving Pitch Black four new Mega ex chase cards. With **over 35 special-illustration cards** in total, expect a deep run of Illustration Rares and Special Illustration Rares of popular Pokémon and Trainers.",
      "",
      "## Worth watching",
      "",
      "Community card lists also point to extras like a Mega Slowbro ex and new special Energy, but those aren't on Pokémon's official reveal yet — treat them as rumored until the full checklist is out.",
    ].join("\n"),
    [
      { href: "is-there-a-mega-darkrai-card-in-pitch-black", label: "Is Mega Darkrai in Pitch Black?" },
      { href: "what-is-pitch-black", label: "What is Pitch Black?" },
      { href: "where-to-preorder-pitch-black", label: "Where to preorder Pitch Black" },
    ],
  ),
  page(
    PB,
    "is-there-a-mega-darkrai-card-in-pitch-black",
    "Is there a Mega Darkrai card in Pitch Black?",
    "Is there a Mega Darkrai card in Pitch Black?",
    "Yes — Mega Darkrai ex is the headline chase card of Pitch Black, the set's dark-themed cover star, and is expected to appear with a special-illustration alternate art.",
    [
      "## Yes — Mega Darkrai ex headlines Pitch Black",
      "",
      "**Mega Darkrai ex** is confirmed as the face of Pitch Black and its single biggest chase card. As a Legends: Z-A Mega Dimension boss, it's the natural cover star for the set's dark, gothic theme.",
      "",
      "## Which Mega Darkrai to chase",
      "",
      "Expect at least the standard **Mega Darkrai ex** plus a **special-illustration (alt-art)** version — alt-arts of cover-star Megas are typically the most valuable cards in a Mega Evolution set, so that's the one collectors will pay up for.",
      "",
      "## Building a Darkrai binder",
      "",
      "Want every Darkrai card, not just this one? Once Pitch Black releases you'll be able to slot its Darkrai prints into a [Darkrai binder](/pokemon/darkrai~34an) alongside Darkrai from every other set.",
    ].join("\n"),
    [
      { href: "/pokemon/darkrai~34an", label: "Build a Darkrai binder" },
      { href: "chase-cards-in-pitch-black", label: "Pitch Black chase cards" },
      { href: "what-is-pitch-black", label: "What is Pitch Black?" },
    ],
  ),
  page(
    PB,
    "where-to-preorder-pitch-black",
    "What products and preorders are there for Pitch Black?",
    "Pitch Black products & preorders",
    "Pitch Black launches with the usual lineup: Elite Trainer Box, 36-pack Booster Display, Booster Bundle, a Pokémon Center–exclusive ETB, and a Build & Battle Box available early from July 4.",
    [
      "## Pitch Black product lineup",
      "",
      "Pokémon has confirmed a standard Mega Evolution release slate for Pitch Black:",
      "",
      "- **Elite Trainer Box (ETB)** — packs, sleeves, dice and accessories",
      "- **Booster Display** — 36 booster packs",
      "- **Booster Bundle** — a smaller multi-pack option",
      "- **Pokémon Center–exclusive ETB** — alternate artwork",
      "- **Build & Battle Box** — 4 packs + a 40-card deck, with **1 of 4 foil promos** (Miraidon, Slowbro, Dhelmise or Bastiodon)",
      "",
      "## Getting it early",
      "",
      "The **Build & Battle Box goes on sale at pre-release events from July 4, 2026**, ahead of the July 17 retail launch — the easiest way to open Pitch Black first.",
      "",
      "## A note on prices",
      "",
      "The Pokémon Company hasn't published official MSRPs; figures you'll see (e.g. ETBs around $50–60) are retailer listings and vary by store.",
    ].join("\n"),
    [
      { href: "when-does-pitch-black-come-out", label: "Pitch Black release date" },
      { href: "/binders", label: "Shop binders" },
      { href: "what-is-pitch-black", label: "What is Pitch Black?" },
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
      "Because **every card is foil**, a 30th Celebration master set is unusually chase-heavy. Once the checklist is confirmed we'll add exact figures and a [binder layout](/build) for it.",
    ].join("\n"),
    [
      { href: "what-are-the-30-pikachu-cards-in-30th-celebration", label: "The 30 Pikachu cards" },
      { href: "/build", label: "Plan a binder" },
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
      "We'll fill in the exact count, chase cards and a [binder layout](/build) as Pokémon reveals the set ahead of its November 6, 2026 release.",
    ].join("\n"),
    [
      { href: "what-is-delta-reign", label: "What is Delta Reign?" },
      { href: "is-there-a-mega-rayquaza-card-in-delta-reign", label: "Is Mega Rayquaza in it?" },
      { href: "/build", label: "Plan a binder" },
    ],
  ),
];

export const UPCOMING_FAQ_PAGES: FaqPage[] = [
  ...PITCH_BLACK_PAGES,
  ...CELEBRATION_PAGES,
  ...DELTA_REIGN_PAGES,
];

/** Sets in scope, each with its pages — soonest release first, for the index. */
export function upcomingSetsWithPages(): { set: UpcomingSet; pages: FaqPage[] }[] {
  return UPCOMING_SETS.map((set) => ({
    set,
    pages: UPCOMING_FAQ_PAGES.filter((p) => p.setId === set.id),
  }));
}
