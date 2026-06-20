"use client";

import Link from "next/link";
import { GbScreen } from "@/components/gb/gb-screen";
import { GbProgress } from "@/components/gb/gb-progress";
import { GbButton, GbLinkButton } from "@/components/gb/gb-button";
import { GbBadge } from "@/components/gb/gb-badge";
import { CardSlot } from "@/components/builder/card-slot";
import { BackButton } from "@/components/back-button";
import { useChecklist } from "@/lib/checklist-store";
import { DEFAULT_CONFIG } from "@/lib/config";
import { encodeShareToken } from "@/lib/share";
import { expandOptionsFrom, expandSlots, type CollectionMode } from "@/lib/layout";
import { slotKindLabel } from "@/lib/variant-labels";
import { toCollectionCsv } from "@/lib/csv";
import { play } from "@/lib/sound";
import type { TcgCard, TcgSet } from "@/lib/tcg/types";

type CollectionViewProps = {
  set: TcgSet;
  cards: TcgCard[];
  mode: CollectionMode;
};

/** Collected pockets for one set+mode, straight from this browser's storage. */
export function CollectionView({ set, cards, mode }: CollectionViewProps) {
  const checklist = useChecklist(set.id, mode);

  const slots = expandSlots(cards, expandOptionsFrom({ ...DEFAULT_CONFIG, mode }, set));
  const pockets = slots.filter((s) => s.kind !== "empty");
  const collected = pockets.filter((s) => checklist.isChecked(`${s.card.id}:${s.kind}`));

  const downloadCsv = () => {
    const csv = toCollectionCsv(slots, checklist.collected);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `nomekop-${set.id}-${mode}-collection.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    play("success");
  };

  return (
    <main id="main" className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <BackButton fallbackHref={`/b/${encodeShareToken({ ...DEFAULT_CONFIG, set: set.id, mode })}`} />
      </div>

      <GbScreen title={`COLLECTION: ${set.name.toUpperCase()}`}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <GbLinkButton
              variant={mode === "standard" ? "a" : "b"}
              size="sm"
              href={`/collection/${set.id}?mode=standard`}
              aria-current={mode === "standard" ? "page" : undefined}
            >
              STANDARD
            </GbLinkButton>
            <GbLinkButton
              variant={mode === "master" ? "a" : "b"}
              size="sm"
              href={`/collection/${set.id}?mode=master`}
              aria-current={mode === "master" ? "page" : undefined}
            >
              MASTER
            </GbLinkButton>
            <span className="flex-1" />
            <GbButton variant="b" size="sm" data-no-click-sound onClick={downloadCsv}>
              CSV
            </GbButton>
            <GbLinkButton
              variant="a"
              size="sm"
              href={`/b/${encodeShareToken({ ...DEFAULT_CONFIG, set: set.id, mode })}`}
            >
              OPEN IN BUILDER
            </GbLinkButton>
          </div>

          <GbProgress label="COLLECTED" value={collected.length} max={pockets.length} />

          <p className="font-pixel text-[10px] leading-relaxed">
            {(["card", "reverse", "pokeball", "masterball"] as const)
              .map((kind) => ({
                kind,
                have: collected.filter((s) => s.kind === kind).length,
                total: pockets.filter((s) => s.kind === kind).length,
              }))
              .filter(({ total }) => total > 0)
              .map(({ kind, have, total }) => `${slotKindLabel(kind).toUpperCase()} ${have}/${total}`)
              .join(" · ")}
          </p>

          {collected.length === 0 ? (
            <p className="border-[3px] border-dashed border-gb-muted p-4 text-center font-pixel text-[10px] leading-relaxed">
              NOTHING COLLECTED YET — TURN ON COLLECTION MODE IN THE BUILDER AND START TICKING.
            </p>
          ) : (
            <ul className="grid list-none grid-cols-3 gap-2 p-0 sm:grid-cols-5 md:grid-cols-6">
              {collected.map((slot) => (
                  <li key={`${slot.card.id}-${slot.kind}`} className="relative">
                    <Link
                      href={`/card/${slot.card.id}${slot.kind !== "card" ? `?variant=${slot.kind}` : ""}`}
                      aria-label={`${slot.card.name} ${slot.card.number} (${slotKindLabel(slot.kind)})`}
                      className="block no-underline"
                    >
                      <CardSlot slot={slot} set={set} />
                    </Link>
                    {slot.kind !== "card" ? (
                      <GbBadge className="absolute -right-1 -top-1">{slotKindLabel(slot.kind).toUpperCase()}</GbBadge>
                    ) : null}
                  </li>
                ))}
            </ul>
          )}
        </div>
      </GbScreen>
    </main>
  );
}
