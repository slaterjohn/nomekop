import Link from "next/link";
import type { FaqPage } from "@/lib/content/faqs/types";

/** A single FAQ question as a link-card (question + its direct answer). Shared by
 *  the per-set FAQ hub and any other list of FAQ pages. */
export function FaqPageCard({ page }: { page: FaqPage }) {
  return (
    <li>
      <Link
        href={`/faqs/${page.slug}`}
        className="group flex flex-col gap-0.5 border-[3px] border-gb-ink bg-gb-bg p-3 no-underline shadow-[3px_3px_0_0_var(--gb-ink)] motion-safe:transition-transform motion-safe:hover:-translate-y-0.5"
      >
        <span className="font-readable text-base font-bold leading-snug group-hover:underline">
          {page.question}
        </span>
        <span className="font-readable text-base leading-snug">{page.description}</span>
      </Link>
    </li>
  );
}
