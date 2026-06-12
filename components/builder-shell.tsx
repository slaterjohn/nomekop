import { Suspense } from "react";
import { Header } from "@/components/header";
import { Providers } from "@/components/providers";
import { Builder } from "@/components/builder/builder";
import { GbSpinner } from "@/components/gb/gb-spinner";
import { GbKbdHint } from "@/components/gb/gb-kbd-hint";
import { Toaster } from "@/components/ui/sonner";
import { getSets } from "@/lib/tcg";
import type { TcgSet } from "@/lib/tcg/types";

/** The set-binder builder chrome — shared by /build and /b/[token]. */
export async function BuilderShell() {
  let initialSets: TcgSet[] | undefined;
  try {
    initialSets = await getSets();
  } catch {
    // The client falls back to fetching /api/sets with its own retry + error UI.
    initialSets = undefined;
  }

  return (
    <>
      <Header />
      <main id="main" className="flex-1">
        <Providers>
          <Suspense
            fallback={
              <div className="flex justify-center py-12">
                <GbSpinner />
              </div>
            }
          >
            <Builder initialSets={initialSets} />
          </Suspense>
        </Providers>
      </main>
      <GbKbdHint />
      <Toaster position="bottom-center" />
    </>
  );
}
