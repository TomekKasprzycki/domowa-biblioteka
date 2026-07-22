/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { DiscoverBookRow } from "@/app/discover/_components/discover-book-row";
import type { DiscoverBook } from "@/app/discover/discover.types";

const book: DiscoverBook = {
  id: "11111111-1111-1111-1111-111111111111",
  title: "The Pragmatic Programmer",
  author: "Andy Hunt",
  notes: "Borrowed once",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  owner: {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Friendly Person",
    email: "friend@example.com",
  },
};

describe("DiscoverBookRow", () => {
  it("renders the title, author, owner name and an Available badge", () => {
    // given
    render(<DiscoverBookRow book={book} />);

    // when / then
    expect(screen.getByText("The Pragmatic Programmer")).toBeInTheDocument();
    expect(screen.getByText("Andy Hunt")).toBeInTheDocument();
    expect(screen.getByText(/Owned by Friendly Person/)).toBeInTheDocument();
    expect(screen.getByText("Available")).toBeInTheDocument();
  });
});
