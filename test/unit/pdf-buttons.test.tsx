import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PdfButtons } from "@/components/pdf-buttons";
import { capture } from "@/lib/analytics/events";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/analytics/events", () => ({ capture: vi.fn() }));

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.mocked(capture).mockClear();
  URL.createObjectURL = vi.fn(() => "blob:x");
  URL.revokeObjectURL = vi.fn();
});

describe("PdfButtons — analytics", () => {
  it("captures pdf_downloaded with type + context on success", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("%PDF", { status: 200 })));
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(
      <PdfButtons
        context="pokemon"
        filenameBase="nomekop-pikachu"
        printHref="/print/pokemon?t=x"
        buttons={[{ label: "Binder PDF", type: "pokemon", token: "x" }]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Binder PDF" }));
    expect(vi.mocked(capture)).toHaveBeenCalledWith(
      "pdf_downloaded",
      expect.objectContaining({ type: "pokemon", context: "pokemon" }),
    );
    clickSpy.mockRestore();
  });

  it("captures pdf_download_failed when the server errors", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 500 })));
    render(
      <PdfButtons
        context="pokedex"
        filenameBase="nomekop-x"
        printHref="/print/pokedex?t=x"
        buttons={[{ label: "Binder PDF", type: "pokedex", token: "x" }]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Binder PDF" }));
    await vi.waitFor(() =>
      expect(vi.mocked(capture)).toHaveBeenCalledWith(
        "pdf_download_failed",
        expect.objectContaining({ type: "pokedex", context: "pokedex" }),
      ),
    );
  });

  it("captures print_opened when the Print link is clicked", async () => {
    const user = userEvent.setup();
    render(
      <PdfButtons
        context="illustrator"
        filenameBase="nomekop-x"
        printHref="/print/illustrator?t=x"
        buttons={[]}
      />,
    );
    await user.click(screen.getByRole("link", { name: "Print" }));
    expect(vi.mocked(capture)).toHaveBeenCalledWith("print_opened", { context: "illustrator" });
  });
});
