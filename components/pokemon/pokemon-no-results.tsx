import { GbDialogBox } from "@/components/gb/gb-dialog-box";
import { GbLinkButton } from "@/components/gb/gb-button";
import { DEFAULT_POKEMON_OPTIONS, encodePokemonToken } from "@/lib/pokemon-binder";
import { suggestSimilarPokemon } from "@/lib/pokemon-search";

/**
 * The "no cards found" state for a Pokémon binder: a tidied MISSINGNO dialogue
 * plus fuzzy "did you mean" suggestions (closest species names) so a misspelled
 * search is one tap from the right binder.
 */
export function PokemonNoResults({ query }: { query: string }) {
  const suggestions = suggestSimilarPokemon(query, 6);

  return (
    <section aria-label="No cards found" className="flex flex-col gap-4">
      <GbDialogBox tone="error">
        {`Wild MISSINGNO. appeared! No cards match "${query}". Check the spelling, or try one of the suggestions below.`}
      </GbDialogBox>

      {suggestions.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="font-pixel text-[10px] uppercase">Did you mean</p>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {suggestions.map((p) => (
              <li key={p.dex}>
                <GbLinkButton
                  href={`/pokemon/${encodePokemonToken(p.name, DEFAULT_POKEMON_OPTIONS)}`}
                  variant="b"
                  size="sm"
                >
                  {p.name}
                </GbLinkButton>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <GbLinkButton href="/pokemon" variant="a" size="sm" className="self-start">
        Search again ▶
      </GbLinkButton>
    </section>
  );
}
