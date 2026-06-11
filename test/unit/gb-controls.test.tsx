import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { GbButton } from "@/components/gb/gb-button";
import { GbStepper } from "@/components/gb/gb-stepper";
import { GbBadge } from "@/components/gb/gb-badge";
import { GbToggle } from "@/components/gb/gb-toggle";

describe("GbButton", () => {
  it("renders a real button and fires onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<GbButton onClick={onClick}>PRESS A</GbButton>);
    await user.click(screen.getByRole("button", { name: "PRESS A" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("supports variants without losing the accessible name", () => {
    render(
      <>
        <GbButton variant="a">GO</GbButton>
        <GbButton variant="b">BACK</GbButton>
        <GbButton variant="plain">MEH</GbButton>
      </>,
    );
    expect(screen.getByRole("button", { name: "GO" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "BACK" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "MEH" })).toBeInTheDocument();
  });

  it("meets the 44px height target by class contract", () => {
    render(<GbButton>TALL</GbButton>);
    expect(screen.getByRole("button", { name: "TALL" }).className).toMatch(/min-h-11/);
  });

  it("disabled blocks interaction", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <GbButton disabled onClick={onClick}>
        NOPE
      </GbButton>,
    );
    await user.click(screen.getByRole("button", { name: "NOPE" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("axe clean", async () => {
    const { container } = render(<GbButton>OK</GbButton>);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("GbStepper", () => {
  function Harness() {
    const [value, setValue] = useState(3);
    return <GbStepper label="ROWS" value={value} min={1} max={5} onChange={setValue} />;
  }

  it("exposes spinbutton semantics with range", () => {
    render(<GbStepper label="ROWS" value={3} min={1} max={5} onChange={() => {}} />);
    const spin = screen.getByRole("spinbutton", { name: "ROWS" });
    expect(spin).toHaveAttribute("aria-valuemin", "1");
    expect(spin).toHaveAttribute("aria-valuemax", "5");
    expect(spin).toHaveAttribute("aria-valuenow", "3");
  });

  it("plus/minus buttons adjust and clamp", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const inc = screen.getByRole("button", { name: "Increase ROWS" });
    const dec = screen.getByRole("button", { name: "Decrease ROWS" });
    await user.click(inc);
    expect(screen.getByRole("spinbutton", { name: "ROWS" })).toHaveAttribute("aria-valuenow", "4");
    await user.click(inc);
    await user.click(inc); // would be 6 → clamped to 5
    expect(screen.getByRole("spinbutton", { name: "ROWS" })).toHaveAttribute("aria-valuenow", "5");
    await user.click(dec);
    expect(screen.getByRole("spinbutton", { name: "ROWS" })).toHaveAttribute("aria-valuenow", "4");
  });

  it("arrow keys adjust value on the spinbutton", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const spin = screen.getByRole("spinbutton", { name: "ROWS" });
    spin.focus();
    await user.keyboard("{ArrowUp}");
    expect(spin).toHaveAttribute("aria-valuenow", "4");
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(spin).toHaveAttribute("aria-valuenow", "2");
    await user.keyboard("{Home}");
    expect(spin).toHaveAttribute("aria-valuenow", "1");
    await user.keyboard("{End}");
    expect(spin).toHaveAttribute("aria-valuenow", "5");
  });

  it("axe clean", async () => {
    const { container } = render(
      <GbStepper label="COLS" value={2} min={1} max={5} onChange={() => {}} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("GbBadge", () => {
  it("renders text with optional aria-label", () => {
    render(<GbBadge aria-label="Reverse holo variant">REV</GbBadge>);
    expect(screen.getByText("REV")).toHaveAttribute("aria-label", "Reverse holo variant");
  });
});

describe("GbToggle", () => {
  function Stateful({ onChange = () => {} }: { onChange?: (v: boolean) => void }) {
    const [on, setOn] = useState(false);
    return (
      <GbToggle
        label="SOUND"
        checked={on}
        onChange={(v) => {
          setOn(v);
          onChange(v);
        }}
      />
    );
  }

  it("has switch semantics and toggles by click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Stateful onChange={onChange} />);
    const sw = screen.getByRole("switch", { name: "SOUND" });
    expect(sw).toHaveAttribute("aria-checked", "false");
    await user.click(sw);
    expect(onChange).toHaveBeenCalledWith(true);
    expect(sw).toHaveAttribute("aria-checked", "true");
  });

  it("toggles with Space and Enter", async () => {
    const user = userEvent.setup();
    render(<Stateful />);
    const sw = screen.getByRole("switch", { name: "SOUND" });
    sw.focus();
    await user.keyboard(" ");
    expect(sw).toHaveAttribute("aria-checked", "true");
    await user.keyboard("{Enter}");
    expect(sw).toHaveAttribute("aria-checked", "false");
  });

  it("axe clean", async () => {
    const { container } = render(<Stateful />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
