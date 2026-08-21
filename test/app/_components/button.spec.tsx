/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { Button } from "@/app/_components/button";

describe("Button", () => {
  it.each([
    ["primary" as const],
    ["ghost" as const],
    ["outline-blue" as const],
    ["decline" as const],
  ])("renders a <button> for the %s variant", (variant) => {
    // given / when
    render(<Button variant={variant}>Save</Button>);

    // then
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("renders a link when href is provided", () => {
    // given / when
    render(
      <Button variant="primary" href="/collection">
        Go to collection
      </Button>
    );

    // then
    expect(
      screen.getByRole("link", { name: "Go to collection" })
    ).toHaveAttribute("href", "/collection");
  });

  it("does not render a link when href is absent", () => {
    // given / when
    render(<Button variant="primary">Save</Button>);

    // then
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("marks the button disabled when disabled is passed", () => {
    // given / when
    render(
      <Button variant="primary" disabled>
        Save
      </Button>
    );

    // then
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });
});
