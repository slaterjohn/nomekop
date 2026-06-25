import { pokemonCatalog, artistCatalog, artistHasPage } from "@/lib/content/entities/catalog";

// Conservative entity auto-linker for trusted prose (facts articles, FAQ bodies).
// Wraps the FIRST mention of a known entity in a Markdown link, then marked
// renders it; the typed-link styling (icon + underline) is applied by CSS on the
// /pokemon, /illustrator, /set, /card href prefixes (see globals.css).
//
// Deliberately conservative to avoid false positives:
//   - case-SENSITIVE, whole-word matches against canonical names (so "mew" the
//     word is ignored, only "Mew" the Pokémon links);
//   - longest match wins ("Mewtwo" beats "Mew");
//   - first mention per entity only;
//   - never inside existing links, inline code, fenced code, or headings;
//   - sets are NOT auto-linked (names like "Base"/"151" are too common — they
//     stay hand-authored), and single-token artist names are skipped.

export type EntityMatch = { name: string; href: string };

let cachedMatchers: EntityMatch[] | null = null;

/** Pokémon (all) + multi-word gated artists. Memoised — the catalog is static. */
export function buildEntityMatchers(): EntityMatch[] {
  if (cachedMatchers) return cachedMatchers;
  const matchers: EntityMatch[] = [];
  for (const p of pokemonCatalog()) matchers.push({ name: p.name, href: `/pokemon/${encodeURIComponent(p.slug)}` });
  for (const a of artistCatalog()) {
    if (a.name.includes(" ") && artistHasPage(a.slug)) {
      matchers.push({ name: a.name, href: `/illustrator/${encodeURIComponent(a.slug)}` });
    }
  }
  cachedMatchers = matchers;
  return matchers;
}

const isWordChar = (c: string) => /[A-Za-z0-9]/.test(c);

// Existing links/images and inline code — protected spans we never touch.
const PROTECT_RE = /(!?\[[^\]]*\]\([^)]*\)|`[^`]*`)/g;

function bucketByFirstChar(matchers: EntityMatch[]): Map<string, EntityMatch[]> {
  const byFirst = new Map<string, EntityMatch[]>();
  for (const m of matchers) {
    const c = m.name[0]!;
    const arr = byFirst.get(c);
    if (arr) arr.push(m);
    else byFirst.set(c, [m]);
  }
  for (const arr of byFirst.values()) arr.sort((a, b) => b.name.length - a.name.length);
  return byFirst;
}

function linkifyPlain(text: string, byFirst: Map<string, EntityMatch[]>, linked: Set<string>): string {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const prev = i > 0 ? text[i - 1]! : "";
    let hit: EntityMatch | null = null;
    if (!isWordChar(prev)) {
      const cands = byFirst.get(text[i]!);
      if (cands) {
        for (const m of cands) {
          if (linked.has(m.href)) continue;
          if (!text.startsWith(m.name, i)) continue;
          const after = text[i + m.name.length] ?? "";
          if (isWordChar(after)) continue; // whole-word only
          hit = m;
          break;
        }
      }
    }
    if (hit) {
      out += `[${hit.name}](${hit.href})`;
      linked.add(hit.href);
      i += hit.name.length;
    } else {
      out += text[i];
      i += 1;
    }
  }
  return out;
}

const bucketCache = new WeakMap<EntityMatch[], Map<string, EntityMatch[]>>();
function getBuckets(matchers: EntityMatch[]): Map<string, EntityMatch[]> {
  let b = bucketCache.get(matchers);
  if (!b) {
    b = bucketByFirstChar(matchers);
    bucketCache.set(matchers, b);
  }
  return b;
}

export function linkifyEntities(md: string, matchers: EntityMatch[] = buildEntityMatchers()): string {
  const byFirst = getBuckets(matchers);
  const linked = new Set<string>();
  // Keep fenced code blocks verbatim.
  return md
    .split(/(```[\s\S]*?```)/g)
    .map((part) => {
      if (part.startsWith("```")) return part;
      return part
        .split("\n")
        .map((line) => {
          if (/^\s{0,3}#{1,6}\s/.test(line)) return line; // heading line
          // Even indices are plain text; odd indices are protected spans.
          const segs = line.split(PROTECT_RE);
          for (let i = 0; i < segs.length; i += 2) segs[i] = linkifyPlain(segs[i]!, byFirst, linked);
          return segs.join("");
        })
        .join("\n");
    })
    .join("");
}
