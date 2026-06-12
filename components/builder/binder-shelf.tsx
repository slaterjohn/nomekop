"use client";

import { GbBadge } from "@/components/gb/gb-badge";
import { GbLinkButton } from "@/components/gb/gb-button";
import { amazonUrl, bindersFor, hasAffiliateLinks, vaultxUrl } from "@/lib/binders";
import { play } from "@/lib/sound";

type BinderShelfProps = {
  pockets: number;
  pages: number;
};

/** Vault X binder suggestions matching the chosen layout. */
export function BinderShelf({ pockets, pages }: BinderShelfProps) {
  const { exact, products } = bindersFor(pockets);

  return (
    <div className="flex flex-col gap-3">
      <p className="font-body text-xl">
        {exact
          ? `Your ${pockets}-pocket layout matches these binders — you’ll need ${pages} pages.`
          : `No off-the-shelf ${pockets}-pocket binder exists; the closest size is shown below.`}
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {products.map((product) => (
          <li
            key={product.name}
            className="flex flex-col gap-2 border-[3px] border-gb-ink bg-gb-bg p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-pixel text-[10px] leading-relaxed">{product.name}</span>
              <GbBadge>{product.pockets} PKT</GbBadge>
            </div>
            <p className="font-body text-lg">
              {product.line} · around {product.priceGuide}
            </p>
            <div className="flex flex-wrap gap-2">
              <GbLinkButton
                variant="a"
                size="sm"
                href={vaultxUrl(product)}
                target="_blank"
                rel="noopener noreferrer sponsored"
                onClick={() => play("confirm")}
              >
                VAULT X ↗
              </GbLinkButton>
              <GbLinkButton
                variant="b"
                size="sm"
                href={amazonUrl(product)}
                target="_blank"
                rel="noopener noreferrer sponsored"
                onClick={() => play("confirm")}
              >
                AMAZON ↗
              </GbLinkButton>
            </div>
          </li>
        ))}
      </ul>
      <p className="font-body text-base">
        {hasAffiliateLinks()
          ? "Links may earn Bindermon a small commission at no cost to you."
          : "Bindermon is not affiliated with Vault X; links are plain searches."}
      </p>
    </div>
  );
}
