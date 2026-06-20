import type { FaqPage, FaqSetFacts } from "@/lib/content/faqs/types";
import { indefiniteArticle, setFaqSlug } from "@/lib/content/faqs/slug";
import { num, pocketTable, possessive, cardLabel, cardBullet, money, joinAnd } from "@/lib/content/faqs/format";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2025/01/17" → "17 January 2025". */
function prettyDate(releaseDate: string): string {
  const [y, m, d] = releaseDate.split("/").map(Number);
  if (!y || !m || !d) return releaseDate;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

function marqueePhrase(s: FaqSetFacts, limit = 5): string {
  return joinAnd(s.marqueePokemon.slice(0, limit).map((p) => p.displayName));
}

/** Bulleted marquee species, each listing its actual card names in the set. */
function marqueeBullets(s: FaqSetFacts, limit = 5): string {
  return s.marqueePokemon
    .slice(0, limit)
    .map((p) => `- **${p.displayName}** — ${p.cards.map((c) => cardLabel(c)).join(", ")}`)
    .join("\n");
}

export function binderSizePage(s: FaqSetFacts): FaqPage {
  const slug = setFaqSlug("binder-size", s.slug);
  const basePages = Math.ceil(s.printedTotal / 9);
  const masterPages = Math.ceil(s.masterSetCount / 9);
  const description =
    `The best binder for ${s.name} is a 9-pocket; the ${num(s.printedTotal)}-card set fills ` +
    `about ${basePages} pages, or ${masterPages} for a master set.`;
  const chase = s.chaseCards.slice(0, 4);
  const body = [
    `**${description}**`,
    "",
    `## Why 9-pocket suits ${s.name}`,
    "",
    `A 9-pocket binder shows a full 3×3 spread and sleeves ${possessive(s.name)} ${num(s.printedTotal)} ` +
      `base cards in numbered order with no wasted slots. A 4-pocket is nice for a slim display of just ` +
      `the chase cards` + (chase.length ? ` like ${joinAnd(chase.map((c) => c.name))}` : "") +
      `; a 12-pocket fits more per page but is bulkier to flip. For a full set, 9-pocket is the sweet spot.`,
    "",
    `## ${s.name} pages per binder size`,
    "",
    `**Base set (${num(s.printedTotal)} cards):**`,
    pocketTable(s.printedTotal),
    "",
    `**Master set (${num(s.masterSetCount)} cards):**`,
    pocketTable(s.masterSetCount),
    "",
    `## Displaying the ${s.name} chase cards`,
    "",
    `If you'd rather build a one-page showcase than a full binder, these are the cards worth front-and-center:`,
    "",
    chase.map(cardBullet).join("\n"),
    "",
    `## What that means for ${s.name}`,
    "",
    `In a 9-pocket binder the base set fills ${num(basePages)} pages. Going for the full master set — ` +
      `all ${num(s.masterSetCount)} cards including ${num(s.reverseHoloCount)} reverse holos` +
      (s.hasBallPatterns ? ` and the Poké Ball / Master Ball patterns` : "") +
      ` — pushes that to ${num(masterPages)} pages, so budget a binder (or two) and the sleeves to match. ` +
      `Star Pokémon like ${marqueePhrase(s, 3)} are worth a dedicated spread of their own.`,
    "",
    `A common setup for ${s.name}: one 9-pocket binder of about ${num(basePages)} pages for the base ` +
      `${num(s.printedTotal)} cards, kept in number order, and a second binder for the ` +
      `${num(s.reverseHoloCount)} reverse holos and ${num(s.secretCount)} secret rares. Premium ` +
      `side-loading sleeves are worth it for the ${num(s.illustrationRareCount)} full-art chase cards.`,
    "",
    "Figures from the pokemontcg.io dataset, as of June 2026.",
  ].join("\n");
  return {
    slug, type: "binder-size", setId: s.id,
    question: `What's the best binder size for ${s.name}?`,
    title: `What's the best binder size for ${s.name}?`,
    description, body,
    cards: chase,
    related: [
      { href: setFaqSlug("card-count", s.slug), label: `How many cards in ${s.name}` },
      { href: setFaqSlug("master-set", s.slug), label: `${s.name} master set size` },
      { href: `/build?set=${s.id}`, label: `Plan your ${s.name} binder` },
      { href: "/binders", label: "Shop binders" },
    ],
  };
}

export function releaseDatePage(s: FaqSetFacts): FaqPage {
  const slug = setFaqSlug("release-date", s.slug);
  const when = prettyDate(s.releaseDate);
  const year = s.releaseDate.split("/")[0];
  const description = `${s.name} was released on ${when}, in the ${s.series} series.`;
  const rankLine =
    s.sizeRankAmongRecent === 1
      ? `the largest of the 20 most recent sets`
      : s.sizeRankAmongRecent === 20
        ? `the smallest of the 20 most recent sets`
        : `the #${s.sizeRankAmongRecent} largest of the 20 most recent sets`;
  const mvp = s.mostValuableCard;
  const chase = s.chaseCards.slice(0, 5);
  const body = [
    `**${description}**`,
    "",
    `## ${s.name} release date`,
    "",
    `${s.name} launched on ${when} as a ${s.series}-series expansion. It carries ${num(s.printedTotal)} ` +
      `main-set cards, or ${num(s.total)} counting its ${num(s.secretCount)} secret rares — ` +
      `${rankLine} by printed count, with ${num(s.illustrationRareCount)} Illustration and Special ` +
      `Illustration Rares in the pool and marquee Pokémon like ${marqueePhrase(s)}.`,
    "",
    `## What the ${year} set brought`,
    "",
    `The standout cards that arrived with ${s.name}:`,
    "",
    chase.map(cardBullet).join("\n"),
    "",
    (mvp
      ? `Its top card on the secondary market is ${cardLabel(mvp)}` +
        (typeof mvp.marketPrice === "number" ? `, around ${money(mvp.marketPrice)}.` : ".")
      : `Its rarest pull is ${cardLabel(s.rarestCard)}` +
        (s.rarestCard.rarity ? `, ${indefiniteArticle(s.rarestCard.rarity)} ${s.rarestCard.rarity}.` : ".")),
    "",
    `## Star Pokémon from the ${s.name} release`,
    "",
    `The marquee Pokémon that debuted (or returned) in ${s.name}, with their prints:`,
    "",
    marqueeBullets(s),
    "",
    `## Where ${s.name} sits in the lineup`,
    "",
    `Among the 20 newest sets tracked here, ${s.name} is ${rankLine}. A full master set of it runs to ` +
      `${num(s.masterSetCount)} cards including ${num(s.reverseHoloCount)} reverse holos, so the ${when} ` +
      `release still gives collectors plenty to chase well after launch day — whether you're after the ` +
      `${num(s.printedTotal)}-card base set or every print.`,
    "",
    "Figures from the pokemontcg.io dataset, as of June 2026.",
  ].join("\n");
  return {
    slug, type: "release-date", setId: s.id,
    question: `When did ${s.name} come out?`,
    title: `When did ${s.name} come out? (Release date)`,
    description, body,
    cards: chase,
    related: [
      { href: setFaqSlug("card-count", s.slug), label: `How many cards in ${s.name}` },
      { href: setFaqSlug("chase-cards", s.slug), label: `${s.name} chase cards` },
      { href: `/set/${s.id}`, label: `Browse ${s.name}` },
    ],
  };
}

/** Only call when s.hasBallPatterns is true. */
export function ballPatternsPage(s: FaqSetFacts): FaqPage {
  const slug = setFaqSlug("ball-patterns", s.slug);
  const description =
    `Yes — ${s.name} has ${num(s.pokeballCount)} Poké Ball and ${num(s.masterballCount)} Master Ball pattern cards.`;
  const totalBall = s.pokeballCount + s.masterballCount;
  const chase = s.chaseCards.slice(0, 4);
  const body = [
    `**${description}**`,
    "",
    `## ${possessive(s.name)} ball-pattern cards`,
    "",
    `${s.name} is one of the few sets with Poké Ball and Master Ball mirror cards — reverse-style foils ` +
      `stamped with a repeating ball motif instead of the usual holo sheen. Each is a separate variant ` +
      `on top of the normal print, so every one is its own card to chase.`,
    "",
    `## How many ball-pattern cards in ${s.name}?`,
    "",
    `The Poké Ball pattern covers ${num(s.pokeballCount)} cards — close to the reverse-holo pool — while ` +
      `the rarer Master Ball pattern hits ${num(s.masterballCount)} Pokémon, ${num(totalBall)} ball cards ` +
      `in all. The Master Ball versions are among the toughest pulls in the set.`,
    "",
    `## Star Pokémon to find in pattern form`,
    "",
    `The marquee Pokémon worth hunting Poké Ball and Master Ball copies of in ${s.name}:`,
    "",
    marqueeBullets(s),
    ...(chase.length
      ? ["", `They sit alongside ${possessive(s.name)} headline chase cards:`, "",
          chase.map(cardBullet).join("\n")]
      : []),
    "",
    `## Why the patterns inflate ${s.name}`,
    "",
    `Because both patterns count toward a complete set, they're the main reason a ${s.name} master set ` +
      `balloons to ${num(s.masterSetCount)} cards versus ${num(s.printedTotal)} for the base. Plan binder ` +
      `space for the ${num(totalBall)} ball variants too if you're going for everything — that's roughly ` +
      `${num(Math.ceil(totalBall / 9))} extra 9-pocket pages on top of the base ${s.name} run, and the ` +
      `${num(s.masterballCount)} Master Ball cards are the ones to hunt first.`,
    "",
    "Figures from the pokemontcg.io dataset, as of June 2026.",
  ].join("\n");
  return {
    slug, type: "ball-patterns", setId: s.id,
    question: `Does ${s.name} have Poké Ball and Master Ball pattern cards?`,
    title: `Does ${s.name} have Poké Ball & Master Ball cards?`,
    description, body,
    cards: chase,
    related: [
      { href: setFaqSlug("master-set", s.slug), label: `${s.name} master set size` },
      { href: setFaqSlug("reverse-holos", s.slug), label: `Reverse holos in ${s.name}` },
      { href: `/build?set=${s.id}&mode=master&pb=1&mb=1`, label: `Build the ${s.name} master set` },
    ],
  };
}
