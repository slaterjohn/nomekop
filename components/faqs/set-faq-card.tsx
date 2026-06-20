import Image from "next/image";
import Link from "next/link";
import { GbBadge } from "@/components/gb/gb-badge";
import { cn } from "@/lib/utils";
import type { FaqSetSummary } from "@/lib/content/faqs/types";

/** "2026/05/22" → "2026". */
function year(releaseDate?: string): string | undefined {
  return releaseDate?.slice(0, 4);
}

/**
 * One set on the FAQ index: logo, name, FAQ count and a CTA, the whole card a
 * link to that set's FAQ hub. Upcoming sets get a dashed "coming soon" treatment
 * (no logo data yet) so they read as future releases at a glance.
 */
export function SetFaqCard({ set }: { set: FaqSetSummary }) {
  const faqCount = `${set.faqCount} ${set.faqCount === 1 ? "FAQ" : "FAQs"}`;
  const meta = set.isUpcoming
    ? `${faqCount} · ${set.releaseLabel}`
    : `${faqCount}${year(set.releaseDate) ? ` · ${year(set.releaseDate)}` : ""}`;

  return (
    <li>
      <Link
        href={set.hubHref}
        aria-label={`${set.fullName} FAQs — ${set.faqCount} questions`}
        className={cn(
          "group flex h-full flex-col gap-3 border-[3px] border-gb-ink bg-gb-bg p-3 no-underline",
          "shadow-[3px_3px_0_0_var(--gb-ink)] motion-safe:transition-transform motion-safe:hover:-translate-y-0.5",
          set.isUpcoming && "border-dashed bg-gb-accent/20",
        )}
      >
        <span className="relative flex h-20 items-center justify-center border-2 border-gb-ink/30 bg-gb-bg px-2">
          {set.logoUrl ? (
            <Image
              src={set.logoUrl}
              alt=""
              width={320}
              height={120}
              unoptimized
              loading="lazy"
              className="h-auto max-h-16 w-full object-contain"
            />
          ) : (
            <span className="text-center font-pixel text-xs uppercase leading-relaxed text-gb-ink">
              {set.name}
            </span>
          )}
          {set.isUpcoming ? (
            <GbBadge className="absolute right-1 top-1">Coming soon</GbBadge>
          ) : null}
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-pixel text-xs leading-relaxed group-hover:underline">
            {set.name}
          </span>
          <span className="font-readable text-base leading-snug text-gb-muted">{meta}</span>
        </span>

        <span className="mt-auto font-pixel text-[10px] uppercase underline-offset-2 group-hover:underline">
          {set.isUpcoming ? "Preview ▶" : "View FAQs ▶"}
        </span>
      </Link>
    </li>
  );
}
