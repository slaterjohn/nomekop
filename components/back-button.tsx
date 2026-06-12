"use client";

import { useRouter } from "next/navigation";
import { GbButton } from "@/components/gb/gb-button";
import { play } from "@/lib/sound";

/** History back when there is one; otherwise a sensible fallback route. */
export function BackButton({ fallbackHref }: { fallbackHref: string }) {
  const router = useRouter();
  return (
    <GbButton
      variant="b"
      size="sm"
      onClick={() => {
        play("back");
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push(fallbackHref);
        }
      }}
    >
      ◀ BACK
    </GbButton>
  );
}
