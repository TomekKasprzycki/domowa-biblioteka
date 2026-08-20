/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { Avatar } from "@/app/_components/avatar";

describe("Avatar", () => {
  it("shows a single-letter initial for a one-word name", () => {
    // given / when
    render(<Avatar name="Ty" />);

    // then
    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("shows two-letter initials for a multi-word name", () => {
    // given / when
    render(<Avatar name="Kasia Nowak" />);

    // then
    expect(screen.getByText("KN")).toBeInTheDocument();
  });

  it("gives the same name the same background color across renders", () => {
    // given
    const { container: first } = render(<Avatar name="Marek Wiśniewski" />);
    const firstClass = first.firstElementChild?.className;

    // when
    const { container: second } = render(<Avatar name="Marek Wiśniewski" />);
    const secondClass = second.firstElementChild?.className;

    // then
    expect(firstClass).toBe(secondClass);
  });
});
