"use client";

import { useState } from "react";
import { toast } from "sonner";
import { GbButton, GbLinkButton } from "@/components/gb/gb-button";
import { GbSpinner } from "@/components/gb/gb-spinner";
import { play } from "@/lib/sound";

export type PdfButtonSpec = {
  label: string;
  /** /api/pdf type discriminator. */
  type: string;
  /** Feature token (pokemon/pokedex requests). */
  token?: string;
  /** Binder-config requests (set binders). */
  config?: Record<string, unknown>;
};

type PdfButtonsProps = {
  buttons: PdfButtonSpec[];
  printHref: string;
  filenameBase: string;
};

/** Shared PDF download row: POST /api/pdf, stream to a download, GB feedback. */
export function PdfButtons({ buttons, printHref, filenameBase }: PdfButtonsProps) {
  const [busy, setBusy] = useState<string | null>(null);

  const download = async (spec: PdfButtonSpec) => {
    play("confirm");
    setBusy(spec.type);
    try {
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: spec.type, token: spec.token, config: spec.config }),
      });
      if (!res.ok) {
        let message = `PDF generation failed (${res.status}).`;
        try {
          const body = (await res.json()) as { error?: string };
          if (body.error) message = body.error;
        } catch {
          // keep generic message
        }
        throw new Error(message);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filenameBase}-${spec.type}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      play("success");
      toast.success(`${spec.label} ready!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "PDF generation failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {buttons.map((spec) => (
        <GbButton key={spec.type} variant="a" disabled={busy !== null} onClick={() => download(spec)}>
          {spec.label}
        </GbButton>
      ))}
      <GbLinkButton variant="b" href={printHref} target="_blank" rel="noopener">
        PRINT
      </GbLinkButton>
      <span className="min-h-6">{busy ? <GbSpinner label="GENERATING…" /> : null}</span>
    </div>
  );
}
