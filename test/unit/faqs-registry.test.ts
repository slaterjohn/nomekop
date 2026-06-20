import { describe, expect, it } from "vitest";
import {
  FAQ_PAGES,
  ALL_FAQ_PAGES,
  getFaqPage,
  faqPagesForSet,
  faqSlugs,
  faqSetName,
  faqSetSummaries,
  faqSetsByEra,
  getFaqSetSummary,
  faqSetIds,
} from "@/lib/content/faqs/registry";
import { ERA_ORDER } from "@/lib/content/faqs/eras";

// A related href is an internal FAQ link (bare slug) when it's not an app route
// (/…) or external URL (http…) — exactly the hrefFor() rule on the detail page.
const isInternalFaq = (href: string) => !/^(https?:|\/)/.test(href);

describe("faq registry", () => {
  it("produces a sizeable, slug-unique page set", () => {
    expect(FAQ_PAGES.length).toBeGreaterThan(250);
    expect(new Set(faqSlugs).size).toBe(faqSlugs.length);
    // faqSlugs covers upcoming + released pages.
    expect(faqSlugs.length).toBe(ALL_FAQ_PAGES.length);
  });

  it("skips valuable-card pages for priceless sets", () => {
    const priceless = new Set(["me4", "me3", "me2pt5"]);
    const valuable = FAQ_PAGES.filter((p) => p.type === "valuable-card");
    expect(valuable.some((p) => priceless.has(p.setId))).toBe(false);
    expect(valuable.length).toBe(17);
  });

  it("only emits ball-pattern pages for ball-pattern sets", () => {
    const ball = FAQ_PAGES.filter((p) => p.type === "ball-patterns");
    expect(ball.map((p) => p.setId).sort()).toEqual(["rsv10pt5", "sv8pt5", "zsv10pt5"]);
  });

  it("includes hand-authored upcoming-set pages", () => {
    const upcoming = ALL_FAQ_PAGES.filter((p) => p.type === "upcoming");
    expect(upcoming.length).toBeGreaterThanOrEqual(15);
    // The three announced 2026 sets are all represented.
    const setIds = new Set(upcoming.map((p) => p.setId));
    expect(setIds).toEqual(
      new Set(["upcoming-pitch-black", "upcoming-30th-celebration", "upcoming-delta-reign"]),
    );
    // A couple of marquee pages resolve, and faqSetName works for upcoming ids.
    expect(getFaqPage("is-storm-emerald-the-same-as-delta-reign")?.type).toBe("upcoming");
    expect(faqSetName("upcoming-pitch-black")).toBe("Pitch Black");
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
    const summaries = faqSetSummaries();
    // 20 released + 3 upcoming sets in scope.
    expect(summaries.length).toBe(23);
    expect(summaries.every((s) => s.faqCount > 0)).toBe(true);
    // faqCount matches the actual page set for that id.
    for (const s of summaries) {
      expect(s.faqCount).toBe(faqPagesForSet(s.id).length);
      expect(s.hubHref).toBe(`/faqs/set/${s.id}`);
    }
    expect(new Set(faqSetIds)).toEqual(new Set(summaries.map((s) => s.id)));
  });

  it("released sets carry a logo + /set info link; upcoming sets carry neither", () => {
    const me4 = getFaqSetSummary("me4");
    expect(me4?.isUpcoming).toBe(false);
    expect(me4?.logoUrl).toMatch(/^https?:\/\//);
    expect(me4?.infoHref).toBe("/set/me4");

    const pb = getFaqSetSummary("upcoming-pitch-black");
    expect(pb?.isUpcoming).toBe(true);
    expect(pb?.name).toBe("Pitch Black");
    expect(pb?.logoUrl).toBeUndefined();
    expect(pb?.infoHref).toBeUndefined();
    expect(pb?.releaseLabel).toBe("July 17, 2026");
  });

  it("groups by era in ERA_ORDER, upcoming-first then newest released within an era", () => {
    const groups = faqSetsByEra();
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
