import type { Metadata } from "next";
import Link from "next/link";
import { GbScreen } from "@/components/gb/gb-screen";
import { ReportForm, type ReportSetRef } from "@/components/report/report-form";
import { getSets } from "@/lib/tcg";
import type { TcgSet } from "@/lib/tcg/types";

// Sets come from the cached TCG API — render dynamically so a cold cache or
// missing network can't fail the build.
export const dynamic = "force-dynamic";

const TITLE = "Report a card-data inaccuracy";
const DESCRIPTION =
  "Spotted a wrong card count, a missing card or a bad image on NOMEKOP? Tell us which set and what's off, and we'll fix it.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/report" },
  // A feedback form has no SEO value and shouldn't be indexed.
  robots: { index: false, follow: true },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/report" },
};

const CONTACT_EMAIL = "hello@nomekop.app";

/** Distinct series, newest-first (by each series' newest set). */
function erasNewestFirst(sets: TcgSet[]): string[] {
  const newest = new Map<string, string>();
  for (const s of sets) {
    const cur = newest.get(s.series);
    if (!cur || s.releaseDate > cur) newest.set(s.series, s.releaseDate);
  }
  return [...newest.entries()]
    .sort((a, b) => b[1].localeCompare(a[1]))
    .map(([series]) => series);
}

type Props = { searchParams: Promise<{ era?: string; set?: string }> };

/** The inaccuracy report form. Arrives pre-filled when reached from a set/era
 *  accuracy disclaimer (?era=…&set=…). */
export default async function ReportPage({ searchParams }: Props) {
  const { era: eraParam, set: setParam } = await searchParams;

  let sets: TcgSet[] = [];
  try {
    sets = await getSets();
  } catch {
    // Fall through with an empty list — the form still works, just without the
    // set dropdown pre-populated.
  }

  const eras = erasNewestFirst(sets);
  const setRefs: ReportSetRef[] = sets
    .map((s) => ({ id: s.id, name: s.name, series: s.series }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Resolve the pre-selection. `?set` may be a set id (from a set page) — map it
  // to the set's name (what the dropdown stores) and infer its era.
  const matchedSet = setParam ? sets.find((s) => s.id === setParam) : undefined;
  const initialSet = matchedSet?.name ?? "";
  const initialEra =
    matchedSet?.series ?? (eraParam && eras.includes(eraParam) ? eraParam : "");

  return (
    <main id="main" className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-3 font-pixel text-sm uppercase">
        <Link href="/sets" className="no-underline">
          ◂ All sets
        </Link>
      </nav>

      <div>
        <h1 className="font-pixel text-lg uppercase leading-relaxed sm:text-xl">Report an inaccuracy</h1>
        <p className="mt-1 font-body text-lg">
          Card counts for the four most recent eras are verified against collector master-set
          guides; older eras are estimated. If something looks wrong — a count, a missing card, a
          bad image — let us know and we&apos;ll fix it.
        </p>
      </div>

      <GbScreen title="Report form">
        <ReportForm
          eras={eras}
          sets={setRefs}
          initialEra={initialEra}
          initialSet={initialSet}
          contactEmail={CONTACT_EMAIL}
        />
      </GbScreen>
    </main>
  );
}
