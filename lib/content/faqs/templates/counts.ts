import type { FaqPage, FaqSetFacts } from "@/lib/content/faqs/types";
import { setFaqSlug } from "@/lib/content/faqs/slug";
import { num, cardLabel } from "@/lib/content/faqs/format";

const SITE_FIGURES_NOTE = "Figures are from the pokemontcg.io dataset, as of June 2026.";

export function cardCountPage(s: FaqSetFacts): FaqPage {
  const slug = setFaqSlug("card-count", s.slug);
  const description =
    `${s.name} has ${num(s.printedTotal)} cards in the main set, or ${num(s.total)} ` +
    `including its ${num(s.secretCount)} secret rares.`;
  const body = [
    `**${description}**`,
    "",
    `That ${num(s.printedTotal)}-card base set breaks down into ${num(s.pokemonCount)} ` +
      `Pokémon, ${num(s.trainerCount)} Trainers and ${num(s.energyCount)} Energy. ` +
      `Numbers above ${s.printedTotal} are the secret rares — the "chase" cards numbered ` +
      `beyond the printed total.`,
    "",
    `Among the 20 most recent sets, ${s.name} ranks **#${s.sizeRankAmongRecent} by size**. ` +
      `If you're chasing a full master set (every reverse holo and parallel too), that count ` +
      `climbs to ${num(s.masterSetCount)} cards.`,
    "",
    SITE_FIGURES_NOTE,
  ].join("\n");
  return {
    slug, type: "card-count", setId: s.id,
    question: `How many cards are in ${s.name}?`,
    title: `How many cards are in ${s.name}? (${s.printedTotal}-card set)`,
    description, body,
    related: [
      { href: `/set/${s.id}`, label: `See every ${s.name} card` },
      { href: setFaqSlug("master-set", s.slug), label: `${s.name} master set size` },
      { href: setFaqSlug("secret-rares", s.slug), label: `Secret rares in ${s.name}` },
      { href: `/build?set=${s.id}`, label: `Plan a ${s.name} binder` },
    ],
  };
}

export function masterSetPage(s: FaqSetFacts): FaqPage {
  const slug = setFaqSlug("master-set", s.slug);
  const description =
    `A ${s.name} master set is ${num(s.masterSetCount)} cards — every card plus its ` +
    `${num(s.reverseHoloCount)} reverse holos${s.hasBallPatterns ? " and Poké Ball / Master Ball patterns" : ""}.`;
  const body = [
    `**${description}**`,
    "",
    `A master set means one of everything: each of the ${num(s.total)} cards, every reverse ` +
      `holo (${num(s.reverseHoloCount)} of them)${s.hasBallPatterns
        ? `, plus the ${num(s.pokeballCount)} Poké Ball and ${num(s.masterballCount)} Master Ball mirror cards unique to this set`
        : ""}. Add it up and you're sleeving **${num(s.masterSetCount)} cards** — versus ${num(s.printedTotal)} for the base set.`,
    "",
    `That's roughly ${(s.masterSetCount / s.printedTotal).toFixed(1)}× the base set, so plan your ` +
      `binder space accordingly.`,
    "",
    SITE_FIGURES_NOTE,
  ].join("\n");
  return {
    slug, type: "master-set", setId: s.id,
    question: `How many cards are in a ${s.name} master set?`,
    title: `How many cards are in a ${s.name} master set? (${s.masterSetCount})`,
    description, body,
    related: [
      { href: setFaqSlug("binder-size", s.slug), label: `Best binder size for ${s.name}` },
      { href: setFaqSlug("reverse-holos", s.slug), label: `Reverse holos in ${s.name}` },
      ...(s.hasBallPatterns ? [{ href: setFaqSlug("ball-patterns", s.slug), label: `${s.name} ball patterns` }] : []),
      { href: `/build?set=${s.id}&mode=master`, label: `Build the ${s.name} master set` },
    ],
  };
}

export function secretRaresPage(s: FaqSetFacts): FaqPage {
  const slug = setFaqSlug("secret-rares", s.slug);
  const description =
    `${s.name} has ${num(s.secretCount)} secret rares — cards numbered above ${s.printedTotal}.`;
  const body = [
    `**${description}**`,
    "",
    `Secret rares are the cards numbered beyond the printed total of ${s.printedTotal} — so in ` +
      `${s.name}, anything from #${s.printedTotal + 1} to #${s.total}. They're the hardest pulls ` +
      `and usually the priciest cards in the set.`,
    "",
    `The rarest of the lot is ${cardLabel(s.rarestCard)}${s.rarestCard.rarity ? `, a ${s.rarestCard.rarity}` : ""}.`,
    "",
    SITE_FIGURES_NOTE,
  ].join("\n");
  return {
    slug, type: "secret-rares", setId: s.id,
    question: `How many secret rares are in ${s.name}?`,
    title: `How many secret rares are in ${s.name}? (${s.secretCount})`,
    description, body,
    related: [
      { href: setFaqSlug("rarest-card", s.slug), label: `Rarest card in ${s.name}` },
      { href: setFaqSlug("chase-cards", s.slug), label: `${s.name} chase cards` },
      { href: setFaqSlug("illustration-rares", s.slug), label: `Illustration Rares in ${s.name}` },
      { href: `/set/${s.id}`, label: `Browse ${s.name}` },
    ],
  };
}

export function illustrationRaresPage(s: FaqSetFacts): FaqPage {
  const slug = setFaqSlug("illustration-rares", s.slug);
  const description =
    `${s.name} has ${num(s.illustrationRareCount)} Illustration Rares and Special Illustration Rares.`;
  const body = [
    `**${description}**`,
    "",
    `Illustration Rares (IR) and Special Illustration Rares (SIR) are the full-art, ` +
      `scene-style cards collectors chase hardest. ${s.name} packs ${num(s.illustrationRareCount)} ` +
      `of them into its ${num(s.total)} cards.`,
    "",
    `They're a big chunk of why a ${s.name} master set runs to ${num(s.masterSetCount)} cards.`,
    "",
    SITE_FIGURES_NOTE,
  ].join("\n");
  return {
    slug, type: "illustration-rares", setId: s.id,
    question: `How many Illustration Rares are in ${s.name}?`,
    title: `How many Illustration Rares are in ${s.name}?`,
    description, body,
    related: [
      { href: setFaqSlug("chase-cards", s.slug), label: `${s.name} chase cards` },
      { href: setFaqSlug("rarest-card", s.slug), label: `Rarest card in ${s.name}` },
      { href: `/set/${s.id}`, label: `Browse ${s.name}` },
    ],
  };
}

export function reverseHolosPage(s: FaqSetFacts): FaqPage {
  const slug = setFaqSlug("reverse-holos", s.slug);
  const description = `${s.name} has ${num(s.reverseHoloCount)} cards with a reverse holo version.`;
  const body = [
    `**${description}**`,
    "",
    `Reverse holos foil the card body instead of the artwork, and most commons, uncommons ` +
      `and non-holo rares get one. In ${s.name} that's ${num(s.reverseHoloCount)} extra cards to ` +
      `track for a master set.`,
    "",
    `Counting reverse holos${s.hasBallPatterns ? " and ball patterns" : ""}, a full ${s.name} ` +
      `master set is ${num(s.masterSetCount)} cards.`,
    "",
    SITE_FIGURES_NOTE,
  ].join("\n");
  return {
    slug, type: "reverse-holos", setId: s.id,
    question: `How many reverse holo cards are in ${s.name}?`,
    title: `How many reverse holo cards are in ${s.name}?`,
    description, body,
    related: [
      { href: setFaqSlug("master-set", s.slug), label: `${s.name} master set size` },
      { href: setFaqSlug("binder-size", s.slug), label: `Best binder size for ${s.name}` },
      { href: `/build?set=${s.id}&mode=master`, label: `Build the ${s.name} master set` },
    ],
  };
}
