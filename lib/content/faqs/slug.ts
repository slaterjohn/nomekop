import type { FaqType } from "@/lib/content/faqs/types";

/** "a" or "an" for a display name, by leading vowel. */
export function indefiniteArticle(name: string): "a" | "an" {
  return /^[aeiou]/i.test(name.trim()) ? "an" : "a";
}

/** Slug for the "Is there a [Pokémon] card in [Set]?" page. The article is part
 *  of the slug so it reads naturally, derived deterministically from the name. */
export function pokemonInSetSlug(pokemonSlug: string, setSlug: string): string {
  const display = pokemonSlug.replace(/-/g, " ");
  return `is-there-${indefiniteArticle(display)}-${pokemonSlug}-card-in-${setSlug}`;
}

/** Slug for a set-level FAQ of a given type. */
export function setFaqSlug(
  type: Exclude<FaqType, "pokemon-in-set" | "upcoming">,
  setSlug: string,
): string {
  switch (type) {
    case "card-count": return `how-many-cards-in-${setSlug}`;
    case "master-set": return `how-many-cards-in-${setSlug}-master-set`;
    case "binder-size": return `best-binder-size-for-${setSlug}`;
    case "rarest-card": return `rarest-card-in-${setSlug}`;
    case "valuable-card": return `most-valuable-card-in-${setSlug}`;
    case "chase-cards": return `chase-cards-in-${setSlug}`;
    case "secret-rares": return `how-many-secret-rares-in-${setSlug}`;
    case "illustration-rares": return `how-many-illustration-rares-in-${setSlug}`;
    case "reverse-holos": return `how-many-reverse-holos-in-${setSlug}`;
    case "release-date": return `when-did-${setSlug}-come-out`;
    case "ball-patterns": return `does-${setSlug}-have-ball-pattern-cards`;
  }
}
