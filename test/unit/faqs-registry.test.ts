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
/** Pitch Black (2026-07-17) still ahead; all three sets upcoming. */
const BEFORE_PITCH_BLACK = at("2026-07-01");
/** Pitch Black out, 30th Celebration + Delta Reign still to come. */
const AFTER_PITCH_BLACK = at("2026-08-04");

describe("faq registry", () => {
  it("produces a sizeable, slug-unique page set", () => {
    expect(FAQ_PAGES.length).toBeGreaterThan(250);
    expect(new Set(faqSlugs).size).toBe(faqSlugs.length);
    // faqSlugs covers upcoming + released pages.
    expect(faqSlugs.length).toBe(ALL_FAQ_PAGES.length);
  });

  it("skips valuable-card pages for priceless sets", () => {
    // The unpriced 2026 Mega Evolution sets have no market data → no MVP page.
    const priceless = new Set(["me4", "me3", "me2pt5"]);
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
    expect(handAuthored.length).toBeGreaterThanOrEqual(21);
    // The three announced 2026 sets are all represented.
    const setIds = new Set(handAuthored.map((p) => p.setId));
    expect(setIds).toEqual(new Set(ANNOUNCED_SETS.map((s) => s.id)));
    // A couple of marquee pages resolve, and faqSetName works for announced ids.
    expect(getFaqPage("is-storm-emerald-the-same-as-delta-reign")?.type).toBe("upcoming");
    expect(faqSetName("upcoming-pitch-black")).toBe("Pitch Black");
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

  it("expanded Pitch Black beyond its pre-release page set", () => {
    const pb = faqPagesForSet("upcoming-pitch-black");
    // Was 6 hand-authored pre-release pages; the released rewrite adds more.
    expect(pb.length).toBeGreaterThan(6);
    // The indexed pre-release slugs are kept so their URLs don't 404.
    const slugs = pb.map((p) => p.slug);
    expect(slugs).toContain("when-does-pitch-black-come-out");
    expect(slugs).toContain("where-to-preorder-pitch-black");
    // No page still claims the set is unreleased.
    for (const page of pb) {
      expect(page.body).not.toContain("isn't out yet");
      expect(page.body).not.toMatch(/\bPre-release set\b/);
    }
    // …and the standing note says it's out, without inventing a card count.
    expect(pb[0]!.body).toContain("Out now, data pending");
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
    const summaries = faqSetSummaries(BEFORE_PITCH_BLACK);
    // One summary per released (snapshot) set plus each upcoming set.
    expect(summaries.filter((s) => !s.isUpcoming).length).toBe(FAQ_SETS.length);
    expect(summaries.filter((s) => s.isUpcoming).length).toBeGreaterThanOrEqual(3);
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
    const me4 = getFaqSetSummary("me4", BEFORE_PITCH_BLACK);
    expect(me4?.isUpcoming).toBe(false);
    expect(me4?.logoUrl).toMatch(/^https?:\/\//);
    expect(me4?.infoHref).toBe("/set/me4");

    const pb = getFaqSetSummary("upcoming-pitch-black", BEFORE_PITCH_BLACK);
    expect(pb?.isUpcoming).toBe(true);
    expect(pb?.name).toBe("Pitch Black");
    expect(pb?.logoUrl).toBeUndefined();
    expect(pb?.infoHref).toBeUndefined();
    expect(pb?.releaseLabel).toBe("July 17, 2026");
  });

  it("groups by era in ERA_ORDER, upcoming-first then newest released within an era", () => {
    const groups = faqSetsByEra(BEFORE_PITCH_BLACK);
    expect(groups.map((g) => g.era)).toEqual([...ERA_ORDER]);

    const mega = groups[0]!;
    expect(mega.era).toBe("Mega Evolution");
    // Upcoming Mega sets lead, soonest-first (Pitch Black → 30th → Delta Reign).
    const upcomingIds = mega.sets.filter((s) => s.isUpcoming).map((s) => s.id);
    expect(upcomingIds).toEqual([
      "upcoming-pitch-black",
      "upcoming-30th-celebration",
      "upcoming-delta-reign",
    ]);
    // All upcoming come before any released set in the group.
    const firstReleased = mega.sets.findIndex((s) => !s.isUpcoming);
    expect(mega.sets.slice(0, firstReleased).every((s) => s.isUpcoming)).toBe(true);
    // Released Mega sets are newest-first (me4 released 2026/05 → leads me1).
    const released = mega.sets.filter((s) => !s.isUpcoming);
    expect(released[0]?.id).toBe("me4");
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
    const ids = upcomingFaqSets(at("2026-07-16")).map((s) => s.id);
    expect(ids).toContain("upcoming-pitch-black");
  });

  // The boundary the whole feature turns on: a set releasing TODAY is out.
  it("drops a set on its release day, not the day after", () => {
    expect(upcomingFaqSets(at("2026-07-17")).map((s) => s.id)).not.toContain(
      "upcoming-pitch-black",
    );
    expect(hasReleased(ANNOUNCED_SETS[0]!, "2026-07-17")).toBe(true);
    expect(hasReleased(ANNOUNCED_SETS[0]!, "2026-07-16")).toBe(false);
  });

  it("flips exactly at UTC midnight", () => {
    const idsAt = (ms: number) => upcomingFaqSets(ms).map((s) => s.id);
    expect(idsAt(Date.parse("2026-07-16T23:59:59.999Z"))).toContain("upcoming-pitch-black");
    expect(idsAt(Date.parse("2026-07-17T00:00:00.000Z"))).not.toContain("upcoming-pitch-black");
  });

  it("expires one set at a time, leaving later ones alone", () => {
    expect(upcomingFaqSets(BEFORE_PITCH_BLACK).map((s) => s.id)).toEqual([
      "upcoming-pitch-black",
      "upcoming-30th-celebration",
      "upcoming-delta-reign",
    ]);
    expect(upcomingFaqSets(AFTER_PITCH_BLACK).map((s) => s.id)).toEqual([
      "upcoming-30th-celebration",
      "upcoming-delta-reign",
    ]);
    // Past every announced date the section empties out rather than going stale.
    expect(upcomingFaqSets(at("2027-01-01"))).toEqual([]);
  });

  // The freeze this feature exists to prevent: a module-scope Date.now() (or a
  // Map built from one) is evaluated once per process, so a long-running server
  // would keep serving the boot-day list forever.
  it("reads the clock per call, not once at module load", () => {
    expect(upcomingFaqSets(BEFORE_PITCH_BLACK)).toHaveLength(3);
    expect(upcomingFaqSets(AFTER_PITCH_BLACK)).toHaveLength(2);
    expect(upcomingFaqSets(BEFORE_PITCH_BLACK)).toHaveLength(3);
  });

  it("defaults `now` to the current time when no clock is passed", () => {
    const spy = vi.spyOn(Date, "now").mockReturnValue(BEFORE_PITCH_BLACK);
    try {
      expect(upcomingFaqSets().map((s) => s.id)).toContain("upcoming-pitch-black");
      spy.mockReturnValue(AFTER_PITCH_BLACK);
      expect(upcomingFaqSets().map((s) => s.id)).not.toContain("upcoming-pitch-black");
    } finally {
      spy.mockRestore();
    }
  });

  it("a released set keeps its pages, hub and era grouping — it just stops saying coming soon", () => {
    const pb = getFaqSetSummary("upcoming-pitch-black", AFTER_PITCH_BLACK);
    expect(pb?.isUpcoming).toBe(false);
    // Given a real releaseDate so it sorts with the released sets…
    expect(pb?.releaseDate).toBe("2026/07/17");
    expect(pb?.order).toBeUndefined();
    // …but still no card data, so no logo and no /set page to link.
    expect(pb?.logoUrl).toBeUndefined();
    expect(pb?.infoHref).toBeUndefined();

    // Routing and content are date-independent: the indexed URLs must not 404
    // just because the clock rolled past the release date.
    expect(faqSetIds).toContain("upcoming-pitch-black");
    expect(faqPagesForSet("upcoming-pitch-black").length).toBeGreaterThan(6);

    const mega = faqSetsByEra(AFTER_PITCH_BLACK).find((g) => g.era === "Mega Evolution")!;
    expect(mega.sets.map((s) => s.id)).toContain("upcoming-pitch-black");
    // It now sorts among the released sets, ahead of me4 (2026/05/22).
    const released = mega.sets.filter((s) => !s.isUpcoming);
    expect(released[0]?.id).toBe("upcoming-pitch-black");
    expect(released[1]?.id).toBe("me4");
  });

  it("todayIso is a UTC calendar date", () => {
    expect(todayIso(Date.parse("2026-07-17T00:00:00Z"))).toBe("2026-07-17");
    expect(todayIso(Date.parse("2026-07-17T23:59:59Z"))).toBe("2026-07-17");
  });
});
