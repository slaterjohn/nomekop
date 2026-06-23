import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { ActionBar } from "@/components/builder/action-bar";
import { DEFAULT_CONFIG } from "@/lib/config";

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: toastMock }));

const config = { ...DEFAULT_CONFIG, set: "base1" };

beforeEach(() => {
  vi.unstubAllGlobals();
  toastMock.success.mockClear();
  toastMock.error.mockClear();
  // jsdom lacks blob URLs
  URL.createObjectURL = vi.fn(() => "blob:fake");
  URL.revokeObjectURL = vi.fn();
});

describe("ActionBar", () => {
  it("downloads a PDF: posts config, clicks an anchor, announces success", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (_url: unknown, _init?: RequestInit) => {
      // A string body, not `new Blob(...)`: jsdom's Blob and Node/undici's
      // Response are different realms, and feeding the former to the latter
      // throws "object.stream is not a function". The component reads res.blob().
      return new Response("%PDF-fake", {
        status: 200,
        headers: { "content-type": "application/pdf" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<ActionBar config={config} onStyleChange={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Binder PDF" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/pdf",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body).toEqual({ type: "binder", config });
    expect(clickSpy).toHaveBeenCalled();
    expect(toastMock.success).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it("shows Generating status while busy", async () => {
    const user = userEvent.setup();
    let release!: () => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            release = () => resolve(new Response("x", { status: 200 }));
          }),
      ),
    );
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<ActionBar config={config} onStyleChange={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Checklist PDF" }));
    expect(screen.getByRole("status")).toHaveTextContent("Generating…");
    expect(screen.getByRole("button", { name: "Binder PDF" })).toBeDisabled();
    release();
    await vi.waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
  });

  it("surfaces server errors as a toast", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: "Easy there, trainer!" }), {
          status: 429,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    render(<ActionBar config={config} onStyleChange={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Placeholders PDF" }));
    await vi.waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("Easy there, trainer!"));
  });

  it("retro toggle reports style changes", async () => {
    const user = userEvent.setup();
    const onStyleChange = vi.fn();
    render(<ActionBar config={config} onStyleChange={onStyleChange} />);
    await user.click(screen.getByRole("switch", { name: "Retro print" }));
    expect(onStyleChange).toHaveBeenCalledWith("retro");
  });

  it("axe clean", async () => {
    const { container } = render(<ActionBar config={config} onStyleChange={vi.fn()} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
