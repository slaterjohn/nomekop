import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { ARTICLES, getArticle } from "@/lib/content/articles";
import { renderMarkdown } from "@/lib/content/render";
import { articleJsonLd, factsCollectionJsonLd } from "@/lib/structured-data";
import FactsIndexPage from "@/app/facts/page";
import FactPage from "@/app/facts/[slug]/page";
import { GET as markdownRoute } from "@/app/facts/[slug]/markdown/route";

describe("fun-fact articles", () => {
  it("every article is well-formed with valid internal links", () => {
    expect(ARTICLES.length).toBeGreaterThanOrEqual(5);
    for (const a of ARTICLES) {
      expect(a.slug).toMatch(/^[a-z0-9-]+$/);
      expect(a.question.length).toBeGreaterThan(8);
      expect(a.description.length).toBeGreaterThan(20);
      expect(a.body.length).toBeGreaterThan(200);
      expect(a.related.href.startsWith("/")).toBe(true);
      // Link normalisation: no absolute self-links, no token-less binder links.
      expect(a.body).not.toContain("nomekop.app");
      expect(a.body).not.toMatch(/\]\(\/pokemon\/[a-z-]+\)/); // must carry a ~token
      expect(a.body).not.toMatch(/\]\(\/illustrator\/[a-z-]+\)/);
    }
  });

  it("renders markdown to semantic HTML", () => {
    const html = renderMarkdown("## Heading\n\nA **bold** word and a [link](/sets).");
    expect(html).toContain("<h2");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain('href="/sets"');
  });
});

describe("/facts index", () => {
  it("lists every article as a link with its question", async () => {
    render(await FactsIndexPage());
    expect(screen.getByRole("heading", { level: 1, name: /fun facts/i })).toBeInTheDocument();
    for (const a of ARTICLES) {
      expect(screen.getByRole("link", { name: new RegExp(a.question.slice(0, 20), "i") })).toBeInTheDocument();
    }
  });

  it("has no axe violations", async () => {
    const { container } = render(await FactsIndexPage());
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("/facts/[slug] article page", () => {
  const slug = "first-pikachu-card";

  it("renders the headline, the markdown companion link, and the body", async () => {
    render(await FactPage({ params: Promise.resolve({ slug }) }));
    const article = getArticle(slug)!;
    expect(screen.getByRole("heading", { level: 1, name: article.question })).toBeInTheDocument();
    const mdLink = screen.getByRole("link", { name: /READ AS MARKDOWN/i });
    expect(mdLink).toHaveAttribute("href", `/facts/${slug}/markdown`);
    expect(screen.getAllByText(/Base Set/).length).toBeGreaterThan(0);
  });

  it("has no axe violations", async () => {
    const { container } = render(await FactPage({ params: Promise.resolve({ slug }) }));
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("/facts/[slug]/markdown route", () => {
  it("serves the article as text/markdown with attribution", async () => {
    const res = await markdownRoute(new Request("http://localhost/facts/first-pikachu-card/markdown"), {
      params: Promise.resolve({ slug: "first-pikachu-card" }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/markdown");
    const text = await res.text();
    expect(text).toContain("# Which was the first Pikachu card?");
    expect(text).toContain("Source:");
    expect(text).toContain("Base Set");
  });

  it("404s an unknown slug", async () => {
    const res = await markdownRoute(new Request("http://localhost/facts/nope/markdown"), {
      params: Promise.resolve({ slug: "nope" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("article structured data", () => {
  it("emits BlogPosting + FAQPage for an article", () => {
    const [blog, faq] = articleJsonLd(ARTICLES[0]!);
    expect(blog!["@type"]).toBe("BlogPosting");
    expect(faq!["@type"]).toBe("FAQPage");
  });

  it("emits a Blog collection for the index", () => {
    const data = factsCollectionJsonLd(ARTICLES);
    expect(data["@type"]).toBe("Blog");
    expect((data.blogPost as unknown[]).length).toBe(ARTICLES.length);
  });
});
