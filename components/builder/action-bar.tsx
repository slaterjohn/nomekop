"use client";

import { useState } from "react";
import { toast } from "sonner";
import { GbButton } from "@/components/gb/gb-button";
import { GbSpinner } from "@/components/gb/gb-spinner";
import { GbToggle } from "@/components/gb/gb-toggle";
import { serializeConfig, type BinderConfig } from "@/lib/config";
import { encodeShareToken } from "@/lib/share";
import { play } from "@/lib/sound";

export type PdfType = "binder" | "checklist" | "placeholders";

const PDF_BUTTONS: Array<{ type: PdfType; label: string }> = [
  { type: "binder", label: "BINDER PDF" },
  { type: "checklist", label: "CHECKLIST PDF" },
  { type: "placeholders", label: "PLACEHOLDERS PDF" },
];

type ActionBarProps = {
  config: BinderConfig;
  onStyleChange: (style: BinderConfig["style"]) => void;
};

/** Download/print actions. PDFs come from /api/pdf; PRINT opens the print route. */
export function ActionBar({ config, onStyleChange }: ActionBarProps) {
  const [busy, setBusy] = useState<PdfType | null>(null);

  const download = async (type: PdfType) => {
    play("confirm");
    setBusy(type);
    try {
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, config }),
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
      a.download = `nomekop-${config.set}-${type}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      play("success");
      toast.success(`${type.toUpperCase()} PDF ready!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "PDF generation failed.");
    } finally {
      setBusy(null);
    }
  };

  const printHref = `/print/binder?${serializeConfig(config).toString()}`;

  return (
    <div className="flex flex-wrap items-center gap-3" data-no-click-sound>
      {PDF_BUTTONS.map(({ type, label }) => (
        <GbButton
          key={type}
          variant="a"
          disabled={busy !== null}
          onClick={() => download(type)}
        >
          {label}
        </GbButton>
      ))}
      <GbButton
        variant="b"
        onClick={() => {
          play("confirm");
          window.open(printHref, "_blank", "noopener");
        }}
      >
        PRINT
      </GbButton>
      <GbButton
        variant="b"
        onClick={async () => {
          const link = `${window.location.origin}/b/${encodeShareToken(config)}`;
          try {
            await navigator.clipboard.writeText(link);
            play("success");
            toast.success("Share link copied!");
          } catch {
            toast.error(`Copy failed — your link: ${link}`);
          }
        }}
      >
        SHARE
      </GbButton>
      <GbToggle
        label="RETRO PRINT"
        checked={config.style === "retro"}
        onChange={(retro) => onStyleChange(retro ? "retro" : "clean")}
      />
      <span className="min-h-6">{busy ? <GbSpinner label="GENERATING…" /> : null}</span>
    </div>
  );
}
