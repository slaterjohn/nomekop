import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Providers } from "@/components/providers";
import { Builder } from "@/components/builder/builder";
import { __resetChecklistStoreForTests } from "@/lib/checklist-store";
import type { TcgCard, TcgSet } from "@/lib/tcg/types";

// --- next/navigation mock: a reactive fake router so URL state re-renders ----
// The hook drives the address bar via history.replaceState (as Next does in
// production); this mock mirrors that by reading window.location and
// re-notifying subscribers whenever replaceState runs.
const nav = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  let searchCache: { key: string; params: URLSearchParams } | null = null;
  return {
    listeners,
    notify: () => listeners.forEach((l) => l()),
    subscribe: (fn: () => void) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    getPathname: () => window.location.pathname,
    getSearch: () => {
      const key = window.location.search;
      if (!searchCache || searchCache.key !== key) {
        searchCache = { key, params: new URLSearchParams(key) };
      }
      return searchCache.params;
    },
    push: vi.fn(),
    reset: () => {
      window.history.replaceState(null, "", "/");
      searchCache = null;
    },
  };
});

vi.mock("next/navigation", async () => {
  const { useSyncExternalStore } = await import("react");
  return {
    useRouter: () => ({ replace: vi.fn(), push: nav.push }),
    usePathname: () =>
      useSyncExternalStore(nav.subscribe, nav.getPathname, nav.getPathname),
    useSearchParams: () =>
      useSyncExternalStore(nav.subscribe, nav.getSearch, nav.getSearch),
  };
});

// Mirror Next's history-API sync: replaceState updates the hooks.
const origReplaceState = window.history.replaceState.bind(window.history);
window.history.replaceState = ((...args: Parameters<History["replaceState"]>) => {
  origReplaceState(...args);
  nav.notify();
}) as History["replaceState"];

// ------------------------------------------------------------------------------

let sets: TcgSet[];
let sv1Cards: TcgCard[];

beforeAll(async () => {
  const dir = path.join(process.cwd(), "test", "fixtures");
  sets = JSON.parse(await readFile(path.join(dir, "sets.json"), "utf8"));
  sv1Cards = JSON.parse(await readFile(path.join(dir, "cards-sv1.json"), "utf8"));
});

function mockCardsFetch(payload: unknown, status = 200, delayMs = 0) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (!url.includes("/api/cards/")) throw new Error(`unexpected fetch: ${url}`);
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
      return new Response(JSON.stringify(payload), {
        status,
        headers: { "content-type": "application/json" },
      });
    }),
  );
}

// The builder is builder-only now: it always mounts with a set (via
// /build?set=<id>, which the address bar then rewrites to a /b/<token> URL).
// Bare /build with no set is redirected to /sets server-side, so the builder no
// longer renders an in-page set chooser. Mount with the set already in the URL.
function renderBuilder(setId = "sv1") {
  window.history.replaceState(null, "", `/build?set=${setId}`);
  return render(
    <Providers>
      <Builder initialSets={sets} />
    </Providers>,
  );
}

beforeEach(() => {
  nav.reset();
  nav.push.mockClear();
  vi.unstubAllGlobals();
  localStorage.clear();
  __resetChecklistStoreForTests();
});

describe("Builder", () => {
  it("renders the chosen set's config, preview and actions", async () => {
    mockCardsFetch(sv1Cards);
    renderBuilder();

    expect(await screen.findByRole("heading", { name: /^configure binder$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^preview$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^print & download$/i })).toBeInTheDocument();
    expect(screen.getByText(/258 cards → 258 pockets → 22 pages/)).toBeInTheDocument();
    // The in-page set chooser is gone — set browsing lives at /sets.
    expect(screen.queryByRole("heading", { name: "Choose set" })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /search sets/i })).not.toBeInTheDocument();
  });

  it("shows a loading spinner while cards fetch", async () => {
    mockCardsFetch(sv1Cards, 200, 80);
    renderBuilder();
    expect(screen.getByRole("status")).toHaveTextContent(/Loading Scarlet & Violet/);
    expect(await screen.findByRole("heading", { name: /^preview$/i })).toBeInTheDocument();
  });

  it("card fetch failure shows an alert with Retry that recovers", async () => {
    let fail = true;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        if (fail) {
          return new Response(JSON.stringify({ error: "The library is down." }), {
            status: 503,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response(JSON.stringify(sv1Cards), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );
    const user = userEvent.setup();
    renderBuilder();

    // React Query retries once with backoff before surfacing the error.
    expect(await screen.findByRole("alert", {}, { timeout: 8000 })).toHaveTextContent(
      "The library is down.",
    );
    fail = false;
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("heading", { name: /^preview$/i })).toBeInTheDocument();
  });

  it("empty card list summons MISSINGNO", async () => {
    mockCardsFetch([]);
    renderBuilder();
    expect(await screen.findByText(/Wild MissingNo\. appeared/)).toBeInTheDocument();
  });

  it("Change set navigates to the set browser at /sets", async () => {
    mockCardsFetch(sv1Cards);
    const user = userEvent.setup();
    renderBuilder();
    await screen.findByRole("heading", { name: /^preview$/i });

    await user.click(screen.getByRole("button", { name: /Change set/ }));
    expect(nav.push).toHaveBeenCalledWith("/sets");
  });

  it("tick mode turns pockets into checkboxes and tracks progress", async () => {
    mockCardsFetch(sv1Cards);
    const user = userEvent.setup();
    renderBuilder();
    await screen.findByRole("heading", { name: /^preview$/i });

    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    await user.click(screen.getByRole("switch", { name: "Collection mode" }));
    const first = screen.getAllByRole("checkbox")[0]!;
    await user.click(first);
    expect(first).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("progressbar", { name: "Collected" })).toHaveAttribute(
      "aria-valuenow",
      "1",
    );
  });

  it("clicking a card navigates to its dedicated page", async () => {
    mockCardsFetch(sv1Cards);
    const user = userEvent.setup();
    renderBuilder();
    await screen.findByRole("heading", { name: /^preview$/i });

    await user.click(screen.getByRole("button", { name: /View details: Pineco/ }));
    expect(nav.push).toHaveBeenCalledWith("/card/sv1-1");
  });

  it("collection bar and CSV are hidden until collection mode is on", async () => {
    mockCardsFetch(sv1Cards);
    const user = userEvent.setup();
    renderBuilder();
    await screen.findByRole("heading", { name: /^preview$/i });

    expect(screen.queryByRole("progressbar", { name: "Collected" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "CSV" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("switch", { name: "Collection mode" }));
    expect(screen.getByRole("progressbar", { name: "Collected" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "CSV" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View collection" })).toHaveAttribute(
      "href",
      "/collection/sv1",
    );
  });

  it("Clear asks for confirmation before wiping the collection", async () => {
    mockCardsFetch(sv1Cards);
    const user = userEvent.setup();
    renderBuilder();
    await screen.findByRole("heading", { name: /^preview$/i });

    await user.click(screen.getByRole("switch", { name: "Collection mode" }));
    await user.click(screen.getAllByRole("checkbox")[0]!);

    // Cancel path: nothing is wiped
    await user.click(screen.getByRole("button", { name: "Clear" }));
    await user.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("progressbar", { name: "Collected" })).toHaveAttribute(
      "aria-valuenow",
      "1",
    );

    // Confirm path: collection cleared
    await user.click(screen.getByRole("button", { name: "Clear" }));
    await user.click(await screen.findByRole("button", { name: "Clear all" }));
    expect(screen.getByRole("progressbar", { name: "Collected" })).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
  });

  it("full page is axe clean once configured", async () => {
    mockCardsFetch(sv1Cards);
    const { container } = renderBuilder();
    await screen.findByRole("heading", { name: /^preview$/i });
    expect(await axe(container)).toHaveNoViolations();
  }, 20_000);
});
