import type { ReactNode } from "react";

export type Stat = { label: string; value: ReactNode };

/** A grid of headline figures for an entity page (Pokémon / artist), in the
 *  set page's bordered-cell style. Values may be links or plain text. */
export function StatGrid({ stats }: { stats: Stat[] }) {
  return (
    <dl className="m-0 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {stats.map((s) => (
        <div key={s.label} className="border-[3px] border-gb-ink px-3 py-2">
          <dt className="font-pixel text-[10px] uppercase leading-relaxed">{s.label}</dt>
          <dd className="m-0 font-body text-xl leading-tight">{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}
