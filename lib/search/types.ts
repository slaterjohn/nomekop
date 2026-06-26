export type SearchType = "pokemon" | "set" | "artist" | "faq" | "fact";

/** One searchable thing: a display label, optional sublabel (dex #, series, …),
 *  and the page it links to. */
export type SearchEntry = {
  type: SearchType;
  label: string;
  sublabel?: string;
  url: string;
};

export type SearchGroup = {
  type: SearchType;
  /** Human heading, e.g. "Pokémon". */
  label: string;
  items: SearchEntry[];
};
