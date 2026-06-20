import { HomeTiles } from "@/components/home/home-tiles";
import { FaqSection } from "@/components/faq-section";
import { DidYouKnow } from "@/components/did-you-know";
import { SetFaqSpotlight } from "@/components/home/set-faq-spotlight";
import { UpcomingSets } from "@/components/home/upcoming-sets";
import { JsonLd } from "@/components/json-ld";
import { getServerDictionary } from "@/lib/i18n/server";
import { APP_INTRO, FAQ_ENTRIES } from "@/lib/faq";
import { SITE_IDENTITY } from "@/lib/site";
import {
  faqPagesForSet,
  latestReleasedFaqSet,
  upcomingFaqSets,
} from "@/lib/content/faqs/registry";
import {
  faqJsonLd,
  organizationJsonLd,
  webApplicationJsonLd,
  webSiteJsonLd,
} from "@/lib/structured-data";

export const dynamic = "force-dynamic";

/** The hub homepage: hero, binder-type tiles, a rotating fact, a spotlight FAQ
 *  from the newest set, upcoming sets, intro and FAQ. */
export default async function Home() {
  const { dict } = await getServerDictionary();
  const latestSet = latestReleasedFaqSet();
  const spotlightItems = latestSet
    ? faqPagesForSet(latestSet.id).map((p) => ({
        slug: p.slug,
        question: p.question,
        answer: p.description,
      }))
    : [];
  const upcoming = upcomingFaqSets();
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
        {latestSet && spotlightItems.length > 0 ? (
          <SetFaqSpotlight
            setName={latestSet.name}
            hubHref={latestSet.hubHref}
            items={spotlightItems}
          />
        ) : null}
        <UpcomingSets sets={upcoming} />
        <FaqSection />
      </main>
    </>
  );
}
