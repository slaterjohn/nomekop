"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { entityIconSvg, ENTITY_LINK_CLASS, type EntityType } from "@/lib/content/entity-icons";
import { capture } from "@/lib/analytics/events";

/** A typed internal link: a pixel icon + a type-specific underline, matching the
 *  prose links the Markdown renderer emits (lib/content/render.ts). The icon is a
 *  trusted in-repo SVG constant. Clicks emit entity_link_clicked (the cross-link
 *  "Wikipedia effect" signal); prose auto-links fall back to autocapture. */
function EntityLink({ type, href, children }: { type: EntityType; href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={ENTITY_LINK_CLASS[type]}
      onClick={() => capture("entity_link_clicked", { to_type: type })}
    >
      <span dangerouslySetInnerHTML={{ __html: entityIconSvg(type) }} />
      {children}
    </Link>
  );
}

export function PokemonLink({ slug, children }: { slug: string; children: ReactNode }) {
  return (
    <EntityLink type="pokemon" href={`/pokemon/${encodeURIComponent(slug)}`}>
      {children}
    </EntityLink>
  );
}

export function ArtistLink({ slug, children }: { slug: string; children: ReactNode }) {
  return (
    <EntityLink type="artist" href={`/illustrator/${encodeURIComponent(slug)}`}>
      {children}
    </EntityLink>
  );
}

export function SetLink({ id, children }: { id: string; children: ReactNode }) {
  return (
    <EntityLink type="set" href={`/set/${id}`}>
      {children}
    </EntityLink>
  );
}

export function CardLink({ id, children }: { id: string; children: ReactNode }) {
  return (
    <EntityLink type="card" href={`/card/${id}`}>
      {children}
    </EntityLink>
  );
}
