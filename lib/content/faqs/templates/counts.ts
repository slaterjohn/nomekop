import type { FaqPage, FaqSetFacts } from "@/lib/content/faqs/types";
import { indefiniteArticle, setFaqSlug } from "@/lib/content/faqs/slug";
import { num, cardLabel, cardBullet, joinAnd, money, possessive } from "@/lib/content/faqs/format";

const SITE_FIGURES_NOTE = "Figures are from the pokemontcg.io dataset, as of June 2026.";
const PRICE_NOTE = "Figures are from the pokemontcg.io dataset (TCGplayer pricing), as of June 2026.";

/** Rarity buckets above the everyday Common/Uncommon/Rare tiers, biggest first. */
function rareTiers(s: FaqSetFacts): [string, number][] {
  const everyday = new Set(["Common", "Uncommon", "Rare"]);
  return Object.entries(s.rarityHistogram)
    .filter(([k, v]) => !everyday.has(k) && v > 0)
    .sort((a, b) => b[1] - a[1]);
}

/** A "N a, M b and K c" fragment of the named rarity tiers passed in. */
function tierPhrase(tiers: [string, number][]): string {
  return joinAnd(tiers.map(([k, v]) => `${num(v)} ${k}${v === 1 ? "" : "s"}`));
}

function rankPhrase(s: FaqSetFacts): string {
  if (s.sizeRankAmongRecent === 1) return "the largest of the 20 most recent sets";
  if (s.sizeRankAmongRecent === 20) return "the smallest of the 20 most recent sets";
  return `the #${s.sizeRankAmongRecent} largest of the 20 most recent sets`;
}

/** Marquee species names as a joined phrase, up to `limit`. */
function marqueePhrase(s: FaqSetFacts, limit = 5): string {
  return joinAnd(s.marqueePokemon.slice(0, limit).map((p) => p.displayName));
}

/** Bulleted marquee species, each listing its actual card names in the set. */
function marqueeBullets(s: FaqSetFacts, limit = 5): string {
  return s.marqueePokemon
    .slice(0, limit)
    .map((p) => {
      const names = p.cards.map((c) => cardLabel(c)).join(", ");
      return `- **${p.displayName}** — ${names}`;
    })
    .join("\n");
}

export function cardCountPage(s: FaqSetFacts): FaqPage {
  const slug = setFaqSlug("card-count", s.slug);
  const description =
    `${s.name} has ${num(s.printedTotal)} cards in the main set, or ${num(s.total)} ` +
    `including its ${num(s.secretCount)} secret rares.`;
  const tiers = rareTiers(s).slice(0, 4);
  const chase = s.chaseCards.slice(0, 6);
  const body = [
    `**${description}**`,
    "",
    `## Inside the ${s.name} checklist`,
    "",
    `${possessive(s.name)} numbered ${num(s.printedTotal)}-card base set splits into ` +
      `${num(s.pokemonCount)} Pokémon, ${num(s.trainerCount)} Trainers and ${num(s.energyCount)} ` +
      `Energy. It's a ${s.series}-series release and ranks ${rankPhrase(s)} by printed count. The ` +
      `marquee Pokémon and their cards in ${s.name}:`,
    "",
    marqueeBullets(s),
    "",
    `## Secret rares: #${s.printedTotal + 1} to #${s.total} in ${s.name}`,
    "",
    `Anything numbered past the printed total of ${s.printedTotal} is a secret rare. ${s.name} has ` +
      `${num(s.secretCount)} of them — #${s.printedTotal + 1} through #${s.total} — which lift the ` +
      `count from ${num(s.printedTotal)} to ${num(s.total)}. The headline pulls up there:`,
    "",
    chase.map(cardBullet).join("\n"),
    ...(tiers.length
      ? ["", `By rarity tier the rarer pool is ${tierPhrase(tiers)}.`]
      : []),
    "",
    `## Collecting all of ${s.name}`,
    "",
    `Want a master set? Add every reverse holo (${num(s.reverseHoloCount)})` +
      (s.hasBallPatterns ? ` plus the Poké Ball and Master Ball patterns` : "") +
      ` and the target reaches ${num(s.masterSetCount)} cards — about ` +
      `${(s.masterSetCount / s.printedTotal).toFixed(1)}× the base set, or roughly ` +
      `${num(Math.ceil(s.masterSetCount / 9))} pages in a 9-pocket binder. Decide up front whether ` +
      `you're after the ${num(s.printedTotal)}-card base ${s.name} or the full run.`,
    "",
    SITE_FIGURES_NOTE,
  ].join("\n");
  return {
    slug, type: "card-count", setId: s.id,
    question: `How many cards are in ${s.name}?`,
    title: `How many cards are in ${s.name}? (${s.printedTotal}-card set)`,
    description, body,
    cards: chase,
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
  const multiple = (s.masterSetCount / s.printedTotal).toFixed(1);
  const chaseList = s.chaseCards.slice(0, 6);
  const body = [
    `**${description}**`,
    "",
    `## What a ${s.name} master set includes`,
    "",
    `One of everything: all ${num(s.total)} numbered cards — the ${num(s.printedTotal)} base plus ` +
      `${num(s.secretCount)} secret rares — then every reverse holo, ${num(s.reverseHoloCount)} of them.` +
      (s.illustrationRareCount > 0
        ? ` That sweeps in the ${num(s.illustrationRareCount)} Illustration and Special Illustration ` +
          `Rares, the full-art cards that carry most of the value. The ones you have to land:`
        : " The headline cards you have to land:"),
    "",
    chaseList.map(cardBullet).join("\n"),
    "",
    `## The extras unique to ${s.name}`,
    "",
    (s.hasBallPatterns
      ? `${s.name} also carries ${num(s.pokeballCount)} Poké Ball pattern cards and ` +
        `${num(s.masterballCount)} rarer Master Ball pattern cards. Both count toward a true master ` +
        `set, which is why ${possessive(s.name)} total runs so far past its ${num(s.printedTotal)}-card base.`
      : `${s.name} has no Poké Ball or Master Ball pattern variants, so the master set is the ` +
        `${num(s.total)}-card checklist plus ${num(s.reverseHoloCount)} reverse holos — no extra ball ` +
        `foils to chase beyond the ${num(s.secretCount)} secret rares.`),
    "",
    `## Star Pokémon in the ${s.name} master set`,
    "",
    `A master set means chasing every print of the set's headline Pokémon, not just one each:`,
    "",
    marqueeBullets(s),
    "",
    `## The ${s.name} master-set total`,
    "",
    `All in, a complete ${s.name} master set is **${num(s.masterSetCount)} cards** versus ` +
      `${num(s.printedTotal)} for the base — about ${multiple}× the work, or roughly ` +
      `${num(Math.ceil(s.masterSetCount / 9))} pages in a 9-pocket binder. Sleeve and storage ` +
      `budget should target the larger number if you're going all the way on ${s.name}.`,
    "",
    SITE_FIGURES_NOTE,
  ].join("\n");
  return {
    slug, type: "master-set", setId: s.id,
    question: `How many cards are in a ${s.name} master set?`,
    title: `How many cards are in a ${s.name} master set? (${s.masterSetCount})`,
    description, body,
    cards: chaseList,
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
  const c = s.rarestCard;
  const tiers = rareTiers(s).slice(0, 4);
  const topChase = s.chaseCards.slice(0, 6);
  const priciest = s.mostValuableCard;
  const body = [
    `**${description}**`,
    "",
    `## Where ${possessive(s.name)} secret rares begin`,
    "",
    `Secret rares sit past the printed total of ${s.printedTotal}, so in ${s.name} they run ` +
      `#${s.printedTotal + 1} to #${s.total} — ${num(s.secretCount)} cards, the hardest pulls and ` +
      `most of the set's value.` +
      (tiers.length ? ` By tier that's ${tierPhrase(tiers)}.` : ""),
    "",
    `## The ${s.name} secret rares everyone wants`,
    "",
    `The rarest is ${cardLabel(c)}${c.rarity ? `, ${indefiniteArticle(c.rarity)} ${c.rarity}` : ""}.` +
      (priciest && priciest.id !== c.id
        ? ` The priciest by market value is ${cardLabel(priciest)}` +
          (typeof priciest.marketPrice === "number" ? ` at about ${money(priciest.marketPrice)}` : "") +
          ` — so the scarcest pull and the most expensive one are different cards here.`
        : ""),
    "",
    topChase.map(cardBullet).join("\n"),
    "",
    `## Star Pokémon among ${possessive(s.name)} secret rares`,
    "",
    `The headline Pokémon whose top prints land in the secret-rare range:`,
    "",
    marqueeBullets(s),
    "",
    `## Finishing the ${s.name} secret-rare run`,
    "",
    `Landing all ${num(s.secretCount)} is the hard part of completing ${s.name}; they push the full ` +
      `checklist to ${num(s.total)} cards and a master set to ${num(s.masterSetCount)}. Most of the ` +
      `set's resale value sits in this ${num(s.secretCount)}-card band, so even a near-complete ${s.name} ` +
      `binder can be missing the bulk of its value if the secret rares aren't in yet.`,
    "",
    PRICE_NOTE,
  ].join("\n");
  return {
    slug, type: "secret-rares", setId: s.id,
    question: `How many secret rares are in ${s.name}?`,
    title: `How many secret rares are in ${s.name}? (${s.secretCount})`,
    description, body,
    cards: topChase,
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
  const irCount = s.rarityHistogram["Illustration Rare"] ?? 0;
  const sirCount = s.rarityHistogram["Special Illustration Rare"] ?? 0;
  const irChase = s.chaseCards.filter(
    (c) => c.rarity === "Illustration Rare" || c.rarity === "Special Illustration Rare",
  ).slice(0, 6);
  const body = [
    `**${description}**`,
    "",
    `## Illustration Rares in ${s.name}`,
    "",
    `Illustration Rares (IR) and Special Illustration Rares (SIR) are the full-art, scene-style cards ` +
      `collectors chase hardest. ${s.name} packs ${num(s.illustrationRareCount)} of them into its ` +
      `${num(s.total)} cards` +
      (irCount > 0 || sirCount > 0
        ? `: ${num(irCount)} standard IRs and ${num(sirCount)} larger-art SIRs.`
        : ".") +
      ` That puts the full-art count at roughly ${Math.round((s.illustrationRareCount / s.total) * 100)}% ` +
      `of the set — a meaningful share of why ${s.name} is fun to open.`,
    "",
    `## The ${s.name} full-art cards to hunt`,
    ...(irChase.length
      ? ["", irChase.map(cardBullet).join("\n")]
      : ["", `They're the headline pulls and a big reason the checklist runs to ${num(s.total)} cards.`]),
    "",
    `## Star Pokémon with full-art cards in ${s.name}`,
    "",
    `The marquee Pokémon getting the IR/SIR treatment here, with their prints:`,
    "",
    marqueeBullets(s),
    "",
    `These cards drive much of ${possessive(s.name)} secondary-market value and help push a full ` +
      `master set to ${num(s.masterSetCount)} cards.` +
      (s.mostValuableCard && (s.mostValuableCard.rarity === "Special Illustration Rare" || s.mostValuableCard.rarity === "Illustration Rare")
        ? ` The standout is ${cardLabel(s.mostValuableCard)}` +
          (typeof s.mostValuableCard.marketPrice === "number" ? `, around ${money(s.mostValuableCard.marketPrice)}.` : ".")
        : ` The rarest card overall, ${cardLabel(s.rarestCard)}${s.rarestCard.rarity ? ` (${s.rarestCard.rarity})` : ""}, ` +
          `sits just above them on the rarity ladder.`),
    "",
    `## IR vs SIR in ${s.name}`,
    "",
    `If you're prioritising, the ${num(sirCount)} Special Illustration Rares are the scarcer, ` +
      `pricier tier — full-bleed art and lower pull rates — while the ${num(irCount)} standard ` +
      `Illustration Rares are more attainable but still some of the best-looking cards in ${s.name}. ` +
      `Together those ${num(s.illustrationRareCount)} full-art cards are the heart of the set's ` +
      `chase and the reason a master set climbs to ${num(s.masterSetCount)} cards.`,
    "",
    PRICE_NOTE,
  ].join("\n");
  return {
    slug, type: "illustration-rares", setId: s.id,
    question: `How many Illustration Rares are in ${s.name}?`,
    title: `How many Illustration Rares are in ${s.name}?`,
    description, body,
    cards: irChase.length ? irChase : s.chaseCards.slice(0, 6),
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
  const commons = s.rarityHistogram["Common"] ?? 0;
  const uncommons = s.rarityHistogram["Uncommon"] ?? 0;
  const rares = s.rarityHistogram["Rare"] ?? 0;
  const everydayTotal = commons + uncommons + rares;
  const body = [
    `**${description}**`,
    "",
    `## Reverse holos in ${s.name}`,
    "",
    `A reverse holo foils the card body instead of the artwork, giving the same card two finishes. ` +
      `${s.name} has ${num(s.reverseHoloCount)} reverse holo cards, mostly from its ${num(commons)} ` +
      `Commons, ${num(uncommons)} Uncommons and ${num(rares)} non-holo Rares — ${num(everydayTotal)} ` +
      `cards in those everyday tiers. Even staples for ${marqueePhrase(s, 4)} usually get one.`,
    "",
    `## Star Pokémon to grab reverse copies of in ${s.name}`,
    "",
    marqueeBullets(s),
    "",
    `## Why ${possessive(s.name)} reverse holos matter`,
    "",
    `None of these ${num(s.reverseHoloCount)} show on the base checklist of ${num(s.printedTotal)}, so ` +
      `they're extra cards to track when finishing ${s.name}.` +
      (s.hasBallPatterns
        ? ` ${s.name} also adds ${num(s.pokeballCount)} Poké Ball and ${num(s.masterballCount)} Master ` +
          `Ball pattern cards, which behave like extra reverse variants on the same hunt.`
        : ` There are no ball-pattern variants in ${s.name}, so reverse holos are the main extra layer.`) +
      ` Counted in, a full ${s.name} master set is ${num(s.masterSetCount)} cards — about ` +
      `${num(Math.ceil(s.masterSetCount / 9))} 9-pocket pages versus ` +
      `${num(Math.ceil(s.printedTotal / 9))} for the base set.`,
    "",
    `By contrast the top pulls — ${joinAnd(s.chaseCards.slice(0, 3).map((c) => c.name))} — come as ` +
      `full-art rares, not reverse holos, so they sit outside this ${num(s.reverseHoloCount)}-card pool. ` +
      `The reverse run is the cheap everyday cards: lots of slots, low cost.`,
    "",
    `## Collecting the ${s.name} reverse holos`,
    "",
    `At ${num(s.reverseHoloCount)} cards, the reverse-holo set is roughly ` +
      `${Math.round((s.reverseHoloCount / s.printedTotal) * 100)}% the size of ${possessive(s.name)} ` +
      `${num(s.printedTotal)}-card base — a whole second pass through the everyday slots. They sleeve ` +
      `into about ${num(Math.ceil(s.reverseHoloCount / 9))} extra 9-pocket pages, so factor that in ` +
      `before committing to a full ${s.name} master set.`,
    "",
    SITE_FIGURES_NOTE,
  ].join("\n");
  return {
    slug, type: "reverse-holos", setId: s.id,
    question: `How many reverse holo cards are in ${s.name}?`,
    title: `How many reverse holo cards are in ${s.name}?`,
    description, body,
    cards: s.chaseCards.slice(0, 6),
    related: [
      { href: setFaqSlug("master-set", s.slug), label: `${s.name} master set size` },
      { href: setFaqSlug("binder-size", s.slug), label: `Best binder size for ${s.name}` },
      { href: `/build?set=${s.id}&mode=master`, label: `Build the ${s.name} master set` },
    ],
  };
}
