import { Suspense } from "react";
import { Header } from "@/components/header";
import { Providers } from "@/components/providers";
import { Builder } from "@/components/builder/builder";
import { FaqSection } from "@/components/faq-section";
import { GbSpinner } from "@/components/gb/gb-spinner";
import { GbKbdHint } from "@/components/gb/gb-kbd-hint";
import { JsonLd } from "@/components/json-ld";
import { Toaster } from "@/components/ui/sonner";
import { FAQ_ENTRIES } from "@/lib/faq";
import { faqJsonLd, webApplicationJsonLd, webSiteJsonLd } from "@/lib/structured-data";
import { getSets } from "@/lib/tcg";
import type { TcgSet } from "@/lib/tcg/types";

/** The full builder page chrome — shared by / and /b/[token]. */
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
      {/* Site/app/FAQ JSON-LD targets the home page; the shared /b/[token]
          usage also ships it, which is harmless — those pages are noindexed. */}
      <JsonLd data={[webSiteJsonLd(), webApplicationJsonLd(), faqJsonLd(FAQ_ENTRIES)]} />
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
        <FaqSection />
      </main>
      <GbKbdHint />
      <footer className="border-t-4 border-gb-ink px-4 py-3 text-center font-pixel text-[10px]">
        NOMEKOP · NOT AFFILIATED WITH NINTENDO / THE POKEMON COMPANY
      </footer>
      <Toaster position="bottom-center" />
    </>
  );
}
