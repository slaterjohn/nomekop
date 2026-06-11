import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Providers } from "@/components/providers";
import { Builder } from "@/components/builder/builder";
import type { TcgCard, TcgSet } from "@/lib/tcg/types";

// --- next/navigation mock: a reactive fake router so URL state re-renders ----
const nav = vi.hoisted(() => {
  let search = new URLSearchParams();
  const listeners = new Set<() => void>();
  return {
    get: () => search,
    subscribe: (fn: () => void) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    replace: vi.fn((url: string) => {
      search = new URLSearchParams(url.split("?")[1] ?? "");
      listeners.forEach((l) => l());
    }),
    reset: () => {
      search = new URLSearchParams();
    },
  };
});

vi.mock("next/navigation", async () => {
  const { useSyncExternalStore } = await import("react");
  return {
    useRouter: () => ({ replace: nav.replace, push: vi.fn() }),
    usePathname: () => "/",
    useSearchParams: () => useSyncExternalStore(nav.subscribe, nav.get, nav.get),
  };
});

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

function renderBuilder() {
  return render(
    <Providers>
      <Builder initialSets={sets} />
    </Providers>,
  );
}

beforeEach(() => {
  nav.reset();
  nav.replace.mockClear();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("Builder", () => {
  it("starts with only the set chooser visible", () => {
    renderBuilder();
    expect(screen.getByRole("heading", { name: "CHOOSE SET" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "CONFIGURE BINDER" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "PREVIEW" })).not.toBeInTheDocument();
  });

  it("selecting a set updates the URL and reveals config, preview and actions", async () => {
    mockCardsFetch(sv1Cards);
    const user = userEvent.setup();
    renderBuilder();
    await user.type(screen.getByRole("combobox", { name: /search sets/i }), "scarlet & violet");
    await user.click(screen.getByRole("option", { name: /Scarlet & Violet.*198\/258/ }));

    expect(nav.replace).toHaveBeenCalledWith("/?set=sv1", { scroll: false });
    expect(await screen.findByRole("heading", { name: "CONFIGURE BINDER" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "PREVIEW" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "PRINT & DOWNLOAD" })).toBeInTheDocument();
    expect(screen.getByText(/258 CARDS → 258 POCKETS → 29 PAGES/)).toBeInTheDocument();
  });

  it("shows a loading spinner while cards fetch", async () => {
    mockCardsFetch(sv1Cards, 200, 80);
    const user = userEvent.setup();
    renderBuilder();
    await user.type(screen.getByRole("combobox", { name: /search sets/i }), "scarlet & violet");
    await user.click(screen.getByRole("option", { name: /Scarlet & Violet.*198\/258/ }));
    expect(screen.getByRole("status")).toHaveTextContent(/LOADING SCARLET & VIOLET/);
    expect(await screen.findByRole("heading", { name: "PREVIEW" })).toBeInTheDocument();
  });

  it("card fetch failure shows an alert with RETRY that recovers", async () => {
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
    await user.type(screen.getByRole("combobox", { name: /search sets/i }), "scarlet & violet");
    await user.click(screen.getByRole("option", { name: /Scarlet & Violet.*198\/258/ }));

    // React Query retries once with backoff before surfacing the error.
    expect(await screen.findByRole("alert", {}, { timeout: 8000 })).toHaveTextContent(
      "The library is down.",
    );
    fail = false;
    await user.click(screen.getByRole("button", { name: "RETRY" }));
    expect(await screen.findByRole("heading", { name: "PREVIEW" })).toBeInTheDocument();
  });

  it("empty card list summons MISSINGNO", async () => {
    mockCardsFetch([]);
    const user = userEvent.setup();
    renderBuilder();
    await user.type(screen.getByRole("combobox", { name: /search sets/i }), "scarlet & violet");
    await user.click(screen.getByRole("option", { name: /Scarlet & Violet.*198\/258/ }));
    expect(await screen.findByText(/WILD MISSINGNO\. APPEARED/)).toBeInTheDocument();
  });

  it("CHANGE SET returns to the chooser", async () => {
    mockCardsFetch(sv1Cards);
    const user = userEvent.setup();
    renderBuilder();
    await user.type(screen.getByRole("combobox", { name: /search sets/i }), "scarlet & violet");
    await user.click(screen.getByRole("option", { name: /Scarlet & Violet.*198\/258/ }));
    await screen.findByRole("heading", { name: "PREVIEW" });

    await user.click(screen.getByRole("button", { name: /CHANGE SET/ }));
    expect(screen.getByRole("heading", { name: "CHOOSE SET" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "PREVIEW" })).not.toBeInTheDocument();
  });

  it("tick mode turns pockets into checkboxes and tracks progress", async () => {
    mockCardsFetch(sv1Cards);
    const user = userEvent.setup();
    renderBuilder();
    await user.type(screen.getByRole("combobox", { name: /search sets/i }), "scarlet & violet");
    await user.click(screen.getByRole("option", { name: /Scarlet & Violet.*198\/258/ }));
    await screen.findByRole("heading", { name: "PREVIEW" });

    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    await user.click(screen.getByRole("switch", { name: "TICK MODE" }));
    const first = screen.getAllByRole("checkbox")[0]!;
    await user.click(first);
    expect(first).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("progressbar", { name: "COLLECTED" })).toHaveAttribute(
      "aria-valuenow",
      "1",
    );
  });

  it("full page is axe clean once configured", async () => {
    mockCardsFetch(sv1Cards);
    const user = userEvent.setup();
    const { container } = renderBuilder();
    await user.type(screen.getByRole("combobox", { name: /search sets/i }), "scarlet & violet");
    await user.click(screen.getByRole("option", { name: /Scarlet & Violet.*198\/258/ }));
    await screen.findByRole("heading", { name: "PREVIEW" });
    expect(await axe(container)).toHaveNoViolations();
  }, 20_000);
});
