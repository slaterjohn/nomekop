import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import FaqsIndexPage from "@/app/faqs/page";
import FaqSetHubPage from "@/app/faqs/set/[setId]/page";
import { SetFaqSpotlight } from "@/components/home/set-faq-spotlight";
import { UpcomingSets } from "@/components/home/upcoming-sets";
import {
  faqSetsByEra,
  faqPagesForSet,
  upcomingFaqSets,
} from "@/lib/content/faqs/registry";

const reEscape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// These pages decide "coming soon" from the current date (see the note in
// lib/content/faqs/registry.ts), and they call the registry with no explicit
// `now`. Pin the clock so the suite doesn't quietly change meaning — and then
// start failing — as each announced set's real release date goes by.
//
// 2026-08-04: Pitch Black (2026-07-17) has released; 30th Celebration
// (2026-09-16) and Delta Reign (2026-11-06) are still to come.
const FIXED_NOW = Date.parse("2026-08-04T12:00:00Z");
beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("/faqs index (set cards grouped by era)", () => {
  it("renders an era heading and a hub-linked card for every set", () => {
    render(<FaqsIndexPage />);
    const eras = faqSetsByEra();
    expect(eras.length).toBeGreaterThanOrEqual(2);
    for (const group of eras) {
      expect(
        screen.getByRole("heading", { level: 2, name: new RegExp(reEscape(group.era), "i") }),
      ).toBeInTheDocument();
      for (const set of group.sets) {
        const link = screen.getByRole("link", {
          name: new RegExp(`${reEscape(set.fullName)} FAQs`, "i"),
        });
        expect(link).toHaveAttribute("href", `/faqs/set/${set.id}`);
      }
    }
  });

  it("flags upcoming sets as coming soon", () => {
    render(<FaqsIndexPage />);
    expect(screen.getAllByText(/coming soon/i).length).toBeGreaterThan(0);
  });

  it("has no axe violations", async () => {
    const { container } = render(<FaqsIndexPage />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("/faqs/set/[setId] hub", () => {
  it("lists every FAQ for a released set and links its info page", async () => {
    render(await FaqSetHubPage({ params: Promise.resolve({ setId: "me4" }) }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Chaos Rising FAQs/i);

    const pages = faqPagesForSet("me4");
    for (const page of pages.slice(0, 3)) {
      expect(
        screen.getByRole("link", { name: new RegExp(reEscape(page.question.slice(0, 24)), "i") }),
      ).toBeInTheDocument();
    }

    expect(
      screen.getByRole("link", { name: /See every Chaos Rising card/i }),
    ).toHaveAttribute("href", "/set/me4");
  });

  it("renders linked card scans that open the card page", async () => {
    render(await FaqSetHubPage({ params: Promise.resolve({ setId: "me4" }) }));
    // The chase strip wraps each scan in a link to /card/<id>.
    const cardLinks = screen
      .getAllByRole("link")
      .filter((a) => a.getAttribute("href")?.startsWith("/card/me4-"));
    expect(cardLinks.length).toBeGreaterThan(0);
  });

  it("marks an unreleased hub coming soon with no /set info link", async () => {
    render(
      await FaqSetHubPage({ params: Promise.resolve({ setId: "upcoming-30th-celebration" }) }),
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/30th Celebration FAQs/i);
    expect(screen.getAllByText(/coming soon/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/isn't out yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /See every .* card/i })).toBeNull();
  });

  // A hand-authored set that has released but has no card data yet. It must drop
  // the "coming soon" framing, and it must NOT offer the /set or /build buttons —
  // its id ("upcoming-pitch-black") isn't a real set, so both would be dead links.
  it("drops coming-soon on a released hand-authored set, without dead card links", async () => {
    render(await FaqSetHubPage({ params: Promise.resolve({ setId: "upcoming-pitch-black" }) }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Pitch Black FAQs/i);
    expect(screen.queryByText(/coming soon/i)).toBeNull();
    expect(screen.queryByText(/isn't out yet/i)).toBeNull();
    expect(screen.getByText(/came out on July 17, 2026/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /See every .* card/i })).toBeNull();
    expect(
      screen.getAllByRole("link").filter((a) => a.getAttribute("href")?.startsWith("/build")),
    ).toHaveLength(0);
  });

  it("has no axe violations (released + upcoming)", async () => {
    const released = render(await FaqSetHubPage({ params: Promise.resolve({ setId: "me4" }) }));
    expect(await axe(released.container)).toHaveNoViolations();
    released.unmount();
    const upcoming = render(
      await FaqSetHubPage({ params: Promise.resolve({ setId: "upcoming-30th-celebration" }) }),
    );
    expect(await axe(upcoming.container)).toHaveNoViolations();
    upcoming.unmount();
    const awaitingData = render(
      await FaqSetHubPage({ params: Promise.resolve({ setId: "upcoming-pitch-black" }) }),
    );
    expect(await axe(awaitingData.container)).toHaveNoViolations();
  });
});

describe("home FAQ spotlight + upcoming sections", () => {
  const items = [
    { slug: "how-many-cards-in-chaos-rising", question: "How many cards are in Chaos Rising?", answer: "Chaos Rising has 86 cards." },
    { slug: "rarest-card-in-chaos-rising", question: "What is the rarest card in Chaos Rising?", answer: "Cinccino ex." },
  ];

  it("spotlight links the question and the set hub", () => {
    // The spotlight rotates by day-of-epoch (floor(now / 86.4e6) % items.length).
    // Under RTL the client snapshot wins, so pin the clock to day 0 — the index
    // lands on the first item, the same stable pick the server snapshot renders.
    // Without this the test only passes on even-numbered days.
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(0);
    try {
      render(<SetFaqSpotlight setName="Chaos Rising" hubHref="/faqs/set/me4" items={items} />);
      expect(
        screen.getByRole("link", { name: /How many cards are in Chaos Rising/i }),
      ).toHaveAttribute("href", "/faqs/how-many-cards-in-chaos-rising");
      expect(screen.getByRole("link", { name: /All Chaos Rising FAQs/i })).toHaveAttribute(
        "href",
        "/faqs/set/me4",
      );
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("upcoming section lists every upcoming set linking to its hub", () => {
    const upcoming = upcomingFaqSets();
    render(<UpcomingSets sets={upcoming} />);
    expect(screen.getByRole("heading", { level: 2, name: /coming soon/i })).toBeInTheDocument();
    for (const set of upcoming) {
      expect(
        screen.getByRole("link", { name: new RegExp(`${reEscape(set.fullName)} FAQs`, "i") }),
      ).toHaveAttribute("href", `/faqs/set/${set.id}`);
    }
  });

  // The bug this replaced: Pitch Black released on 2026-07-17 and sat under
  // "Coming soon" until a human noticed. With the clock pinned past that date it
  // has to be gone, and the sets that genuinely are still coming have to remain.
  it("upcoming section drops a set once its release date has passed", () => {
    const ids = upcomingFaqSets().map((s) => s.id);
    expect(ids).not.toContain("upcoming-pitch-black");
    expect(ids).toEqual(["upcoming-30th-celebration", "upcoming-delta-reign"]);

    render(<UpcomingSets sets={upcomingFaqSets()} />);
    expect(screen.queryByText(/Pitch Black/i)).toBeNull();
    expect(screen.getAllByText(/30th Celebration/i).length).toBeGreaterThan(0);
  });

  // Nothing to preview → render nothing, rather than an empty dashed panel.
  it("upcoming section disappears entirely once every announced set has shipped", () => {
    const { container } = render(<UpcomingSets sets={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("axe clean", async () => {
    const spotlight = render(
      <SetFaqSpotlight setName="Chaos Rising" hubHref="/faqs/set/me4" items={items} />,
    );
    expect(await axe(spotlight.container)).toHaveNoViolations();
    spotlight.unmount();
    const up = render(<UpcomingSets sets={upcomingFaqSets()} />);
    expect(await axe(up.container)).toHaveNoViolations();
  });
});
