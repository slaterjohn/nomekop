import { Header } from "@/components/header";
import { HomeTiles } from "@/components/home/home-tiles";
import { FaqSection } from "@/components/faq-section";
import { JsonLd } from "@/components/json-ld";
import { APP_INTRO, FAQ_ENTRIES } from "@/lib/faq";
import { faqJsonLd, webApplicationJsonLd, webSiteJsonLd } from "@/lib/structured-data";

export const dynamic = "force-dynamic";

/** The hub homepage: hero, binder-type tiles, intro and FAQ (SEO content). */
export default function Home() {
  return (
    <>
      <JsonLd data={[webSiteJsonLd(), webApplicationJsonLd(), faqJsonLd(FAQ_ENTRIES)]} />
      <Header />
      <main id="main" className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8">
        <section className="flex flex-col gap-3">
          <h1 className="font-pixel text-xl leading-relaxed sm:text-3xl">
            BUILD THE PERFECT BINDER
          </h1>
          <p className="max-w-3xl font-body text-xl leading-tight sm:text-2xl">{APP_INTRO}</p>
        </section>
        <HomeTiles />
        <FaqSection />
      </main>
    </>
  );
}
