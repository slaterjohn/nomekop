"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { GbLinkButton } from "@/components/gb/gb-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { AccuracyDisclaimer } from "@/components/accuracy-disclaimer";
import { format } from "@/lib/i18n/format";
import { capture } from "@/lib/analytics/events";

/** One set, with everything the browser + modal need — fully serializable. */
export type SetItem = {
  id: string;
  name: string;
  series: string;
  /** 'YYYY/MM/DD'. */
  releaseDate: string;
  printedTotal: number;
  total: number;
  /** Full master-set slot count (the headline figure on each item). */
  masterCount: number;
  symbolUrl: string;
  logoUrl: string;
};

export type SetsGroup = {
  series: string;
  sets: SetItem[];
  /** Era's master-set counts verified against collector guides — when false the
   *  section shows an accuracy disclaimer. */
  verified: boolean;
};

/** Just the strings the client needs — keeps the whole dict off the wire. */
export type SetsBrowserLabels = {
  masterCards: string;
  expandSection: string;
  collapseSection: string;
  setCount: string;
  viewInfo: string;
  createLayout: string;
  modalClose: string;
  seriesLabel: string;
  releasedLabel: string;
  countsLabel: string;
  printedTotalLine: string;
  masterSetLabel: string;
  accuracyDisclaimer: string;
  accuracyReportCta: string;
};

type Props = {
  /** Already sorted newest-series-first, sets newest-first within each. */
  groups: SetsGroup[];
  labels: SetsBrowserLabels;
};

/** A left-click with no modifier keys — the only case we hijack for the modal.
 *  Middle-click, cmd/ctrl-click (new tab), shift-click and right-click all fall
 *  through to the anchor's real /set/[id] navigation, so the link stays a link. */
function isPlainLeftClick(e: React.MouseEvent): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

/**
 * The interactive /sets index: collapsible series sections (latest two open by
 * default), crawlable set links, and a click-to-open detail modal. Search lives
 * on the page above this (the unified SiteSearchBox). The page stays a server
 * component; this receives only serializable props so the anchors render in SSR
 * HTML (SEO) with the modal as progressive enhancement on top.
 */
export function SetsBrowser({ groups, labels }: Props) {
  const [active, setActive] = useState<SetItem | null>(null);
  // Latest + latest-1 series open by default; everything older collapsed.
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((g, i) => [g.series, i < 2])),
  );

  const openSet = (set: SetItem) => {
    capture("set_opened", { set: set.id, series: set.series, source: "sets_browser" });
    setActive(set);
  };

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => {
        const isOpen = open[group.series] ?? false;
        return (
          <CollapsibleSeries
            key={group.series}
            group={group}
            labels={labels}
            open={isOpen}
            onToggle={() => {
              capture("series_toggled", { series: group.series, expanded: !isOpen });
              setOpen((prev) => ({ ...prev, [group.series]: !isOpen }));
            }}
            onOpenSet={openSet}
          />
        );
      })}

      <SetDetailModal set={active} labels={labels} onClose={() => setActive(null)} />
    </div>
  );
}

/** A series group: a bordered section whose title bar is a collapse toggle. The content
 *  is always in the DOM (so crawlers see the links) and merely `hidden` when
 *  collapsed, keeping the SSR HTML crawlable. */
function CollapsibleSeries({
  group,
  labels,
  open,
  onToggle,
  onOpenSet,
}: {
  group: SetsGroup;
  labels: SetsBrowserLabels;
  open: boolean;
  onToggle: () => void;
  onOpenSet: (set: SetItem) => void;
}) {
  const regionId = `series-${group.series.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
  return (
    <section className="border-4 border-gb-ink bg-gb-bg shadow-[inset_0_0_0_2px_var(--gb-ink)]">
      <h2 className="m-0">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={regionId}
          aria-label={format(open ? labels.collapseSection : labels.expandSection, {
            series: group.series,
          })}
          className="flex w-full cursor-pointer items-center gap-2 border-b-4 border-gb-ink bg-gb-ink px-3 py-2 text-left font-pixel text-xs uppercase leading-relaxed text-gb-bg sm:text-sm"
        >
          <span aria-hidden="true" className="shrink-0">
            {open ? "▾" : "▸"}
          </span>
          <span className="min-w-0 flex-1 break-words">{group.series.toUpperCase()}</span>
          <span aria-hidden="true" className="shrink-0 font-body text-base normal-case">
            {format(labels.setCount, { count: group.sets.length })}
          </span>
        </button>
      </h2>
      <div id={regionId} hidden={!open} className="relative p-3 sm:p-4">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(var(--gb-ink) 1px, transparent 1px)",
            backgroundSize: "4px 4px",
          }}
        />
        <div className="relative flex flex-col gap-3">
          {!group.verified ? (
            <AccuracyDisclaimer
              body={labels.accuracyDisclaimer}
              reportCta={labels.accuracyReportCta}
              era={group.series}
            />
          ) : null}
          <SetGrid sets={group.sets} labels={labels} onOpen={onOpenSet} />
        </div>
      </div>
    </section>
  );
}

/** The two-column grid of set items. */
function SetGrid({
  sets,
  labels,
  onOpen,
}: {
  sets: SetItem[];
  labels: SetsBrowserLabels;
  onOpen: (set: SetItem) => void;
}) {
  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
      {sets.map((set) => (
        <li key={set.id}>
          <Link
            href={`/set/${set.id}`}
            onClick={(e) => {
              // Plain left-click → open the modal; let modified clicks navigate.
              if (isPlainLeftClick(e)) {
                e.preventDefault();
                onOpen(set);
              }
            }}
            className="flex min-h-11 w-full items-center gap-2.5 border-[3px] border-gb-ink bg-gb-bg px-2.5 py-1.5 no-underline shadow-[2px_2px_0_0_var(--gb-ink)] motion-safe:transition-transform motion-safe:hover:-translate-y-px"
          >
            {set.symbolUrl ? (
              <Image
                src={set.symbolUrl}
                alt=""
                width={24}
                height={24}
                unoptimized
                loading="lazy"
                className="h-6 w-6 shrink-0 object-contain"
              />
            ) : null}
            <span className="min-w-0 flex-1">
              <span className="block truncate font-pixel text-[10px] leading-relaxed">
                {set.name.toUpperCase()}
              </span>
              <span className="block font-body text-lg leading-none">
                {format(labels.masterCards, { count: set.masterCount })}
              </span>
            </span>
            <span aria-hidden="true" className="shrink-0 font-pixel text-[10px]">
              ▶
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** The set-detail modal: GB-styled like the builder's confirm dialog. Two
 *  actions — view the full /set page, or jump straight into the builder. */
function SetDetailModal({
  set,
  labels,
  onClose,
}: {
  set: SetItem | null;
  labels: SetsBrowserLabels;
  onClose: () => void;
}) {
  return (
    <Dialog open={set !== null} onOpenChange={(o) => !o && onClose()}>
      {set ? (
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[85dvh] w-full max-w-md flex-col gap-0 rounded-none border-4 border-gb-ink bg-gb-bg p-0 text-gb-ink shadow-[6px_6px_0_0_var(--gb-ink)] ring-0"
        >
          <div className="flex shrink-0 items-start justify-between gap-2 border-b-4 border-gb-ink bg-gb-ink px-4 py-3">
            <DialogTitle className="min-w-0 break-words font-pixel text-sm uppercase leading-relaxed text-gb-bg">
              {set.name}
            </DialogTitle>
            <button
              type="button"
              onClick={onClose}
              aria-label={labels.modalClose}
              className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center border-[3px] border-gb-bg bg-gb-ink font-pixel text-xs text-gb-bg motion-safe:transition-transform motion-safe:hover:-translate-y-0.5"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col gap-3 overflow-y-auto p-4">
            <DialogDescription className="sr-only">
              {set.name} — {set.series}
            </DialogDescription>

            {set.logoUrl || set.symbolUrl ? (
              <div className="flex justify-center border-[3px] border-gb-ink bg-gb-bg p-3">
                <Image
                  src={set.logoUrl || set.symbolUrl}
                  alt=""
                  width={240}
                  height={96}
                  unoptimized
                  className="h-auto max-h-20 w-auto max-w-full object-contain"
                />
              </div>
            ) : null}

            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 font-body text-lg">
              <dt className="font-pixel text-[10px] uppercase">{labels.seriesLabel}</dt>
              <dd className="m-0 min-w-0 break-words">{set.series}</dd>

              <dt className="font-pixel text-[10px] uppercase">{labels.releasedLabel}</dt>
              <dd className="m-0">{set.releaseDate.replace(/\//g, "-")}</dd>

              <dt className="font-pixel text-[10px] uppercase">{labels.countsLabel}</dt>
              <dd className="m-0">
                {format(labels.printedTotalLine, {
                  printed: set.printedTotal,
                  total: set.total,
                })}
              </dd>

              <dt className="font-pixel text-[10px] uppercase">{labels.masterSetLabel}</dt>
              <dd className="m-0">{format(labels.masterCards, { count: set.masterCount })}</dd>
            </dl>

            <div className="flex flex-col gap-2 pt-1 sm:flex-row">
              <GbLinkButton variant="b" href={`/set/${set.id}`} className="flex-1">
                {labels.viewInfo}
              </GbLinkButton>
              <GbLinkButton variant="a" href={`/build?set=${set.id}`} className="flex-1">
                {labels.createLayout}
              </GbLinkButton>
            </div>
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
