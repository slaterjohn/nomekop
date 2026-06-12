import { GbSpinner } from "@/components/gb/gb-spinner";

/** Streamed fallback while a generation's cross-set query warms (cold cache). */
export default function PokedexLoading() {
  return (
    <main id="main" className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 px-4 py-16">
      <GbSpinner label="BUILDING POKÉDEX…" />
      <p className="font-body text-xl">
        Gathering every Pokémon&apos;s cards across all sets. First load can take a moment — it
        is cached afterwards.
      </p>
    </main>
  );
}
