// AUTO-ASSEMBLED content: stats-driven fun-fact articles. Bodies drafted by
// Sonnet writers from verified pokemontcg.io figures (as of June 2026), then
// link-normalised + fact-checked. Edit prose here directly going forward.

export type Article = {
  slug: string;
  /** Headline question — used as the page <h1> and link text. */
  question: string;
  title: string;
  description: string;
  /** ISO publish date. */
  date: string;
  tags: string[];
  /** A primary internal CTA (binder/landing) the article points at. */
  related: { href: string; label: string };
  /** Article body in Markdown (no H1). */
  body: string;
};

export const ARTICLES: Article[] = [
  {
    "slug": "how-many-pokemon-cards-exist",
    "question": "How many Pokémon cards are there in total?",
    "title": "How many Pokémon cards are there in total?",
    "description": "As of June 2026 there are 20,359 Pokémon TCG cards across 173 sets — 17,195 Pokémon, 2,771 Trainers, 393 Energy — by 386 illustrators.",
    "date": "2026-06-12",
    "tags": [
      "counts",
      "overview",
      "sets"
    ],
    "related": {
      "href": "/sets",
      "label": "Browse every set"
    },
    "body": "As of June 2026, there are **20,359 Pokémon TCG cards** spread across 173 sets — and that number keeps climbing with every new release. That figure comes from the pokemontcg.io database that NOMEKOP uses to power your binder layouts, so it stays current as new sets drop.\n\n**TL;DR:** 20,359 cards across 173 sets, drawn by 386 illustrators. Of those, 17,195 are Pokémon, 2,771 are Trainers, and 393 are Energy. The oldest set is the Base Set (9 January 1999), and cards exist for 1,020 National Pokédex numbers. Data from pokemontcg.io, as of June 2026.\n\n## What makes up those 20,000+ cards?\n\nThe breakdown tells a story about the game's design priorities. The vast majority — 17,195 cards — are Pokémon themselves. Trainer cards account for 2,771, covering everything from Supporters and Items to Stadiums. Energy cards make up the remaining 393. It sounds like a small slice, but Energy cards quietly define how every deck runs.\n\n## The people behind the art\n\nOne of the most overlooked facts about the TCG is its scale as an art project. Those 20,359 cards were illustrated by **386 distinct artists**. Some names appear on hundreds of cards; others contributed just a handful of pieces before moving on. The range of styles — from soft watercolour washes to bold graphic compositions — is part of what makes collecting feel personal. You are not just collecting stats; you are collecting someone's work.\n\n## From the Base Set to now\n\nThe oldest set in the database is the **Base Set, released 9 January 1999**. In the years since, the card pool has grown to cover **1,020 distinct National Pokédex numbers**, which means a significant portion of all known Pokémon have at least one card to their name. Tracking down every Pokédex number across sets is itself a popular collecting goal — and a serious binder challenge.\n\n## Ready to organise your slice of 20,359?\n\nNo collector owns them all, but most of us have a corner of that number we care deeply about. Whether you are chasing a favourite illustrator's work, completing a single set, or building a Pokédex run, [browse all 173 sets on NOMEKOP](/sets) and start planning the binder that makes sense for your collection.\n\n---\n\n**Did you know?** With 20,359 cards illustrated by 386 artists, the Pokémon TCG averages more than 52 cards per illustrator — though in practice, the distribution is anything but even."
  },
  {
    "slug": "first-pikachu-card",
    "question": "Which was the first Pikachu card?",
    "title": "Which was the first Pikachu card?",
    "description": "The first Pikachu card was Base Set #58 (January 1999), illustrated by Mitsuhiro Arita. Today there are 176 Pikachu cards across 88 sets.",
    "date": "2026-06-12",
    "tags": [
      "Pikachu",
      "Base Set",
      "history"
    ],
    "related": {
      "href": "/pokemon/pikachu~34an",
      "label": "Build a Pikachu binder"
    },
    "body": "The very first Pikachu card was **Pikachu #58 from the Base Set**, released on January 9, 1999. Illustrated by Mitsuhiro Arita, it was a Common-rarity card — nothing flashy on paper, yet it kicked off one of the most collected runs in the entire game.\n\n**TL;DR:** The first Pikachu card was Base Set #58 (9 January 1999), a Common illustrated by Mitsuhiro Arita. Since then, Pikachu has appeared on 176 cards across 88 sets — more prints than any other Pokémon. Figures as of June 2026.\n\n## A humble beginning\n\nBeing a Common meant Pikachu #58 was never hard to pull. You could find it in virtually any Base Set pack, which is part of why so many collectors have a soft spot for it: it was probably the first Pikachu most of us ever held. Arita's artwork — that cheerful, sparky pose — became the mental image of \"Pikachu card\" for a whole generation of players.\n\n## 25+ years and counting\n\nFrom that single 1999 print, the Pikachu card library has grown enormously. As of June 2026, there are **176 Pikachu cards across 88 different sets** — a spread that covers everything from basic Commons to elaborate special illustration rares. No other Pokémon comes close to that kind of sustained presence across the game's history, which makes sense: Pikachu is the franchise's face, and the TCG has leaned into that at every opportunity.\n\n## Why collectors keep chasing every print\n\nWith 176 versions spread across 88 sets, a complete Pikachu collection is one of the hobby's great personal projects. Each era brings a different art style, a different card frame, and often a different take on the character — from retro Base Set charm to modern full-art treatments. If you want to see every print laid out in one place and start planning your own collection, you can [build an \"every Pikachu print\" binder on NOMEKOP](/pokemon/pikachu~34an) and work through them set by set. The [Base Set page](/set/base1) is a good place to get acquainted with where it all started.\n\n---\n\n**Did you know?** Pikachu #58 is a Common, yet near-mint graded copies of the first-edition Base Set print are among the most sought-after cards in the entire hobby."
  },
  {
    "slug": "how-many-charizard-cards",
    "question": "How many Charizard cards are there?",
    "title": "How many Charizard cards are there?",
    "description": "There are 107 cards named Charizard spread across 50 sets, starting with the iconic Base Set #4 holographic card illustrated by Mitsuhiro Arita.",
    "date": "2026-06-12",
    "tags": [
      "Charizard",
      "counts",
      "Base Set"
    ],
    "related": {
      "href": "/pokemon/charizard~34an",
      "label": "Build a Charizard binder"
    },
    "body": "There are **107 cards simply named Charizard** spread across 50 different sets, as of June 2026. That makes the Fire-type favorite one of the most-printed Pokémon in the entire TCG — a testament to how thoroughly collectors have chased that flame-winged silhouette since the very beginning.\n\n**TL;DR:** 107 cards are named exactly \"Charizard\", across 50 sets (variants like Charizard ex or Dark Charizard are excluded). It started with the holographic Base Set #4 (1999), illustrated by Mitsuhiro Arita. Figures as of June 2026.\n\n## Where it all started\n\nThe card that started everything is Charizard #4 from the 1999 Base Set, illustrated by Mitsuhiro Arita with the now-iconic holographic treatment. That Rare Holo finish made it the definitive chase card of the early TCG era, and its reputation has only grown in the decades since. Arita's composition — Charizard breathing fire against a dark background — remains one of the most recognisable images in the hobby.\n\n## What the count includes (and what it doesn't)\n\nThese 107 cards are strictly those printed with the name \"Charizard.\" The tally deliberately excludes cards with modified names like Dark Charizard, Charizard ex, Shadow Charizard, or any other variant that carries extra words in the name. Include those and the true universe of Charizard-adjacent cards grows considerably larger. The 107 figure is the clean, literal count — the ones that simply say \"Charizard\" at the top.\n\n## Fifty sets and counting\n\nAppearing in 50 distinct sets is a remarkable spread. It means Charizard has shown up in roughly a third of all mainline TCG expansions, through every era of the game from Wizards of the Coast through to the modern era. Each new generation of collectors tends to get at least one standout Charizard card to chase, which is a large part of why interest in the character never really cools.\n\n## Build your own Charizard collection\n\nIf you want to see every one of those 107 cards laid out in one place — or start planning which ones deserve a spot in your binder — [build a Charizard binder on NOMEKOP](/pokemon/charizard~34an) and see the full picture at a glance.\n\n---\n\n**Did you know?** That first Base Set Charizard was drawn by Mitsuhiro Arita, who has since illustrated 721 cards across the whole game."
  },
  {
    "slug": "most-printed-pokemon",
    "question": "Which Pokémon appears on the most cards?",
    "title": "Which Pokémon appears on the most cards?",
    "description": "Pikachu leads with 104 cards by exact name (176 counting variants), ahead of Eevee and Raichu — across 1,020 species with cards.",
    "date": "2026-06-12",
    "tags": [
      "Pikachu",
      "Eevee",
      "counts"
    ],
    "related": {
      "href": "/pokemon/pikachu~34an",
      "label": "Build a Pikachu binder"
    },
    "body": "Pikachu holds the record by a comfortable margin — 104 cards carry the exact species name \"Pikachu\" in the Pokémon TCG, as of June 2026. That's more than any other species, with Eevee in second place at 66 and Raichu at 45. When you broaden the count to include named variants like Pikachu VMAX or Surfing Pikachu, the total jumps to 176 cards — nearly twice the strict-name figure.\n\n**TL;DR:** Pikachu appears on the most cards — 104 by exact name (176 counting variants), ahead of Eevee (66) and Raichu (45). The TCG has issued cards for all 1,020 National Pokédex numbers. Figures as of June 2026.\n\n## The top of the pile\n\nThe full leaderboard for exact species name matches makes for interesting reading. After Pikachu and Eevee come some perhaps surprising names: Magnemite (43), Charmander (42), and then a tie between Magneton and Snorlax at 40 cards each. Charmander's appearance near the top makes sense — as the most collectible of the original starters, it has been revisited in almost every era of the game. Magnemite and Magneton sitting this high is a fun reminder of how generously the early sets distributed certain Pokémon across multiple card designs.\n\n## Why Pikachu pulls ahead\n\nPikachu's count reflects its unique position as the franchise's mascot. Promotional sets, event cards, regional variants, and collaboration releases have given Pikachu a card presence that no other species can match. Many of those 176 named-variant cards exist purely as collectibles — limited prints tied to specific tournaments, retail partnerships, or anniversaries — rather than as competitive staples.\n\n## 1,020 species, one card each (at minimum)\n\nThe TCG has issued cards for all 1,020 distinct National Pokédex numbers, so every species has at least made an appearance. The gap between Pikachu at the top and the many species with just a handful of cards illustrates how uneven that distribution really is.\n\nIf you collect a single Pokémon across every printing, [building a dedicated one-Pokémon binder on NOMEKOP](/pokemon/pikachu~34an) is a satisfying way to see exactly how deep that rabbit hole goes — give it a try with Pikachu or any other species.\n\n---\n\n**Did you know?** Eevee's second-place finish at 66 cards likely reflects its eight Eeveelution evolutions, which give designers a strong reason to keep printing its base form alongside each new Eeveelution release."
  },
  {
    "slug": "most-prolific-pokemon-illustrators",
    "question": "Who has illustrated the most Pokémon cards?",
    "title": "The most prolific Pokémon TCG illustrators",
    "description": "5ban Graphics leads with 1,627 cards, ahead of Ken Sugimori (1,109) and Mitsuhiro Arita (721), among 386 credited illustrators.",
    "date": "2026-06-12",
    "tags": [
      "illustrators",
      "artists",
      "Ken Sugimori"
    ],
    "related": {
      "href": "/illustrator",
      "label": "Browse illustrator binders"
    },
    "body": "The studio **5ban Graphics** has illustrated the most Pokémon TCG cards of any credited contributor, with a staggering **1,627 cards** to their name — more than any individual artist. As of June 2026, the Pokémon TCG credits **386 distinct illustrators** in total, ranging from prolific studios to artists who contributed just a handful of cards.\n\n**TL;DR:** 5ban Graphics leads all illustrators with 1,627 cards, ahead of Ken Sugimori (1,109) and Mitsuhiro Arita (721). The TCG credits 386 distinct illustrators in total. Figures as of June 2026.\n\n## Why a studio sits at the top\n\n5ban Graphics is a digital art collective rather than a solo illustrator, which explains how they pulled so far ahead of any individual. Their clean, high-energy digital style became the go-to look for many EX and GX era cards, and the sheer volume of product the TCG releases each year means a studio with reliable output can accumulate totals that no single artist can match.\n\n## The human heavy-hitters\n\nBehind 5ban Graphics, the rankings read like a hall of fame for longtime fans. **Ken Sugimori** comes second with 1,109 cards — remarkable considering he is also the original character designer for the Pokémon franchise itself, making him arguably the single most influential person in the hobby. **Mitsuhiro Arita** sits third at 721 cards; collectors who have been around since the very beginning will know his name from the iconic Base Set Charizard, one of the most recognised cards ever printed.\n\nRounding out the top tier: **Kagemaru Himeno** (656), **Kouki Saitou** (651), **Masakazu Fukuda** (472), **Ryo Ueda** (463), and **Atsuko Nishida** (407). Each of those totals represents years of work across dozens of sets and expansions.\n\n## Digging into an illustrator's body of work\n\nOne of the most satisfying rabbit holes in the hobby is pulling up every card a single artist has produced — seeing how their style evolved, spotting recurring Pokémon they seem to love, or hunting down underappreciated gems buried in older sets. You can do exactly that on NOMEKOP: [browse any illustrator's full catalogue](/illustrator) — including Ken Sugimori's thousand-plus cards — and build a binder around their work in just a few clicks.\n\n---\n**Did you know?** If you collected one card from every credited illustrator in the TCG, you would need at least 386 cards — and that number keeps climbing with every new set."
  },
  {
    "slug": "biggest-pokemon-tcg-sets",
    "question": "What are the biggest Pokémon TCG sets?",
    "title": "What are the biggest Pokémon TCG sets?",
    "description": "Ascended Heroes (295 cards) is the largest standard expansion; the SWSH Black Star Promos top everything at 304. The game spans 173 sets and 20,359 cards.",
    "date": "2026-06-12",
    "tags": [
      "sets",
      "counts",
      "Fusion Strike"
    ],
    "related": {
      "href": "/sets",
      "label": "Browse every set"
    },
    "body": "By total card count, the biggest standard Pokémon TCG expansion is **Ascended Heroes**, with 295 cards — though the SWSH Black Star Promos top everything at 304 (that one is a long-running promo series rather than a traditional expansion). Rounding out the biggest releases are Fusion Strike (284), Paldea Evolved (279), Cosmic Eclipse (272), and Paradox Rift (266), all as of June 2026.\n\n**TL;DR:** Ascended Heroes (295 cards) is the largest standard expansion; the SWSH Black Star Promos top everything at 304 (a promo series, not a traditional set). Next come Fusion Strike (284), Paldea Evolved (279), Cosmic Eclipse (272), and Paradox Rift (266). The game spans 173 sets and 20,359 cards. Figures as of June 2026.\n\n## What makes a set \"big\"?\n\nCard counts include secret rares — the full-art cards, gold cards, and other chase pulls printed beyond a set's official numbered total. A set might be listed as having 198 cards in its base numbering, yet the true collector's checklist stretches considerably further once you factor in those extras. That's why serious collectors track the complete card count rather than the number on the bottom of the card.\n\n## The scale of the whole game\n\nZoom out and the numbers get genuinely staggering. Across all 173 sets, the Pokémon TCG has produced 20,359 cards — a figure that keeps climbing with every new release. Even a collector who has been at it for decades has only scratched the surface of what exists. If you have ever wondered how many pages your binder would need to hold a complete run of a particular era, the answer is almost always \"more than you think.\"\n\n## Why binder layout matters more for big sets\n\nThe bigger the set, the more planning goes into storing it well. A 284-card set like Fusion Strike fills binders differently depending on whether you are sleeving singles, doubles, or leaving placeholder slots for cards still on your want list. Getting the page count right before you start saves a lot of reshuffling later. You can [see every set's card list and page counts at the NOMEKOP sets page](/sets) — a handy starting point if you want to build out a binder for any of these giants.\n\n**Did you know?** The six biggest expansions listed here account for about 8% of every card ever printed in the Pokémon TCG."
  }
];

export const articleSlugs = ARTICLES.map((a) => a.slug);

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}
