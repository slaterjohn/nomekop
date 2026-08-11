import { describe, expect, it, vi } from "vitest";
import {
  FAQ_PAGES,
  FAQ_SETS,
  ALL_FAQ_PAGES,
  getFaqPage,
  faqPagesForSet,
  faqSlugs,
  faqSetName,
  faqSetSummaries,
  faqSetsByEra,
  getFaqSetSummary,
  faqSetIds,
  upcomingFaqSets,
} from "@/lib/content/faqs/registry";
import { ERA_ORDER } from "@/lib/content/faqs/eras";
import { ANNOUNCED_SETS, hasReleased, todayIso } from "@/lib/content/faqs/upcoming";

// A related href is an internal FAQ link (bare slug) when it's not an app route
// (/…) or external URL (http…) — exactly the hrefFor() rule on the detail page.
const isInternalFaq = (href: string) => !/^(https?:|\/)/.test(href);

// Every date-sensitive registry function takes an explicit `now`. Pin it here
// rather than letting the suite read the wall clock, or these expectations rot
// the moment a real release date passes.
const at = (iso: string) => Date.parse(`${iso}T12:00:00Z`);
// Pitch Black used to be the boundary set here. It released and reached the
// cache DB in August 2026, so its hand-authored pages were pruned and the
// data-driven templates cover it as `me5`. 30th Celebration (2026-09-16) is now
// the soonest announced set, so it plays the role Pitch Black used to.
const CELEBRATION_RELEASE = "2026-09-16";
/** 30th Celebration still ahead; both announced sets upcoming. */
const BEFORE_CELEBRATION = at("2026-09-01");
/** 30th Celebration out, Delta Reign still to come. */
const AFTER_CELEBRATION = at("2026-10-01");

describe("faq registry", () => {
  it("produces a sizeable, slug-unique page set", () => {
    expect(FAQ_PAGES.length).toBeGreaterThan(250);
    expect(new Set(faqSlugs).size).toBe(faqSlugs.length);
    // faqSlugs covers upcoming + released pages.
    expect(faqSlugs.length).toBe(ALL_FAQ_PAGES.length);
  });

  it("skips valuable-card pages for priceless sets", () => {
    // The unpriced 2026 Mega Evolution sets have no market data → no MVP page.
    const priceless = new Set(["me5", "me4", "me3", "me2pt5"]);
    const valuable = FAQ_PAGES.filter((p) => p.type === "valuable-card");
    expect(valuable.some((p) => priceless.has(p.setId))).toBe(false);
    // Exactly one per released set that has a most-valuable (priced) card.
    const pricedSets = FAQ_SETS.filter((s) => s.mostValuableCard);
    expect(valuable.length).toBe(pricedSets.length);
    expect(valuable.length).toBeGreaterThan(20);
  });

  it("skips master-set / secret-rare / reverse-holo pages for a flat set (Celebrations)", () => {
    // cel25 has no reverse holos, no secret rares and master = base, so those
    // 'would just answer 0' pages are not generated.
    const types = new Set(faqPagesForSet("cel25").map((p) => p.type));
    expect(types.has("master-set")).toBe(false);
    expect(types.has("secret-rares")).toBe(false);
    expect(types.has("reverse-holos")).toBe(false);
    // It still has the core pages.
    expect(types.has("card-count")).toBe(true);
    expect(types.has("rarest-card")).toBe(true);
  });

  it("only emits ball-pattern pages for pattern sets (incl. me2pt5's Energy pattern)", () => {
    const ball = FAQ_PAGES.filter((p) => p.type === "ball-patterns");
    // me2pt5 (Ascended Heroes) qualifies via its Poké Ball + Energy patterns.
    expect(ball.map((p) => p.setId).sort()).toEqual(["me2pt5", "rsv10pt5", "sv8pt5", "zsv10pt5"]);
  });

  it("includes hand-authored pages for every announced set", () => {
    const handAuthored = ALL_FAQ_PAGES.filter((p) => p.type === "upcoming");
    expect(handAuthored.length).toBeGreaterThanOrEqual(12);
    // Both announced 2026 sets are represented.
    const setIds = new Set(handAuthored.map((p) => p.setId));
    expect(setIds).toEqual(new Set(ANNOUNCED_SETS.map((s) => s.id)));
    // A couple of marquee pages resolve, and faqSetName works for announced ids.
    expect(getFaqPage("is-storm-emerald-the-same-as-delta-reign")?.type).toBe("upcoming");
    expect(faqSetName("upcoming-30th-celebration")).toBe("30th Celebration");
  });

  // Regression for the index-binding landmine: pages used to bind their set via
  // UPCOMING_SETS[0]/[1]/[2], so deleting an entry silently re-filed every page
  // below it under the wrong set — no type error, no failing test. Binding by id
  // makes that impossible; this asserts the pairing stays honest either way.
  it("files every hand-authored page under the set it actually talks about", () => {
    const shortNameById = new Map(ANNOUNCED_SETS.map((s) => [s.id, s.shortName]));
    for (const page of ALL_FAQ_PAGES.filter((p) => p.type === "upcoming")) {
      const shortName = shortNameById.get(page.setId);
      expect(shortName, `unknown setId ${page.setId}`).toBeDefined();
      // The set's own name appears in its pages' text; another set's does not.
      expect(page.body).toContain(shortName!);
      for (const [otherId, otherName] of shortNameById) {
        if (otherId === page.setId) continue;
        expect(page.question).not.toContain(otherName);
      }
    }
  });

  // Pitch Black completed the whole lifecycle: announced → released without card
  // data → in the cache DB. Its hand-authored block is gone and the templates
  // answer for it off real card data, under the real set id.
  it("hands Pitch Black over to the data-driven templates", () => {
    expect(faqPagesForSet("upcoming-pitch-black")).toEqual([]);

    const me5 = faqPagesForSet("me5");
    expect(me5.length).toBeGreaterThan(6);
    expect(me5.every((p) => p.type !== "upcoming")).toBe(true);
    // Nothing carries the hand-authored standing notes any more.
    for (const page of me5) {
      expect(page.body).not.toContain("Out now, data pending");
      expect(page.body).not.toMatch(/\bPre-release set\b/);
    }

    // The two slugs the hand-authored pages used to own are template slugs, so
    // the templates take the URLs over in place rather than orphaning them.
    const slugs = me5.map((p) => p.slug);
    expect(slugs).toContain("how-many-cards-in-pitch-black");
    expect(slugs).toContain("chase-cards-in-pitch-black");

    // These predate the template scheme and have no successor, so they are
    // redirected in next.config.ts — assert they really are gone from the
    // registry, which is what makes those redirects reachable.
    expect(faqSlugs).not.toContain("when-does-pitch-black-come-out");
    expect(faqSlugs).not.toContain("where-to-preorder-pitch-black");
    expect(faqSlugs).toContain("when-did-pitch-black-come-out");
  });

  it("has no dangling internal FAQ links (released + upcoming)", () => {
    const known = new Set(faqSlugs);
    for (const page of ALL_FAQ_PAGES) {
      for (const r of page.related) {
        if (isInternalFaq(r.href)) expect(known.has(r.href)).toBe(true);
      }
    }
  });

  it("every page answer (description) is non-empty and mirrored into the body", () => {
    for (const page of ALL_FAQ_PAGES) {
      expect(page.description.length).toBeGreaterThan(20);
      expect(page.body).toContain(page.description);
      expect(page.question).toMatch(/\?$/);
    }
  });

  it("getFaqPage + faqPagesForSet resolve", () => {
    const sample = FAQ_PAGES[0]!;
    expect(getFaqPage(sample.slug)).toBe(sample);
    expect(faqPagesForSet(sample.setId)).toContain(sample);
    expect(getFaqPage("does-not-exist")).toBeUndefined();
  });
});

describe("faq set summaries + era grouping", () => {
  it("summarises every released + upcoming set with a non-zero FAQ count", () => {
    const summaries = faqSetSummaries(BEFORE_CELEBRATION);
    // One summary per released (snapshot) set plus each upcoming set.
    expect(summaries.filter((s) => !s.isUpcoming).length).toBe(FAQ_SETS.length);
    expect(summaries.filter((s) => s.isUpcoming).length).toBeGreaterThanOrEqual(2);
    expect(summaries.length).toBe(FAQ_SETS.length + summaries.filter((s) => s.isUpcoming).length);
    expect(summaries.every((s) => s.faqCount > 0)).toBe(true);
    // faqCount matches the actual page set for that id.
    for (const s of summaries) {
      expect(s.faqCount).toBe(faqPagesForSet(s.id).length);
      expect(s.hubHref).toBe(`/faqs/set/${s.id}`);
    }
    expect(new Set(faqSetIds)).toEqual(new Set(summaries.map((s) => s.id)));
  });

  it("released sets carry a logo + /set info link; upcoming sets carry neither", () => {
    const me4 = getFaqSetSummary("me4", BEFORE_CELEBRATION);
    expect(me4?.isUpcoming).toBe(false);
    expect(me4?.logoUrl).toMatch(/^https?:\/\//);
    expect(me4?.infoHref).toBe("/set/me4");

    const c30 = getFaqSetSummary("upcoming-30th-celebration", BEFORE_CELEBRATION);
    expect(c30?.isUpcoming).toBe(true);
    expect(c30?.name).toBe("30th Celebration");
    expect(c30?.logoUrl).toBeUndefined();
    expect(c30?.infoHref).toBeUndefined();
    expect(c30?.releaseLabel).toBe("September 16, 2026");
  });

  it("groups by era in ERA_ORDER, upcoming-first then newest released within an era", () => {
    const groups = faqSetsByEra(BEFORE_CELEBRATION);
    expect(groups.map((g) => g.era)).toEqual([...ERA_ORDER]);

    const mega = groups[0]!;
    expect(mega.era).toBe("Mega Evolution");
    // Upcoming Mega sets lead, soonest-first (30th → Delta Reign).
    const upcomingIds = mega.sets.filter((s) => s.isUpcoming).map((s) => s.id);
    expect(upcomingIds).toEqual(["upcoming-30th-celebration", "upcoming-delta-reign"]);
    // All upcoming come before any released set in the group.
    const firstReleased = mega.sets.findIndex((s) => !s.isUpcoming);
    expect(mega.sets.slice(0, firstReleased).every((s) => s.isUpcoming)).toBe(true);
    // Released Mega sets are newest-first (me5 released 2026/07 → leads me4).
    const released = mega.sets.filter((s) => !s.isUpcoming);
    expect(released[0]?.id).toBe("me5");
  });

  it("every summary id resolves to a hub-routable set", () => {
    for (const id of faqSetIds) {
      expect(getFaqSetSummary(id)).toBeDefined();
    }
  });
});

describe("date-driven upcoming expiry", () => {
  it("every announced set has an ISO release date matching its display label", () => {
    for (const set of ANNOUNCED_SETS) {
      expect(set.releaseDate, set.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(set.checkedOn, set.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // "2026-07-17" and "July 17, 2026" must agree, or the machine-readable
      // field expires the set on a different day from the one users are told.
      const [y, m, d] = set.releaseDate.split("-").map(Number);
      const labelled = new Date(`${set.releaseLabel} UTC`);
      expect(labelled.getUTCFullYear(), set.id).toBe(y);
      expect(labelled.getUTCMonth() + 1, set.id).toBe(m);
      expect(labelled.getUTCDate(), set.id).toBe(d);
    }
  });

  it("lists sets soonest-first", () => {
    const dates = ANNOUNCED_SETS.map((s) => s.releaseDate);
    expect(dates).toEqual([...dates].sort());
  });

  it("keeps a set upcoming the day before it releases", () => {
    const ids = upcomingFaqSets(at("2026-09-15")).map((s) => s.id);
    expect(ids).toContain("upcoming-30th-celebration");
  });

  // The boundary the whole feature turns on: a set releasing TODAY is out.
  it("drops a set on its release day, not the day after", () => {
    expect(upcomingFaqSets(at(CELEBRATION_RELEASE)).map((s) => s.id)).not.toContain(
      "upcoming-30th-celebration",
    );
    // By id, never by index — ANNOUNCED_SETS[0] silently means a different set
    // every time an entry is pruned, which is exactly how this file's sibling
    // bug re-filed one set's answers under another.
    const c30 = ANNOUNCED_SETS.find((s) => s.id === "upcoming-30th-celebration")!;
    expect(hasReleased(c30, CELEBRATION_RELEASE)).toBe(true);
    expect(hasReleased(c30, "2026-09-15")).toBe(false);
  });

  it("flips exactly at UTC midnight", () => {
    const idsAt = (ms: number) => upcomingFaqSets(ms).map((s) => s.id);
    expect(idsAt(Date.parse("2026-09-15T23:59:59.999Z"))).toContain("upcoming-30th-celebration");
    expect(idsAt(Date.parse("2026-09-16T00:00:00.000Z"))).not.toContain(
      "upcoming-30th-celebration",
    );
  });

  it("expires one set at a time, leaving later ones alone", () => {
    expect(upcomingFaqSets(BEFORE_CELEBRATION).map((s) => s.id)).toEqual([
      "upcoming-30th-celebration",
      "upcoming-delta-reign",
    ]);
    expect(upcomingFaqSets(AFTER_CELEBRATION).map((s) => s.id)).toEqual(["upcoming-delta-reign"]);
    // Past every announced date the section empties out rather than going stale.
    expect(upcomingFaqSets(at("2027-01-01"))).toEqual([]);
  });

  // The freeze this feature exists to prevent: a module-scope Date.now() (or a
  // Map built from one) is evaluated once per process, so a long-running server
  // would keep serving the boot-day list forever.
  it("reads the clock per call, not once at module load", () => {
    expect(upcomingFaqSets(BEFORE_CELEBRATION)).toHaveLength(2);
    expect(upcomingFaqSets(AFTER_CELEBRATION)).toHaveLength(1);
    expect(upcomingFaqSets(BEFORE_CELEBRATION)).toHaveLength(2);
  });

  it("defaults `now` to the current time when no clock is passed", () => {
    const spy = vi.spyOn(Date, "now").mockReturnValue(BEFORE_CELEBRATION);
    try {
      expect(upcomingFaqSets().map((s) => s.id)).toContain("upcoming-30th-celebration");
      spy.mockReturnValue(AFTER_CELEBRATION);
      expect(upcomingFaqSets().map((s) => s.id)).not.toContain("upcoming-30th-celebration");
    } finally {
      spy.mockRestore();
    }
  });

  // Lifecycle stage two: out on shelves, but pokemontcg.io has not published its
  // cards yet, so it is still served from the hand-authored block. Its indexed
  // URLs must not 404 just because the clock rolled past the release date.
  it("a released set keeps its pages, hub and era grouping — it just stops saying coming soon", () => {
    const c30 = getFaqSetSummary("upcoming-30th-celebration", AFTER_CELEBRATION);
    expect(c30?.isUpcoming).toBe(false);
    // Given a real releaseDate so it sorts with the released sets…
    expect(c30?.releaseDate).toBe("2026/09/16");
    expect(c30?.order).toBeUndefined();
    // …but still no card data, so no logo and no /set page to link.
    expect(c30?.logoUrl).toBeUndefined();
    expect(c30?.infoHref).toBeUndefined();

    // Routing and content are date-independent.
    expect(faqSetIds).toContain("upcoming-30th-celebration");
    expect(faqPagesForSet("upcoming-30th-celebration").length).toBeGreaterThan(6);

    const mega = faqSetsByEra(AFTER_CELEBRATION).find((g) => g.era === "Mega Evolution")!;
    expect(mega.sets.map((s) => s.id)).toContain("upcoming-30th-celebration");
    // It now sorts among the released sets, ahead of me5 (2026/07/17).
    const released = mega.sets.filter((s) => !s.isUpcoming);
    expect(released[0]?.id).toBe("upcoming-30th-celebration");
    expect(released[1]?.id).toBe("me5");
  });

  it("todayIso is a UTC calendar date", () => {
    expect(todayIso(Date.parse("2026-07-17T00:00:00Z"))).toBe("2026-07-17");
    expect(todayIso(Date.parse("2026-07-17T23:59:59Z"))).toBe("2026-07-17");
  });
});
