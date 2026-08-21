/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { EmptyNote } from "@/app/_components/empty-note";

describe("EmptyNote", () => {
  it("renders its children", () => {
    // given / when
    render(<EmptyNote>No books yet.</EmptyNote>);

    // then
    expect(screen.getByText("No books yet.")).toBeInTheDocument();
  });
});
