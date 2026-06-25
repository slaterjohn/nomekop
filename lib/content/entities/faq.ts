import type { ArtistEntity, PokemonEntity } from "@/lib/content/entities/types";

// Data-backed Q&A for a Pokémon info page. Every answer is a real figure from
// the entity snapshot — no boilerplate. Ordered by the search intent the
// keyword research surfaced as dominant (value, then count, rarity, history).
// Rendered visibly on the page AND emitted as FAQPage JSON-LD, so the two must
// match verbatim (Google's policy).

export type FaqEntry = { question: string; answer: string };

/** "Base" is the pokemontcg.io name for the 1999 Base Set; everyone calls it
 *  "Base Set". Align display to what people search. */
function setName(name: string): string {
  return name === "Base" ? "Base Set" : name;
}

function money(n: number): string {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export function pokemonFaqEntries(p: PokemonEntity): FaqEntry[] {
  const entries: FaqEntry[] = [];
  const name = p.name;

  const price = p.signatureCard?.marketPrice;
  if (p.signatureCard && typeof price === "number") {
    entries.push({
      question: `What is the most valuable ${name} card?`,
      answer:
        `One of the most valuable ${name} cards is ${p.signatureCard.name} ` +
        `(#${p.signatureCard.number}), with a recent market price around ${money(price)}.`,
    });
  }

  entries.push({
    question: `How many ${name} cards are there?`,
    answer:
      `There are ${p.cardCount} ${name} cards across ${p.setCount} ` +
      `${p.setCount === 1 ? "set" : "sets"}, illustrated by ${p.artistCount} ` +
      `${p.artistCount === 1 ? "artist" : "different artists"}.`,
  });

  if (p.sirCount > 0) {
    entries.push({
      question: `How many ${name} Special Illustration Rares are there?`,
      answer:
        `${name} has ${p.sirCount} Special Illustration Rare ` +
        `${p.sirCount === 1 ? "card" : "cards"}` +
        (p.illustrationRareCount > p.sirCount
          ? `, and ${p.illustrationRareCount} Illustration Rares in total.`
          : `.`),
    });
  }

  if (p.firstSet) {
    entries.push({
      question: `When was the first ${name} card printed?`,
      answer:
        `The first ${name} card appeared in ${setName(p.firstSet.name)} ` +
        `(${p.firstSet.releaseDate.slice(0, 4)}). The most recent is from ` +
        `${setName(p.latestSet.name)}.`,
    });
  }

  if (p.artistCount > 1) {
    entries.push({
      question: `How many artists have illustrated ${name}?`,
      answer: `${p.artistCount} different artists have illustrated ${name} cards.`,
    });
  }

  return entries;
}

export function artistFaqEntries(a: ArtistEntity): FaqEntry[] {
  const entries: FaqEntry[] = [];
  const name = a.name;

  const price = a.signatureCard?.marketPrice;
  if (a.signatureCard && typeof price === "number") {
    entries.push({
      question: `What is ${name}'s most valuable card?`,
      answer:
        `One of ${name}'s most valuable cards is ${a.signatureCard.name} ` +
        `(#${a.signatureCard.number}), with a recent market price around ${money(price)}.`,
    });
  }

  entries.push({
    question: `How many cards has ${name} illustrated?`,
    answer:
      `${name} has illustrated ${a.cardCount} Pokemon TCG cards across ` +
      `${a.setCount} ${a.setCount === 1 ? "set" : "sets"}.`,
  });

  if (a.topPokemon.length > 0) {
    const top = a.topPokemon[0]!;
    entries.push({
      question: `Which Pokémon has ${name} illustrated most?`,
      answer: `${name} has drawn ${top.name} the most — ${top.count} ${top.count === 1 ? "card" : "cards"}.`,
    });
  }

  if (a.illustrationCount > 0) {
    entries.push({
      question: `How many Illustration Rares has ${name} drawn?`,
      answer:
        `${name} has illustrated ${a.illustrationCount} Illustration Rare and ` +
        `Special Illustration Rare ${a.illustrationCount === 1 ? "card" : "cards"}.`,
    });
  }

  if (a.earliestSet) {
    entries.push({
      question: `When did ${name}'s first card come out?`,
      answer:
        `${name}'s earliest card is from ${setName(a.earliestSet.name)} ` +
        `(${a.earliestSet.releaseDate.slice(0, 4)}); the most recent is from ${setName(a.latestSet.name)}.`,
    });
  }

  return entries;
}
