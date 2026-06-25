// Pure Answer-The-Public logic — query expansion, suggest-response parsing,
// intent classification, grouping and aggregation. No network, no I/O, so it's
// unit-tested in isolation (test/unit/atp-core.test.ts). The network harvester
// scripts/answer-the-public.mjs wires these together.

export const MODIFIERS = {
  questions: ["who", "what", "when", "where", "why", "how", "which", "are", "can", "do", "does", "is", "will"],
  prepositions: ["for", "with", "without", "near", "to"],
  comparisons: ["vs", "and", "or", "like"],
  alphabet: "abcdefghijklmnopqrstuvwxyz".split(""),
};

/** Every autocomplete query for a seed: the bare seed plus each modifier
 *  appended. The a–z sweep is opt-in (noisy + high volume). */
export function expandSeed(seed, { alphabet = false } = {}) {
  const mods = [...MODIFIERS.questions, ...MODIFIERS.prepositions, ...MODIFIERS.comparisons];
  if (alphabet) mods.push(...MODIFIERS.alphabet);
  return [...new Set([seed, ...mods.map((m) => `${seed} ${m}`)])];
}

/** Suggestions out of a Google/Bing/DDG response — all share the
 *  `[query, [suggestions], …]` shape. Defensive against junk payloads. */
export function parseSuggest(json) {
  if (!Array.isArray(json) || !Array.isArray(json[1])) return [];
  return json[1].filter((s) => typeof s === "string");
}

// Intent rules in priority order — the FAQ angle a search implies. First match wins.
const INTENT_RULES = [
  ["value", /\b(worth|price|prices|value|valuable|expensive|cost|sell|selling|how much)\b/],
  ["count", /\b(how many|number of)\b/],
  ["rarity", /\b(rare|rarest|rarity|rares)\b/],
  ["editions", /\b(1st edition|first edition|edition|shadowless|unlimited)\b/],
  ["grading", /\b(psa|cgc|bgs|grade|graded|grading)\b/],
  ["authenticity", /\b(fake|real|authentic|genuine|counterfeit|proxy)\b/],
  ["list", /\b(list|checklist|all)\b/],
  ["set", /\b(set|sets|expansion|booster|pack)\b/],
];

/** The FAQ angle a search implies (value, count, rarity, …), else "general". */
export function classifyIntent(text) {
  const t = String(text).toLowerCase();
  for (const [intent, re] of INTENT_RULES) if (re.test(t)) return intent;
  return "general";
}

const QUESTION_RE = new RegExp(`\\b(${MODIFIERS.questions.join("|")}|should)\\b`);
const COMPARISON_RE = new RegExp(`\\b(${[...MODIFIERS.comparisons, "versus"].join("|")})\\b`);
const PREPOSITION_RE = new RegExp(`\\b(${MODIFIERS.prepositions.join("|")})\\b`);

/** AtP bucket for a suggestion, by the kind of modifier its wording carries. */
export function groupSuggestion(text) {
  const t = String(text).toLowerCase();
  if (QUESTION_RE.test(t)) return "question";
  if (COMPARISON_RE.test(t)) return "comparison";
  if (PREPOSITION_RE.test(t)) return "preposition";
  return "related";
}

/** Collapse raw {text, engine} hits for a seed into unique, ranked suggestions
 *  with frequency, contributing engines, intent and group. Drops blanks and the
 *  bare-seed echo. */
export function aggregate(raw, seed) {
  const seedNorm = String(seed).trim().toLowerCase();
  const byText = new Map();
  for (const { text, engine } of raw) {
    const t = String(text ?? "").trim();
    if (!t || t.toLowerCase() === seedNorm) continue;
    let entry = byText.get(t.toLowerCase());
    if (!entry) {
      entry = { text: t, freq: 0, engines: new Set() };
      byText.set(t.toLowerCase(), entry);
    }
    entry.freq += 1;
    if (engine) entry.engines.add(engine);
  }
  return [...byText.values()]
    .map((e) => ({
      text: e.text,
      freq: e.freq,
      engines: [...e.engines],
      intent: classifyIntent(e.text),
      group: groupSuggestion(e.text),
    }))
    .sort((a, b) => b.freq - a.freq || a.text.localeCompare(b.text));
}

/** Split aggregated suggestions into the five AtP buckets for the report. */
export function buildClusters(suggestions) {
  const clusters = { question: [], comparison: [], preposition: [], alphabetical: [], related: [] };
  for (const s of suggestions) (clusters[s.group] ?? clusters.related).push(s);
  return clusters;
}
