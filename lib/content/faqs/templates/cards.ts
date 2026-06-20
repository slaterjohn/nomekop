import type { FaqPage, FaqSetFacts } from "@/lib/content/faqs/types";
import { indefiniteArticle, setFaqSlug } from "@/lib/content/faqs/slug";
import { money, cardLabel, cardBullet, joinAnd, num, possessive } from "@/lib/content/faqs/format";

const NOTE = "Figures are from the pokemontcg.io dataset (TCGplayer pricing), as of June 2026.";

/** Bulleted marquee species, each listing its actual card names in the set. */
function marqueeBullets(s: FaqSetFacts, limit = 5): string {
  return s.marqueePokemon
    .slice(0, limit)
    .map((p) => `- **${p.displayName}** — ${p.cards.map((c) => cardLabel(c)).join(", ")}`)
    .join("\n");
}


export function rarestCardPage(s: FaqSetFacts): FaqPage {
  const c = s.rarestCard;
  const slug = setFaqSlug("rarest-card", s.slug);
  const description =
    `The rarest card in ${s.name} is ${cardLabel(c)}${c.rarity ? `, ${indefiniteArticle(c.rarity)} ${c.rarity}` : ""}.`;
  const rarityCount = c.rarity ? s.rarityHistogram[c.rarity] ?? 0 : 0;
  const scarcityLine = c.rarity && rarityCount > 0
    ? `${s.name} prints just ${num(rarityCount)} ${c.rarity}${rarityCount === 1 ? "" : "s"}, ` +
      `the thinnest tier in the set, and ${c.name} sits at #${c.number} among them.`
    : `${c.name} sits at #${c.number}, the top of ${possessive(s.name)} rarity ladder.`;
  const mvp = s.mostValuableCard;
  const valuableLine =
    mvp && mvp.id !== c.id
      ? `Rarity and price don't always line up. By market value the priciest card is ` +
        `${cardLabel(mvp)}` +
        (typeof mvp.marketPrice === "number" ? ` at about ${money(mvp.marketPrice)}` : "") +
        `, so the rarest pull and the most expensive one are different cards here.`
      : (typeof c.marketPrice === "number"
          ? `It's also the set's most valuable card, trading around ${money(c.marketPrice)}.`
          : "It's also one of the set's most sought-after pulls.");
  const otherChase = s.chaseCards.filter((x) => x.id !== c.id).slice(0, 5);
  const body = [
    `**${description}**`,
    "",
    `## Why ${c.name} tops the list`,
    "",
    `${scarcityLine} ${valuableLine}`,
    "",
    `## How ${c.name} sits in the wider chase`,
    "",
    `${s.name} runs to ${num(s.total)} cards including ${num(s.secretCount)} secret rares, and ` +
      `${c.name} is the scarcest of them.` +
      (otherChase.length
        ? ` Other cards collectors hunt in the set:`
        : ""),
    ...(otherChase.length ? ["", otherChase.map(cardBullet).join("\n")] : []),
    "",
    `## Star Pokémon to chase in ${s.name}`,
    "",
    `Beyond the single rarest card, these are the headline Pokémon and their prints in the set — each ` +
      `appears in multiple slots, so there's more than one ${s.name} card to hunt per name:`,
    "",
    marqueeBullets(s),
    "",
    `If you're hunting the rarest pull, ${c.name} is the one to prioritise; the rest of ${possessive(s.name)} ` +
      `chase fills in from there. With ${num(s.secretCount)} secret rares and ` +
      `${num(s.illustrationRareCount)} full-art cards across the ${num(s.total)}-card set, there's a deep ` +
      `bench of rare pulls behind it.`,
    "",
    NOTE,
  ].join("\n");
  return {
    slug, type: "rarest-card", setId: s.id,
    question: `What is the rarest card in ${s.name}?`,
    title: `What is the rarest card in ${s.name}?`,
    description, body,
    cards: [c, ...otherChase],
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
  // Runners-up: the next priciest chase cards that aren't the leader.
  const runnersUp = s.chaseCards
    .filter((x) => x.id !== c.id && typeof x.marketPrice === "number")
    .slice(0, 5);
  const rarest = s.rarestCard;
  const body = [
    `**${description}**`,
    "",
    `## The most valuable ${s.name} card`,
    "",
    `${c.name} (#${c.number}${c.rarity ? `, ${c.rarity}` : ""}) tops ${s.name} on the secondary ` +
      `market${priceText ? `, trading around ${money(c.marketPrice!)}` : ""}. It's the card that anchors ` +
      `the set's value; prices move constantly with supply and hype, so treat this as a snapshot rather ` +
      `than a quote.`,
    ...(runnersUp.length
      ? ["", `## What else holds value in ${s.name}`, "",
          `Below ${c.name}, the next tier of ${s.name} value by recent market price:`, "",
          runnersUp.map(cardBullet).join("\n")]
      : []),
    "",
    `## Star Pokémon driving ${possessive(s.name)} prices`,
    "",
    `These are the headline Pokémon whose cards carry the set, listed with their prints:`,
    "",
    marqueeBullets(s),
    "",
    `## Most valuable isn't always rarest`,
    "",
    `Value and print rarity can diverge: the rarest card by rarity tier in ${s.name} is ` +
      `${cardLabel(rarest)}${rarest.rarity ? `, ${indefiniteArticle(rarest.rarity)} ${rarest.rarity}` : ""}` +
      (rarest.id === c.id ? `, which happens to be this same card.` : `, a different card from the priciest one.`) +
      ` See the rarest-card breakdown for that angle.`,
    "",
    `## Buying smart in ${s.name}`,
    "",
    `${c.name} anchors the high end, but ${s.name} has ${num(s.illustrationRareCount)} Illustration and ` +
      `Special Illustration Rares and ${num(s.secretCount)} secret rares in total, so there's a full ` +
      `value ladder beneath it. If ${c.name} is out of budget, the runners-up above give you the same ` +
      `set at a fraction of the cost — and prices shift, so check a current sold-listings page before ` +
      `you buy or sell.`,
    "",
    NOTE,
  ].join("\n");
  return {
    slug, type: "valuable-card", setId: s.id,
    question: `What is the most valuable card in ${s.name}?`,
    title: `What is the most valuable card in ${s.name}?`,
    description, body,
    cards: [c, ...runnersUp],
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
  const lead = top[0];
  const description =
    `The chase cards in ${s.name} include ${top.slice(0, 3).map((c) => c.name).join(", ")} ` +
    `and other Illustration/Hyper Rares.`;
  const list = top.map(cardBullet).join("\n");
  const priced = top.filter((c) => typeof c.marketPrice === "number");
  const priceLine = priced.length >= 2
    ? `Prices on these range from about ${money(Math.min(...priced.map((c) => c.marketPrice!)))} ` +
      `to ${money(Math.max(...priced.map((c) => c.marketPrice!)))} on the secondary market.`
    : "";
  const body = [
    `**${description}**`,
    "",
    `## The cards collectors chase in ${s.name}`,
    "",
    `Every set has a handful of cards everyone's hunting. In ${s.name} — a ${s.series}-series set ` +
      `with ${num(s.secretCount)} secret rares and ${num(s.illustrationRareCount)} full-art cards — the ` +
      `headliners, in rough order of demand, are:`,
    "",
    list,
    "",
    `## Which ${s.name} chase card leads?`,
    "",
    (lead ? `${lead.name} is the card most collectors open packs for` +
      (typeof lead.marketPrice === "number" ? `, trading around ${money(lead.marketPrice)}.` : ".")
      : `These are the most sought-after pulls in the set.`) +
      (s.mostValuableCard && s.mostValuableCard.id !== lead?.id
        ? ` By raw market value, ${cardLabel(s.mostValuableCard)} leads ${s.name}.`
        : "") +
      (priceLine ? ` ${priceLine}` : ""),
    "",
    `## Star Pokémon behind the ${s.name} chase`,
    "",
    `Most of these pulls belong to the set's headline Pokémon. Each marquee name and its prints in ${s.name}:`,
    "",
    marqueeBullets(s),
    "",
    `## Chasing them in ${s.name}`,
    "",
    `${s.name} runs to ${num(s.total)} cards with ${num(s.illustrationRareCount)} Illustration/Special ` +
      `Illustration Rares, but landing ${joinAnd(top.slice(0, 3).map((c) => c.name))} covers most of what ` +
      `collectors actually want — a far quicker goal than the full ${num(s.masterSetCount)}-card master ` +
      `set. The rarest single pull, ${cardLabel(s.rarestCard)}${s.rarestCard.rarity ? ` (${s.rarestCard.rarity})` : ""}, ` +
      `rounds out the want-list.`,
    "",
    NOTE,
  ].join("\n");
  return {
    slug, type: "chase-cards", setId: s.id,
    question: `What are the chase cards in ${s.name}?`,
    title: `What are the chase cards in ${s.name}?`,
    description, body,
    cards: top,
    related: [
      { href: setFaqSlug("rarest-card", s.slug), label: `Rarest card in ${s.name}` },
      ...(s.mostValuableCard ? [{ href: setFaqSlug("valuable-card", s.slug), label: `Most valuable ${s.name} card` }] : []),
      { href: `/set/${s.id}`, label: `Browse all ${s.name} cards` },
    ],
  };
}
