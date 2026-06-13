"use client";

import { GbScreen } from "@/components/gb/gb-screen";
import { GbBadge } from "@/components/gb/gb-badge";
import { GbLinkButton } from "@/components/gb/gb-button";
import { affiliateUrl, hasAffiliateLinks, retailerName, type Binder } from "@/lib/binders";
import { play } from "@/lib/sound";

/** Pocket sizes, low to high, with the binders that come in each. */
function bySize(binders: Binder[]): { pockets: number; binders: Binder[] }[] {
  const sizes = [...new Set(binders.map((b) => b.pockets))].sort((a, b) => a - b);
  return sizes.map((pockets) => ({ pockets, binders: binders.filter((b) => b.pockets === pockets) }));
}

/** The full binder catalogue — a product page grouped by pocket size. */
export function BinderCatalog({ binders }: { binders: Binder[] }) {
  return (
    <div className="flex flex-col gap-6">
      {bySize(binders).map(({ pockets, binders }) => (
        <GbScreen key={pockets} title={`${pockets}-POCKET`}>
          <ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
            {binders.map((binder) => (
              <li
                key={binder.id}
                className="flex flex-col gap-2 border-[3px] border-gb-ink bg-gb-bg p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-pixel text-[10px] leading-relaxed">{binder.name}</span>
                  <GbBadge>{binder.pockets} PKT</GbBadge>
                </div>
                <p className="font-body text-lg leading-tight">{binder.blurb}</p>
                <p className="font-body text-base text-gb-ink">
                  {binder.line} · holds {binder.capacityPages} pages · around {binder.priceGuide}
                </p>
                <div className="mt-auto flex flex-wrap gap-2 pt-1">
                  {binder.links.map((link, i) => (
                    <GbLinkButton
                      key={link.retailer}
                      variant={i === 0 ? "a" : "b"}
                      size="sm"
                      href={affiliateUrl(link)}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      onClick={() => play("confirm")}
                    >
                      {retailerName(link.retailer).toUpperCase()} ↗
                    </GbLinkButton>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </GbScreen>
      ))}
      <p className="font-body text-base">
        {hasAffiliateLinks()
          ? "Some links may earn Nomekop a small commission at no cost to you."
          : "Nomekop is not affiliated with these brands; links are plain searches."}
      </p>
    </div>
  );
}
