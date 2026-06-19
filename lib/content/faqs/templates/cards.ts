import type { FaqPage, FaqSetFacts } from "@/lib/content/faqs/types";
import { setFaqSlug } from "@/lib/content/faqs/slug";
import { money, cardLabel, possessive } from "@/lib/content/faqs/format";

const NOTE = "Figures are from the pokemontcg.io dataset (TCGplayer pricing), as of June 2026.";

export function rarestCardPage(s: FaqSetFacts): FaqPage {
  const c = s.rarestCard;
  const slug = setFaqSlug("rarest-card", s.slug);
  const description =
    `The rarest card in ${s.name} is ${cardLabel(c)}${c.rarity ? `, a ${c.rarity}` : ""}.`;
  const valuableLine =
    s.mostValuableCard && s.mostValuableCard.id !== c.id
      ? `Rarity and price don't always line up — by market value, the priciest card is ` +
        `${cardLabel(s.mostValuableCard)}.`
      : "It's also one of the set's most sought-after pulls.";
  const body = [
    `**${description}**`,
    "",
    `${c.name} sits at the top of ${possessive(s.name)} rarity ladder${c.rarity ? ` as a ${c.rarity}` : ""}, ` +
      `numbered #${c.number}. ${valuableLine}`,
    "",
    NOTE,
  ].join("\n");
  return {
    slug, type: "rarest-card", setId: s.id,
    question: `What is the rarest card in ${s.name}?`,
    title: `What is the rarest card in ${s.name}?`,
    description, body,
    related: [
      { href: `/card/${c.id}`, label: `View ${c.name}` },
      ...(s.mostValuableCard ? [{ href: setFaqSlug("valuable-card", s.slug), label: `Most valuable ${s.name} card` }] : []),
      { href: setFaqSlug("chase-cards", s.slug), label: `${s.name} chase cards` },
      { href: setFaqSlug("secret-rares", s.slug), label: `Secret rares in ${s.name}` },
    ],
  };
}

/** Only call when s.mostValuableCard is defined. */
export function valuableCardPage(s: FaqSetFacts): FaqPage {
  const c = s.mostValuableCard!;
  const slug = setFaqSlug("valuable-card", s.slug);
  const priceText = typeof c.marketPrice === "number" ? ` at about ${money(c.marketPrice)}` : "";
  const description = `The most valuable card in ${s.name} is ${cardLabel(c)}${priceText}.`;
  const body = [
    `**${description}**`,
    "",
    `${c.name} (#${c.number}${c.rarity ? `, ${c.rarity}` : ""}) tops ${s.name} on the secondary ` +
      `market${priceText ? `, trading around ${money(c.marketPrice!)}` : ""}. Prices move constantly — ` +
      `treat this as a snapshot, not a quote.`,
    "",
    `It isn't always the *rarest* card by print rarity — see the rarest-card breakdown below.`,
    "",
    NOTE,
  ].join("\n");
  return {
    slug, type: "valuable-card", setId: s.id,
    question: `What is the most valuable card in ${s.name}?`,
    title: `What is the most valuable card in ${s.name}?`,
    description, body,
    related: [
      { href: `/card/${c.id}`, label: `View ${c.name}` },
      { href: setFaqSlug("rarest-card", s.slug), label: `Rarest card in ${s.name}` },
      { href: setFaqSlug("chase-cards", s.slug), label: `${s.name} chase cards` },
    ],
  };
}

export function chaseCardsPage(s: FaqSetFacts): FaqPage {
  const slug = setFaqSlug("chase-cards", s.slug);
  const top = s.chaseCards.slice(0, 6);
  const lead = top[0]!;
  const description =
    `The chase cards in ${s.name} include ${top.slice(0, 3).map((c) => c.name).join(", ")} ` +
    `and other Illustration/Hyper Rares.`;
  const list = top.map((c) => `- [${cardLabel(c)}${c.rarity ? ` — ${c.rarity}` : ""}](/card/${c.id})`).join("\n");
  const body = [
    `**${description}**`,
    "",
    `Every set has a few cards everyone's hunting. In ${s.name}, the headliners are:`,
    "",
    list,
    "",
    `${lead.name} is the one most collectors open packs for.` +
      (s.mostValuableCard ? ` By price, ${cardLabel(s.mostValuableCard)} leads the set.` : ""),
    "",
    NOTE,
  ].join("\n");
  return {
    slug, type: "chase-cards", setId: s.id,
    question: `What are the chase cards in ${s.name}?`,
    title: `What are the chase cards in ${s.name}?`,
    description, body,
    related: [
      { href: setFaqSlug("rarest-card", s.slug), label: `Rarest card in ${s.name}` },
      ...(s.mostValuableCard ? [{ href: setFaqSlug("valuable-card", s.slug), label: `Most valuable ${s.name} card` }] : []),
      { href: `/set/${s.id}`, label: `Browse all ${s.name} cards` },
    ],
  };
}
