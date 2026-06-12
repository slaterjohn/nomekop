"use client";

import { useEffect, useRef, useState } from "react";
import { GbScreen } from "@/components/gb/gb-screen";
import { GbDialogBox } from "@/components/gb/gb-dialog-box";
import { GbButton } from "@/components/gb/gb-button";
import { GbSpinner } from "@/components/gb/gb-spinner";
import { GbProgress } from "@/components/gb/gb-progress";
import { GbToggle } from "@/components/gb/gb-toggle";
import { GbWipe } from "@/components/gb/gb-wipe";
import { SetSelector } from "@/components/builder/set-selector";
import { ConfigPanel } from "@/components/builder/config-panel";
import { BinderPreview } from "@/components/builder/binder-preview";
import { ActionBar } from "@/components/builder/action-bar";
import { BinderShelf } from "@/components/builder/binder-shelf";
import { CardDetailDialog } from "@/components/builder/card-detail-dialog";
import { useCards, useSets } from "@/lib/hooks";
import { useBinderConfig } from "@/lib/use-binder-config";
import { useChecklist, useCollectionMode, clearChecklist } from "@/lib/checklist-store";
import { buildBinderLayout, type SlotKind } from "@/lib/layout";
import { toCollectionCsv } from "@/lib/csv";
import { play } from "@/lib/sound";
import { cn } from "@/lib/utils";
import type { TcgCard, TcgSet } from "@/lib/tcg/types";

type BuilderProps = {
  initialSets?: TcgSet[];
};

/** Collection progress bar that pulses when a card flies in. */
function CollectionBar({ count, max }: { count: number; max: number }) {
  const prev = useRef(count);
  const [pulsing, setPulsing] = useState(false);
  useEffect(() => {
    if (count > prev.current) {
      setPulsing(true);
      const t = setTimeout(() => setPulsing(false), 320);
      prev.current = count;
      return () => clearTimeout(t);
    }
    prev.current = count;
  }, [count]);
  return (
    <div
      data-gb-collection-bar
      className={cn("min-w-0 flex-1", pulsing && "motion-safe:animate-gb-pulse")}
    >
      <GbProgress label="COLLECTED" value={count} max={max} />
    </div>
  );
}

/** The whole flow: choose set → configure → preview/collect → print → binder. */
export function Builder({ initialSets }: BuilderProps) {
  const { config, update } = useBinderConfig();
  const sets = useSets(initialSets);
  const cards = useCards(config.set || undefined);
  const collectionMode = useCollectionMode();
  const checklist = useChecklist(config.set || undefined, config.mode);
  const [inspected, setInspected] = useState<{ card: TcgCard; kind: SlotKind } | null>(null);

  const selectedSet = (sets.data ?? []).find((s) => s.id === config.set);
  const layout =
    selectedSet && cards.data ? buildBinderLayout(cards.data, selectedSet, config) : undefined;

  const downloadCsv = () => {
    if (!layout || !selectedSet) return;
    const slots = layout.pages.flatMap((p) => p.slots);
    const csv = toCollectionCsv(slots, checklist.collected);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `bindermon-${selectedSet.id}-${config.mode}-collection.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    play("success");
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
      <GbScreen title={selectedSet ? `SET: ${selectedSet.name.toUpperCase()}` : "CHOOSE SET"}>
        {selectedSet ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-body text-xl">
              {selectedSet.series} · {selectedSet.printedTotal} printed / {selectedSet.total} total
            </p>
            <GbButton
              variant="b"
              size="sm"
              onClick={() => {
                play("back");
                update({ set: "" });
              }}
            >
              ◀ CHANGE SET
            </GbButton>
          </div>
        ) : (
          <SetSelector
            sets={sets.data}
            isLoading={sets.isPending}
            error={sets.isError ? sets.error.message : undefined}
            onRetry={() => void sets.refetch()}
            onSelect={(set) => {
              play("confirm");
              update({ set: set.id });
            }}
          />
        )}
      </GbScreen>

      {selectedSet && cards.isPending ? (
        <div className="flex justify-center py-8">
          <GbSpinner label={`LOADING ${selectedSet.name.toUpperCase()}…`} />
        </div>
      ) : null}

      {selectedSet && cards.isError ? (
        <div className="space-y-3">
          <GbDialogBox tone="error">{cards.error.message}</GbDialogBox>
          <GbButton variant="a" onClick={() => void cards.refetch()}>
            RETRY
          </GbButton>
        </div>
      ) : null}

      {selectedSet && cards.data && cards.data.length === 0 ? (
        <GbDialogBox>
          WILD MISSINGNO. APPEARED! This set has no cards in the library. Try another set.
        </GbDialogBox>
      ) : null}

      {selectedSet && layout && layout.stats.cards > 0 ? (
        <>
          <GbWipe>
            <GbScreen title="CONFIGURE BINDER">
              <ConfigPanel set={selectedSet} cards={cards.data!} config={config} onChange={update} />
            </GbScreen>
          </GbWipe>

          <GbWipe>
            <GbScreen title="PREVIEW">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <GbToggle
                  label="COLLECTION MODE"
                  checked={collectionMode.enabled}
                  onChange={(on) => {
                    collectionMode.setEnabled(on);
                    play(on ? "confirm" : "back");
                  }}
                />
                <div className="flex min-w-64 flex-1 items-center gap-3">
                  <CollectionBar count={checklist.count} max={layout.stats.slots} />
                  <GbButton variant="b" size="sm" onClick={downloadCsv}>
                    CSV
                  </GbButton>
                  {checklist.count > 0 ? (
                    <GbButton
                      variant="plain"
                      size="sm"
                      onClick={() => {
                        play("back");
                        clearChecklist(config.set, config.mode);
                      }}
                    >
                      CLEAR
                    </GbButton>
                  ) : null}
                </div>
              </div>
              <BinderPreview
                set={selectedSet}
                layout={layout}
                tick={collectionMode.enabled ? checklist : undefined}
                onInspect={(card, kind) => {
                  play("confirm");
                  setInspected({ card, kind });
                }}
              />
            </GbScreen>
          </GbWipe>

          <GbWipe>
            <GbScreen title="PRINT & DOWNLOAD">
              <ActionBar config={config} onStyleChange={(style) => update({ style })} />
            </GbScreen>
          </GbWipe>

          <GbWipe>
            <GbScreen title="FIND THE RIGHT BINDER">
              <BinderShelf pockets={layout.stats.slotsPerPage} pages={layout.stats.pages} />
            </GbScreen>
          </GbWipe>
        </>
      ) : null}

      {selectedSet ? (
        <CardDetailDialog
          card={inspected?.card ?? null}
          kind={inspected?.kind ?? null}
          set={selectedSet}
          onClose={() => {
            play("back");
            setInspected(null);
          }}
        />
      ) : null}
    </div>
  );
}
