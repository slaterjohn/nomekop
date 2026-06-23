import { describe, it, expect, vi } from "vitest";
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

  it("marks an upcoming hub coming soon with no /set info link", async () => {
    render(await FaqSetHubPage({ params: Promise.resolve({ setId: "upcoming-pitch-black" }) }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Pitch Black FAQs/i);
    expect(screen.getAllByText(/coming soon/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: /See every .* card/i })).toBeNull();
  });

  it("has no axe violations (released + upcoming)", async () => {
    const released = render(await FaqSetHubPage({ params: Promise.resolve({ setId: "me4" }) }));
    expect(await axe(released.container)).toHaveNoViolations();
    released.unmount();
    const upcoming = render(
      await FaqSetHubPage({ params: Promise.resolve({ setId: "upcoming-pitch-black" }) }),
    );
    expect(await axe(upcoming.container)).toHaveNoViolations();
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
