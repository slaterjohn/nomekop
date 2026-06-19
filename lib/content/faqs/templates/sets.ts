import type { FaqPage, FaqSetFacts } from "@/lib/content/faqs/types";
import { setFaqSlug } from "@/lib/content/faqs/slug";
import { num, pocketTable, possessive } from "@/lib/content/faqs/format";

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

export function binderSizePage(s: FaqSetFacts): FaqPage {
  const slug = setFaqSlug("binder-size", s.slug);
  const description =
    `The best binder for ${s.name} is a 9-pocket; the ${num(s.printedTotal)}-card set fills ` +
    `about ${Math.ceil(s.printedTotal / 9)} pages, or ${Math.ceil(s.masterSetCount / 9)} for a master set.`;
  const body = [
    `**${description}**`,
    "",
    `Nine-pocket binders are the collector default — they show a full 3×3 spread and sleeve ` +
      `${possessive(s.name)} ${num(s.printedTotal)} base cards neatly. Here's the page count per size:`,
    "",
    `**Base set (${num(s.printedTotal)} cards):**`,
    pocketTable(s.printedTotal),
    "",
    `**Master set (${num(s.masterSetCount)} cards):**`,
    pocketTable(s.masterSetCount),
    "",
    `In a 9-pocket binder, the base set fills ${num(Math.ceil(s.printedTotal / 9))} pages, and a full master set needs ${num(Math.ceil(s.masterSetCount / 9))}.`,
    "",
    "Figures from the pokemontcg.io dataset, as of June 2026.",
  ].join("\n");
  return {
    slug, type: "binder-size", setId: s.id,
    question: `What's the best binder size for ${s.name}?`,
    title: `What's the best binder size for ${s.name}?`,
    description, body,
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
  const description = `${s.name} was released on ${when}, in the ${s.series} series.`;
  const body = [
    `**${description}**`,
    "",
    `${s.name} is a ${s.series}-series expansion with ${num(s.printedTotal)} cards in the main ` +
      `set (${num(s.total)} including secret rares), and it landed on ${when}.`,
    "",
    `It's the #${s.sizeRankAmongRecent} largest of the 20 most recent sets.`,
    "",
    "Figures from the pokemontcg.io dataset, as of June 2026.",
  ].join("\n");
  return {
    slug, type: "release-date", setId: s.id,
    question: `When did ${s.name} come out?`,
    title: `When did ${s.name} come out? (Release date)`,
    description, body,
    related: [
      { href: setFaqSlug("card-count", s.slug), label: `How many cards in ${s.name}` },
      { href: `/set/${s.id}`, label: `Browse ${s.name}` },
    ],
  };
}

/** Only call when s.hasBallPatterns is true. */
export function ballPatternsPage(s: FaqSetFacts): FaqPage {
  const slug = setFaqSlug("ball-patterns", s.slug);
  const description =
    `Yes — ${s.name} has ${num(s.pokeballCount)} Poké Ball and ${num(s.masterballCount)} Master Ball pattern cards.`;
  const body = [
    `**${description}**`,
    "",
    `${s.name} is one of the few sets with Poké Ball and Master Ball mirror cards — foils stamped ` +
      `with a repeating ball pattern. The Poké Ball pattern covers ${num(s.pokeballCount)} cards ` +
      `(roughly the reverse-holo pool), while the rarer Master Ball pattern appears on ` +
      `${num(s.masterballCount)} Pokémon.`,
    "",
    `They're why a ${s.name} master set balloons to ${num(s.masterSetCount)} cards.`,
    "",
    "Figures from the pokemontcg.io dataset, as of June 2026.",
  ].join("\n");
  return {
    slug, type: "ball-patterns", setId: s.id,
    question: `Does ${s.name} have Poké Ball and Master Ball pattern cards?`,
    title: `Does ${s.name} have Poké Ball & Master Ball cards?`,
    description, body,
    related: [
      { href: setFaqSlug("master-set", s.slug), label: `${s.name} master set size` },
      { href: `/build?set=${s.id}&mode=master&pb=1&mb=1`, label: `Build the ${s.name} master set` },
    ],
  };
}
