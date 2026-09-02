/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IconButton } from "@/app/_components/icon-button";

describe("IconButton", () => {
  it.each([
    ["primary" as const],
    ["ghost" as const],
    ["outline-blue" as const],
    ["decline" as const],
  ])("renders an accessible <button> with a title tooltip for the %s variant", (variant) => {
    // given / when
    render(<IconButton variant={variant} icon="🗑️" label="Remove Alice as a friend" />);

    // then
    const button = screen.getByRole("button", {
      name: "Remove Alice as a friend",
    });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("title", "Remove Alice as a friend");
  });

  it("wraps the icon in an aria-hidden element so the accessible name isn't duplicated", () => {
    // given / when
    render(<IconButton variant="decline" icon="🗑️" label="Remove Alice as a friend" />);

    // then
    const icon = screen.getByText("🗑️");
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  it("marks the button disabled when disabled is passed", () => {
    // given / when
    render(
      <IconButton variant="decline" icon="🗑️" label="Remove Alice" disabled />
    );

    // then
    expect(screen.getByRole("button", { name: "Remove Alice" })).toBeDisabled();
  });

  it("forwards type=submit", () => {
    // given / when
    render(
      <IconButton variant="decline" icon="🗑️" label="Remove Alice" type="submit" />
    );

    // then
    expect(screen.getByRole("button", { name: "Remove Alice" })).toHaveAttribute(
      "type",
      "submit"
    );
  });

  it("calls onClick when clicked", async () => {
    // given
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(
      <IconButton variant="decline" icon="🗑️" label="Remove Alice" onClick={onClick} />
    );

    // when
    await user.click(screen.getByRole("button", { name: "Remove Alice" }));

    // then
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
