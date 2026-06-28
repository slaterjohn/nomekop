"use client";

import { GbButton } from "@/components/gb/gb-button";
import { CardSlot } from "@/components/builder/card-slot";
import { flyToCollectionBar } from "@/lib/fly-to";
import { useRememberedSpread } from "@/lib/use-remembered-spread";
import { play } from "@/lib/sound";
import { capture } from "@/lib/analytics/events";
import type { BinderLayout, Page, SlotKind } from "@/lib/layout";
import type { TcgCard, TcgSet } from "@/lib/tcg/types";

type TickApi = {
  isChecked: (slotKey: string) => boolean;
  toggle: (slotKey: string) => void;
};

type BinderPreviewProps = {
  set: TcgSet;
  layout: BinderLayout;
  /** Optional checklist tick mode (slot keys = cardId:kind). */
  tick?: TickApi;
  /** Opens the card detail view for a clicked pocket (collection mode wins). */
  onInspect?: (card: TcgCard, kind: SlotKind) => void;
  /** Persist the current spread under this key so Back restores the page. */
  rememberKey?: string;
};

export function slotKey(cardId: string, kind: SlotKind): string {
  return `${cardId}:${kind}`;
}

/**
 * The open binder: one spread at a time (page 1 alone, then facing pairs),
 * d-pad/buttons to flip, a live announcement of the position, and a deal-in
 * animation that respects reduced motion via global CSS.
 */
export function BinderPreview({ set, layout, tick, onInspect, rememberKey }: BinderPreviewProps) {
  const [spreadIndex, setSpreadIndex] = useRememberedSpread(rememberKey);
  const spreads = layout.spreads;
  const clamped = Math.min(spreadIndex, Math.max(0, spreads.length - 1));
  const spread = spreads[clamped];

  if (!spread) {
    return (
      <p className="py-6 text-center font-pixel text-xs uppercase">No cards to show — pick another set</p>
    );
  }

  const go = (
    next: number,
    direction: "next" | "prev" | "first" | "last",
    via: "button" | "keyboard",
  ) => {
    const clampedNext = Math.max(0, Math.min(spreads.length - 1, next));
    if (clampedNext !== clamped) {
      play("move");
      capture("binder_page_turned", {
        direction,
        spread_index: clampedNext,
        spread_count: spreads.length,
        via,
      });
    }
    setSpreadIndex(clampedNext);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        go(clamped + 1, "next", "keyboard");
        break;
      case "ArrowLeft":
        e.preventDefault();
        go(clamped - 1, "prev", "keyboard");
        break;
      case "Home":
        e.preventDefault();
        go(0, "first", "keyboard");
        break;
      case "End":
        e.preventDefault();
        go(spreads.length - 1, "last", "keyboard");
        break;
    }
  };

  const label =
    spread.left && spread.right
      ? `Pages ${spread.left.number}–${spread.right.number} of ${layout.stats.pages}`
      : `Page ${(spread.left ?? spread.right)!.number} of ${layout.stats.pages}`;

  return (
    // The group is focusable so binder pages flip with the d-pad (arrow keys);
    // the buttons below offer the same controls to every input method.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex, jsx-a11y/no-noninteractive-element-interactions
    <div role="group" aria-label="Binder pages" tabIndex={0} onKeyDown={onKeyDown} className="outline-offset-4" data-no-click-sound>
      <div className="mb-3 flex items-center justify-between gap-2">
        <GbButton
          variant="b"
          size="sm"
          aria-label="Previous pages"
          disabled={clamped === 0}
          onClick={() => go(clamped - 1, "prev", "button")}
        >
          ◀
        </GbButton>
        <p aria-live="polite" className="font-pixel text-[10px] uppercase sm:text-xs">
          {label}
        </p>
        <GbButton
          variant="b"
          size="sm"
          aria-label="Next pages"
          disabled={clamped === spreads.length - 1}
          onClick={() => go(clamped + 1, "next", "button")}
        >
          ▶
        </GbButton>
      </div>

      <div key={clamped} data-gb-spread className="flex flex-col gap-4 motion-safe:animate-gb-flip-in sm:flex-row">
        {spread.left ? (
          <PageGrid page={spread.left} layout={layout} set={set} tick={tick} onInspect={onInspect} />
        ) : (
          <div aria-hidden="true" className="hidden flex-1 sm:block" />
        )}
        {spread.right ? (
          <PageGrid page={spread.right} layout={layout} set={set} tick={tick} onInspect={onInspect} />
        ) : (
          <div aria-hidden="true" className="hidden flex-1 sm:block" />
        )}
      </div>
    </div>
  );
}

function PageGrid({
  page,
  layout,
  set,
  tick,
  onInspect,
}: {
  page: Page;
  layout: BinderLayout;
  set: TcgSet;
  tick?: TickApi;
  onInspect?: (card: TcgCard, kind: SlotKind) => void;
}) {
  return (
    <section aria-label={`Page ${page.number}`} className="flex-1">
      <h3 className="mb-1 text-center font-pixel text-[10px] uppercase">Page {page.number}</h3>
      <div
        className="grid gap-1.5 border-[3px] border-gb-ink bg-gb-accent/30 p-1.5"
        style={{ gridTemplateColumns: `repeat(${layout.stats.cols}, minmax(0, 1fr))` }}
      >
        {page.slots.map((slot, i) => {
          const key = slot.kind === "empty" ? `empty-${i}` : `${slot.card.id}-${slot.kind}`;
          const tickApi =
            tick && slot.kind !== "empty"
              ? (() => {
                  const key = slotKey(slot.card.id, slot.kind);
                  const checked = tick.isChecked(key);
                  return {
                    checked,
                    onToggle: (element: HTMLElement) => {
                      if (!checked) flyToCollectionBar(element);
                      play(checked ? "back" : "move");
                      capture("card_marked", { set: set.id, kind: slot.kind, checked: !checked });
                      tick.toggle(key);
                    },
                  };
                })()
              : undefined;
          const inspect =
            !tick && onInspect && slot.kind !== "empty"
              ? () => {
                  capture("card_inspected", { card_id: slot.card.id, kind: slot.kind, set: set.id });
                  onInspect(slot.card, slot.kind);
                }
              : undefined;
          return (
            <div key={key} className="motion-safe:animate-gb-deal" style={{ animationDelay: `${i * 22}ms` }}>
              <CardSlot slot={slot} set={set} tick={tickApi} onInspect={inspect} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
