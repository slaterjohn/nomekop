import { GbSpinner } from "@/components/gb/gb-spinner";

/** Streamed fallback while an illustrator's cross-set search warms (cold cache). */
export default function IllustratorLoading() {
  return (
    <main id="main" className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 px-4 py-16">
      <GbSpinner label="FINDING CARDS…" />
      <p className="font-body text-xl">Searching every set for this illustrator.</p>
    </main>
  );
}
