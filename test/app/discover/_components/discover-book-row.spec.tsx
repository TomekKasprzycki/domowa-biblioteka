/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/app/borrow/actions", () => ({
  requestBorrowAction: jest.fn(),
}));

import { requestBorrowAction } from "@/app/borrow/actions";
import { DiscoverBookRow } from "@/app/discover/_components/discover-book-row";
import type { DiscoverBook } from "@/app/discover/discover.types";

const mockRequestBorrowAction = requestBorrowAction as jest.Mock;

const owner = {
  id: "22222222-2222-2222-2222-222222222222",
  name: "Friendly Person",
  email: "friend@example.com",
};

function makeBook(
  availability: DiscoverBook["availability"]
): DiscoverBook {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    title: "The Pragmatic Programmer",
    author: "Andy Hunt",
    notes: "Borrowed once",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    owner,
    availability,
  };
}

describe("DiscoverBookRow", () => {
  beforeEach(() => {
    mockRequestBorrowAction.mockReset();
    mockRequestBorrowAction.mockResolvedValue(null);
  });

  it("renders the title, author and owner name", () => {
    // given
    render(
      <DiscoverBookRow
        book={makeBook({
          status: "available",
          borrowedByViewer: false,
          requestedByViewer: false,
        })}
      />
    );

    // when / then
    expect(screen.getByText("The Pragmatic Programmer")).toBeInTheDocument();
    expect(screen.getByText("Andy Hunt")).toBeInTheDocument();
    expect(screen.getByText(/Owned by Friendly Person/)).toBeInTheDocument();
  });

  it("shows a Borrow button for an available book and fires the action on submit", async () => {
    // given
    const user = userEvent.setup();
    render(
      <DiscoverBookRow
        book={makeBook({
          status: "available",
          borrowedByViewer: false,
          requestedByViewer: false,
        })}
      />
    );

    // when
    await user.click(screen.getByRole("button", { name: "Borrow" }));

    // then
    expect(mockRequestBorrowAction).toHaveBeenCalled();
  });

  it("shows Requested when the viewer has a pending request", () => {
    // given
    render(
      <DiscoverBookRow
        book={makeBook({
          status: "available",
          borrowedByViewer: false,
          requestedByViewer: true,
        })}
      />
    );

    // when / then
    expect(screen.getByText("Requested")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Borrow" })
    ).not.toBeInTheDocument();
  });

  it("shows Borrowed by you when the viewer is the active borrower", () => {
    // given
    render(
      <DiscoverBookRow
        book={makeBook({
          status: "on_loan",
          borrowedByViewer: true,
          requestedByViewer: false,
        })}
      />
    );

    // when / then
    expect(screen.getByText("Borrowed by you")).toBeInTheDocument();
  });

  it("prefers On loan over Requested when the book was lent to someone else", () => {
    // given
    // the viewer has a leftover pending request, but the owner approved
    // a different friend in the meantime
    render(
      <DiscoverBookRow
        book={makeBook({
          status: "on_loan",
          borrowedByViewer: false,
          requestedByViewer: true,
        })}
      />
    );

    // when / then
    expect(screen.getByText("On loan")).toBeInTheDocument();
    expect(screen.queryByText("Requested")).not.toBeInTheDocument();
  });

  it("shows a generic On loan state with no borrower name for a third friend", () => {
    // given
    render(
      <DiscoverBookRow
        book={makeBook({
          status: "on_loan",
          borrowedByViewer: false,
          requestedByViewer: false,
        })}
      />
    );

    // when / then
    expect(screen.getByText("On loan")).toBeInTheDocument();
  });
});
