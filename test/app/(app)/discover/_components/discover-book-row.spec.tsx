/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "../../../../shared/dialog.mock";

jest.mock("@/app/borrow/actions", () => ({
  requestBorrowAction: jest.fn(),
}));

import { requestBorrowAction } from "@/app/borrow/actions";
import { DiscoverBookRow } from "@/app/(app)/discover/_components/discover-book-row";
import type { DiscoverBook } from "@/app/(app)/discover/discover.types";

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
    isbn: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    owner,
    availability,
  };
}

async function openDrawer(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole("button", { name: /^Zobacz: The Pragmatic Programmer,/ })
  );
}

describe("DiscoverBookRow", () => {
  beforeEach(() => {
    mockRequestBorrowAction.mockReset();
    mockRequestBorrowAction.mockResolvedValue(null);
  });

  it("renders the title and author", async () => {
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
    await openDrawer(user);

    // then
    expect(
      screen.getAllByText("The Pragmatic Programmer").length
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Andy Hunt").length).toBeGreaterThan(0);
  });

  it("names the owner on the spine and in the drawer", async () => {
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

    // when / then
    expect(
      screen.getByRole("button", { name: /właściciel: Friendly Person/ })
    ).toBeInTheDocument();

    await openDrawer(user);
    expect(screen.getByText("Owned by Friendly Person")).toBeInTheDocument();
  });

  it("shows Available and a Borrow button for an available book, and fires the action on submit", async () => {
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
    await openDrawer(user);

    // when
    expect(screen.getByText("Available")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Borrow" }));

    // then
    expect(mockRequestBorrowAction).toHaveBeenCalled();
  });

  it("tags the spine and shows Requested when the viewer has a pending request", async () => {
    // given
    const user = userEvent.setup();
    render(
      <DiscoverBookRow
        book={makeBook({
          status: "available",
          borrowedByViewer: false,
          requestedByViewer: true,
        })}
      />
    );

    // when
    await openDrawer(user);

    // then
    expect(screen.getAllByText("Requested").length).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", { name: "Borrow" })
    ).not.toBeInTheDocument();
  });

  it("shows Borrowed by you with no note when the viewer is the active borrower", async () => {
    // given
    const user = userEvent.setup();
    render(
      <DiscoverBookRow
        book={makeBook({
          status: "on_loan",
          borrowedByViewer: true,
          requestedByViewer: false,
        })}
      />
    );

    // when
    await openDrawer(user);

    // then
    expect(screen.getAllByText("Borrowed by you").length).toBeGreaterThan(0);
    expect(
      screen.queryByText(/will be available again/i)
    ).not.toBeInTheDocument();
  });

  it("prefers On loan over Requested when the book was lent to someone else", async () => {
    // given
    // the viewer has a leftover pending request, but the owner approved
    // a different friend in the meantime
    const user = userEvent.setup();
    render(
      <DiscoverBookRow
        book={makeBook({
          status: "on_loan",
          borrowedByViewer: false,
          requestedByViewer: true,
        })}
      />
    );

    // when
    await openDrawer(user);

    // then
    expect(screen.getAllByText("On loan").length).toBeGreaterThan(0);
    expect(screen.queryByText("Requested")).not.toBeInTheDocument();
  });

  it("shows a generic On loan state with an availability note for a third friend", async () => {
    // given
    const user = userEvent.setup();
    render(
      <DiscoverBookRow
        book={makeBook({
          status: "on_loan",
          borrowedByViewer: false,
          requestedByViewer: false,
        })}
      />
    );

    // when
    await openDrawer(user);

    // then
    expect(screen.getAllByText("On loan").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/will be available again once it's returned/i)
    ).toBeInTheDocument();
  });

  it("shows ISBN when present", async () => {
    // given
    const user = userEvent.setup();
    render(
      <DiscoverBookRow
        book={{
          ...makeBook({
            status: "available",
            borrowedByViewer: false,
            requestedByViewer: false,
          }),
          isbn: "9788308077254",
        }}
      />
    );

    // when
    await openDrawer(user);

    // then
    expect(screen.getByText("ISBN 9788308077254")).toBeInTheDocument();
  });
});
