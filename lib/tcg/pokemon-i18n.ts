import "server-only";
import { serverStore } from "@/lib/server-store";
import { languageByCode } from "@/lib/tcg/languages";

/**
 * Localized Pokémon names by National Dex number, from PokéAPI (the same source
 * as our Pokédex sprites). Used to query TCGdex in each language — e.g. dex 6 →
 * リザードン (ja) → TCGdex name search. Cached effectively forever (static data).
 */

const NAMES_TTL_MS = 365 * 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 15_000;

type Species = { names: Array<{ language: { name: string }; name: string }> };

async function fetchSpecies(dex: number): Promise<Species | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${dex}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as Species;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The name of the Pokémon with this Dex number in the given TCGdex language.
 * Returns undefined for English (handled by pokemontcg.io) or when unavailable.
 */
export async function localizedPokemonName(
  dex: number,
  langCode: string,
): Promise<string | undefined> {
  const lang = languageByCode(langCode);
  if (!lang || lang.code === "en") return undefined;
  const species = await serverStore.getOrCompute<Species | null>(
    `pokeapi:species:${dex}`,
    NAMES_TTL_MS,
    () => fetchSpecies(dex),
  );
  return species?.names.find((n) => n.language.name === lang.pokeapi)?.name;
}
