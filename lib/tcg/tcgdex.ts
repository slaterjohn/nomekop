import "server-only";
import { CARDS_TTL_MS, serverStore } from "@/lib/server-store";
import { isSecretNumber } from "@/lib/tcg/secret";
import { TcgError, type CardWithSet, type TcgSet } from "@/lib/tcg/types";

/**
 * TCGdex client — the multilingual source (Japanese, French, German…) that
 * pokemontcg.io can't provide. We query by localized name (Pokémon) or
 * illustrator (artists), then enrich each card with its set's metadata (name,
 * release date, printed total) which the card list omits. No prices: TCGdex
 * doesn't carry them, so non-English cards show none.
 *
 * Card images come from assets.tcgdex.net (base URL + quality/format suffix).
 */

const BASE = "https://api.tcgdex.net/v2";
const TIMEOUT_MS = 20_000;
/** TCGdex data is effectively static; cache set metadata for a long time. */
const SET_META_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type BriefCard = { id: string; localId: string; name: string; image?: string };
type SetDetail = {
  id: string;
  name: string;
  releaseDate?: string;
  cardCount?: { official?: number; total?: number };
};

async function request<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    let res: Response;
    try {
      res = await fetch(`${BASE}${path}`, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        throw new TcgError("timeout", `tcgdex timed out after ${TIMEOUT_MS}ms`);
      }
      throw new TcgError("network", `tcgdex unreachable: ${String(err)}`);
    }
    if (!res.ok) throw new TcgError("http", `tcgdex responded ${res.status}`, res.status);
    try {
      return (await res.json()) as T;
    } catch {
      throw new TcgError("parse", "tcgdex returned non-JSON");
    }
  } finally {
    clearTimeout(timer);
  }
}

/** "SVK-001" + localId "001" → set id "SVK". */
function setIdOf(card: BriefCard): string {
  const suffix = `-${card.localId}`;
  return card.id.endsWith(suffix) ? card.id.slice(0, -suffix.length) : card.id.split("-")[0]!;
}

function imageUrls(base: string | undefined): { small: string; large: string } {
  if (!base) return { small: "", large: "" };
  return { small: `${base}/low.webp`, large: `${base}/high.webp` };
}

function setMeta(setId: string, lang: string): Promise<SetDetail> {
  return serverStore.getOrCompute(`tcgdex:set:${lang}:${setId}`, SET_META_TTL_MS, () =>
    request<SetDetail>(`/${lang}/sets/${encodeURIComponent(setId)}`),
  );
}

/** Turn brief search results into full CardWithSet, enriching from set metadata
 *  (fetched once per distinct set, then cached). */
async function enrich(cards: BriefCard[], lang: string): Promise<CardWithSet[]> {
  const setIds = [...new Set(cards.map(setIdOf))];
  const metas = new Map<string, SetDetail>();
  await Promise.all(
    setIds.map(async (id) => {
      try {
        metas.set(id, await setMeta(id, lang));
      } catch {
        // a set whose metadata won't load still shows, with thin context
      }
    }),
  );

  return cards.map((c) => {
    const setId = setIdOf(c);
    const meta = metas.get(setId);
    const printedTotal = meta?.cardCount?.official ?? meta?.cardCount?.total ?? 0;
    const { small, large } = imageUrls(c.image);
    return {
      id: c.id,
      name: c.name,
      number: c.localId,
      rarity: undefined,
      supertype: "Pokémon",
      imageSmall: small,
      imageLarge: large,
      variants: { normal: true, reverse: false, holo: false },
      artist: undefined,
      lang,
      setId,
      setName: meta?.name ?? setId,
      setReleaseDate: (meta?.releaseDate ?? "").replace(/-/g, "/"),
      setPrintedTotal: printedTotal,
      secret: isSecretNumber(c.localId, printedTotal),
    } satisfies CardWithSet;
  });
}

/** Every card whose (localized) name matches, in one language. */
export function searchByName(localizedName: string, lang: string): Promise<CardWithSet[]> {
  if (!localizedName.trim()) return Promise.resolve([]);
  return serverStore
    .getOrCompute(`tcgdex:name:${lang}:${localizedName}`, CARDS_TTL_MS, () =>
      request<BriefCard[]>(`/${lang}/cards?name=${encodeURIComponent(localizedName)}`),
    )
    .then((brief) => enrich(brief, lang));
}

/** Every card by an illustrator, in one language (names are consistent across
 *  languages, so the English artist name works). */
export function searchByIllustrator(artist: string, lang: string): Promise<CardWithSet[]> {
  if (!artist.trim()) return Promise.resolve([]);
  return serverStore
    .getOrCompute(`tcgdex:artist:${lang}:${artist}`, CARDS_TTL_MS, () =>
      request<BriefCard[]>(`/${lang}/cards?illustrator=${encodeURIComponent(artist)}`),
    )
    .then((brief) => enrich(brief, lang));
}

type BriefSet = { id: string; name: string; cardCount?: { official?: number; total?: number } };

/** The set list for a language, as TcgSet[] (release dates/symbols enriched
 *  lazily per set — the brief list omits them). */
export function getLocalizedSets(lang: string): Promise<TcgSet[]> {
  return serverStore
    .getOrCompute(`tcgdex:sets:${lang}`, CARDS_TTL_MS, () => request<BriefSet[]>(`/${lang}/sets`))
    .then((sets) =>
      sets.map((s) => ({
        id: s.id,
        name: s.name,
        series: "",
        printedTotal: s.cardCount?.official ?? 0,
        total: s.cardCount?.total ?? s.cardCount?.official ?? 0,
        releaseDate: "",
        symbolUrl: "",
        logoUrl: "",
        lang,
      })),
    );
}
