/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { Card } from "@/app/_components/card";

describe("Card", () => {
  it("renders a div by default", () => {
    // given / when
    render(<Card>Book title</Card>);

    // then
    expect(screen.getByText("Book title").tagName).toBe("DIV");
  });

  it("renders an li when as is li", () => {
    // given / when
    render(<Card as="li">Book title</Card>);

    // then
    expect(screen.getByText("Book title").tagName).toBe("LI");
  });

  it("renders its children", () => {
    // given / when
    render(
      <Card>
        <span>Solaris</span>
      </Card>
    );

    // then
    expect(screen.getByText("Solaris")).toBeInTheDocument();
  });
});
