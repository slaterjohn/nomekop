import { HomeTiles } from "@/components/home/home-tiles";
import { FaqSection } from "@/components/faq-section";
import { DidYouKnow } from "@/components/did-you-know";
import { JsonLd } from "@/components/json-ld";
import { getServerDictionary } from "@/lib/i18n/server";
import { APP_INTRO, FAQ_ENTRIES } from "@/lib/faq";
import { SITE_IDENTITY } from "@/lib/site";
import {
  faqJsonLd,
  organizationJsonLd,
  webApplicationJsonLd,
  webSiteJsonLd,
} from "@/lib/structured-data";

export const dynamic = "force-dynamic";

/** The hub homepage: hero, binder-type tiles, a rotating fact, intro and FAQ. */
export default async function Home() {
  const { dict } = await getServerDictionary();
  return (
    <>
      <JsonLd
        data={[
          organizationJsonLd(),
          webSiteJsonLd(),
          webApplicationJsonLd(),
          faqJsonLd(FAQ_ENTRIES),
        ]}
      />
      <main id="main" className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8">
        <section className="flex flex-col gap-3">
          <h1 className="font-pixel text-xl uppercase leading-relaxed sm:text-3xl">
            {dict.home.heroTitle}
          </h1>
          <p className="max-w-3xl font-body text-xl font-semibold leading-tight sm:text-2xl">
            {SITE_IDENTITY}
          </p>
          <p className="max-w-3xl font-body text-xl leading-tight sm:text-2xl">{APP_INTRO}</p>
        </section>
        <HomeTiles />
        <DidYouKnow />
        <FaqSection />
      </main>
    </>
  );
}
