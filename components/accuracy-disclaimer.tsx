import Link from "next/link";

/** Build the report-form link, pre-selecting the era (and optionally the set) the
 *  user came from so the form arrives partly filled in. */
export function reportHref(era?: string, setId?: string): string {
  const qs = new URLSearchParams();
  if (era) qs.set("era", era);
  if (setId) qs.set("set", setId);
  const q = qs.toString();
  return q ? `/report?${q}` : "/report";
}

type Props = {
  /** The disclaimer sentence (already localized). */
  body: string;
  /** The report-link label (already localized). */
  reportCta: string;
  /** Era/series this disclaimer is for — pre-fills the report form. */
  era?: string;
  /** Set id, when shown on a single set's page — also pre-fills the form. */
  setId?: string;
  className?: string;
};

/** A GB-styled "counts may be inaccurate" note with a link to the report form.
 *  Plain string props (no dictionary dependency) so it renders in both server
 *  and client component trees. */
export function AccuracyDisclaimer({ body, reportCta, era, setId, className }: Props) {
  return (
    <div
      role="note"
      className={`flex items-start gap-2 border-[3px] border-gb-ink bg-gb-accent/40 px-3 py-2 font-body text-base leading-snug ${className ?? ""}`}
    >
      <span aria-hidden="true" className="shrink-0 font-pixel text-[10px] leading-relaxed">
        ⚠
      </span>
      <p className="m-0">
        {body}{" "}
        <Link href={reportHref(era, setId)} className="underline underline-offset-2">
          {reportCta}
        </Link>
      </p>
    </div>
  );
}
