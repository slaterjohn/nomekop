import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/analytics/events", () => ({ capture: vi.fn() }));

import { TrackedLinkButton } from "@/components/analytics/tracked-link-button";
import { SortTabs } from "@/components/entities/sort-tabs";
import { PokemonLink } from "@/components/entities/entity-link";
import { capture } from "@/lib/analytics/events";

beforeEach(() => vi.mocked(capture).mockClear());

describe("directories & entities — analytics", () => {
  it("TrackedLinkButton fires its event with props on click", async () => {
    const user = userEvent.setup();
    render(
      <TrackedLinkButton
        href="/pokemon/pikachu"
        event="popular_entity_clicked"
        eventProps={{ type: "pokemon", name: "Pikachu" }}
      >
        Pikachu
      </TrackedLinkButton>,
    );
    await user.click(screen.getByRole("link", { name: "Pikachu" }));
    expect(vi.mocked(capture)).toHaveBeenCalledWith("popular_entity_clicked", {
      type: "pokemon",
      name: "Pikachu",
    });
  });

  it("SortTabs captures directory_sorted derived from the basePath", async () => {
    const user = userEvent.setup();
    render(
      <SortTabs
        basePath="/illustrator"
        current="cards"
        options={[
          { value: "cards", label: "Most cards" },
          { value: "name", label: "A–Z" },
        ]}
      />,
    );
    await user.click(screen.getByRole("link", { name: "A–Z" }));
    expect(vi.mocked(capture)).toHaveBeenCalledWith("directory_sorted", {
      directory: "illustrator",
      sort: "name",
    });
  });

  it("EntityLink captures entity_link_clicked with the destination type", async () => {
    const user = userEvent.setup();
    render(<PokemonLink slug="charizard">Charizard</PokemonLink>);
    await user.click(screen.getByRole("link", { name: /Charizard/ }));
    expect(vi.mocked(capture)).toHaveBeenCalledWith("entity_link_clicked", { to_type: "pokemon" });
  });
});
