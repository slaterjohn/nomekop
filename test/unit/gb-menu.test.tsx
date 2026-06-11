import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { GbMenu } from "@/components/gb/gb-menu";

const OPTIONS = [
  { value: "standard", label: "STANDARD", hint: "one slot per card" },
  { value: "master", label: "MASTER", hint: "reverse holos interleaved" },
  { value: "weird", label: "WEIRD" },
];

function Harness({ onChange = vi.fn() }: { onChange?: (v: string) => void }) {
  const [value, setValue] = useState("standard");
  return (
    <GbMenu
      label="Collection mode"
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
      options={OPTIONS}
    />
  );
}

describe("GbMenu", () => {
  it("has listbox semantics with labelled options", () => {
    render(<Harness />);
    const listbox = screen.getByRole("listbox", { name: "Collection mode" });
    expect(listbox).toBeInTheDocument();
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    expect(options[1]).toHaveAttribute("aria-selected", "false");
  });

  it("exactly one option is tabbable (roving tabindex)", () => {
    render(<Harness />);
    const options = screen.getAllByRole("option");
    expect(options.filter((o) => o.tabIndex === 0)).toHaveLength(1);
    expect(options.filter((o) => o.tabIndex === -1)).toHaveLength(2);
  });

  it("ArrowDown/ArrowUp move focus and wrap", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const options = screen.getAllByRole("option");
    options[0]!.focus();
    await user.keyboard("{ArrowDown}");
    expect(options[1]).toHaveFocus();
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(options[0]).toHaveFocus(); // wrapped
    await user.keyboard("{ArrowUp}");
    expect(options[2]).toHaveFocus(); // wrapped backwards
  });

  it("Home and End jump to first/last", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const options = screen.getAllByRole("option");
    options[0]!.focus();
    await user.keyboard("{End}");
    expect(options[2]).toHaveFocus();
    await user.keyboard("{Home}");
    expect(options[0]).toHaveFocus();
  });

  it("Enter and Space select the focused option", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const options = screen.getAllByRole("option");
    options[0]!.focus();
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onChange).toHaveBeenCalledWith("master");
    expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowDown} ");
    expect(onChange).toHaveBeenCalledWith("weird");
  });

  it("click selects", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await user.click(screen.getByRole("option", { name: /MASTER/ }));
    expect(onChange).toHaveBeenCalledWith("master");
  });

  it("shows the ▶ cursor only on the active option, aria-hidden", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const options = screen.getAllByRole("option");
    options[0]!.focus();
    await user.keyboard("{ArrowDown}");
    const cursors = document.querySelectorAll('[data-gb-cursor="visible"]');
    expect(cursors).toHaveLength(1);
    expect(cursors[0]!).toHaveAttribute("aria-hidden", "true");
    expect(options[1]!.contains(cursors[0]!)).toBe(true);
  });

  it("renders hints as part of the option's accessible description", () => {
    render(<Harness />);
    const master = screen.getByRole("option", { name: /MASTER/ });
    expect(master).toHaveAccessibleDescription("reverse holos interleaved");
  });

  it("axe clean", async () => {
    const { container } = render(<Harness />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
