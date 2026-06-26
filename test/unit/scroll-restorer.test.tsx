import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

vi.mock("next/navigation", () => ({ usePathname: () => "/pokemon/pikachu" }));

import { ScrollRestorer } from "@/components/scroll-restorer";

beforeEach(() => sessionStorage.clear());

describe("ScrollRestorer", () => {
  it("renders nothing and scrolls to top on a fresh navigation", () => {
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
    const { container } = render(<ScrollRestorer />);
    expect(container.firstChild).toBeNull();
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });
});
