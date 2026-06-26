"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { GbButton } from "@/components/gb/gb-button";
import { slugifyArtistName } from "@/lib/illustrator-binder";
import { play } from "@/lib/sound";
import { useDict } from "@/components/i18n/language-provider";

/** Artist input → /illustrator/<slug>. The route shows the artist's info page
 *  when one exists, and falls back to the binder otherwise — so any artist (or
 *  a free-text name) still resolves. Validation mirrors the slug grammar. */
export function IllustratorSearchForm() {
  const dict = useDict();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!/^[a-z0-9.'\-:♀♂é ]{2,40}$/i.test(trimmed)) {
      setError("2–40 letters, numbers or .'-: please.");
      play("back");
      return;
    }
    setError(null);
    play("confirm");
    router.push(`/illustrator/${encodeURIComponent(slugifyArtistName(trimmed))}`);
  };

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <label className="flex min-w-56 flex-1 flex-col gap-1">
        <span className="font-pixel text-[10px] uppercase">{dict.illustratorLanding.nameLabel}</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={dict.illustratorLanding.placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className="border-[3px] border-gb-ink bg-gb-bg px-3 py-2 font-body text-xl placeholder:text-gb-ink/60"
        />
      </label>
      <GbButton type="submit" variant="a" data-no-click-sound>
        {dict.illustratorLanding.build}
      </GbButton>
      {error ? (
        <p id={errorId} role="alert" className="w-full font-body text-lg">
          {error}
        </p>
      ) : null}
    </form>
  );
}
