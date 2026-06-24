"use client";

import Link from "next/link";
import { GbBadge } from "@/components/gb/gb-badge";
import { GbLinkButton } from "@/components/gb/gb-button";
import { useDict } from "@/components/i18n/language-provider";
import { format } from "@/lib/i18n/format";
import { affiliateUrl, bindersFor, hasAffiliateLinks, retailerName } from "@/lib/binders";
import { play } from "@/lib/sound";

type BinderShelfProps = {
  pockets: number;
  pages: number;
};

/** Binder suggestions matching the chosen layout (data-driven from data/binders.json). */
export function BinderShelf({ pockets, pages }: BinderShelfProps) {
  const dict = useDict();
  const { exact, products } = bindersFor(pockets);

  return (
    <div className="flex flex-col gap-3">
      <p className="font-body text-xl">
        {exact
          ? format(dict.binder.shelfExact, { pockets, pages })
          : format(dict.binder.shelfNearest, { pockets })}
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {products.map((product) => (
          <li
            key={product.id}
            className="flex flex-col gap-2 border-[3px] border-gb-ink bg-gb-bg p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-pixel text-[10px] leading-relaxed">{product.name}</span>
              <GbBadge>{product.pockets} PKT</GbBadge>
            </div>
            <p className="font-body text-lg">
              {product.line} · around {product.priceGuide}
            </p>
            <div className="flex flex-wrap gap-2" data-no-click-sound>
              {product.links.map((link, i) => (
                <GbLinkButton
                  key={link.retailer}
                  variant={i === 0 ? "a" : "b"}
                  size="sm"
                  href={affiliateUrl(link)}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  onClick={() => play("confirm")}
                >
                  {retailerName(link.retailer)} <span aria-hidden="true">↗</span>
                  <span className="sr-only">(opens in a new tab)</span>
                </GbLinkButton>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <p className="font-body text-base">
        {hasAffiliateLinks() ? dict.binder.affiliateYes : dict.binder.affiliateNo}
        <Link href="/binders" className="underline underline-offset-2">
          {dict.common.compareBinders} ▶
        </Link>
      </p>
    </div>
  );
}
