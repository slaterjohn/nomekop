import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/analytics/events", () => ({ capture: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { Providers } from "@/components/providers";
import { PokemonBinderView } from "@/components/pokemon/pokemon-binder-view";
import { IllustratorBinderView } from "@/components/illustrator/illustrator-binder-view";
import { DEFAULT_POKEMON_OPTIONS } from "@/lib/pokemon-binder";
import { capture } from "@/lib/analytics/events";

beforeEach(() => vi.mocked(capture).mockClear());

// Empty card sets keep the harness light — the options controls render regardless.
describe("entity binder views — analytics", () => {
  it("PokemonBinderView captures binder_config_changed (pokemon) on a preset", async () => {
    const user = userEvent.setup();
    render(
      <Providers>
        <PokemonBinderView slug="pikachu" displayName="Pikachu" cards={[]} initialOptions={DEFAULT_POKEMON_OPTIONS} />
      </Providers>,
    );
    await user.click(screen.getByRole("button", { name: "16 PKT" }));
    expect(vi.mocked(capture)).toHaveBeenCalledWith(
      "binder_config_changed",
      expect.objectContaining({ field: "grid", context: "pokemon", slug: "pikachu" }),
    );
  });

  it("IllustratorBinderView captures binder_config_changed (illustrator) on a preset", async () => {
    const user = userEvent.setup();
    render(
      <Providers>
        <IllustratorBinderView
          slug="ken-sugimori"
          displayName="Ken Sugimori"
          cards={[]}
          initialOptions={{ rows: 3, cols: 3, order: "new", langs: [] }}
        />
      </Providers>,
    );
    await user.click(screen.getByRole("button", { name: "16 PKT" }));
    expect(vi.mocked(capture)).toHaveBeenCalledWith(
      "binder_config_changed",
      expect.objectContaining({ field: "grid", context: "illustrator", slug: "ken-sugimori" }),
    );
  });
});
