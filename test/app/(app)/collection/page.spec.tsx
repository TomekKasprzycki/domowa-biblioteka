/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "../../../shared/dialog.mock";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/server/book/book.repository", () => ({
  findByUserId: jest.fn(),
}));
jest.mock("@/server/loan/loan.repository", () => ({
  findOpenLoansForOwner: jest.fn(),
}));
jest.mock("@/app/(app)/collection/actions", () => ({
  addBookAction: jest.fn(),
  updateBookAction: jest.fn(),
  deleteBookAction: jest.fn(),
}));

import { auth } from "@/auth";
import { findByUserId } from "@/server/book/book.repository";
import { findOpenLoansForOwner } from "@/server/loan/loan.repository";
import CollectionPage from "@/app/(app)/collection/page";

const mockAuth = auth as jest.Mock;
const mockFindByUserId = findByUserId as jest.Mock;
const mockFindOpenLoansForOwner = findOpenLoansForOwner as jest.Mock;

const lentBook = {
  id: "11111111-1111-1111-1111-111111111111",
  title: "Solaris",
  author: "Stanisław Lem",
  notes: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

const shelvedBook = {
  id: "22222222-2222-2222-2222-222222222222",
  title: "Clean Code",
  author: "Robert Martin",
  notes: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("CollectionPage", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockFindByUserId.mockReset();
    mockFindOpenLoansForOwner.mockReset();
    mockFindOpenLoansForOwner.mockResolvedValue([]);
  });

  it("returns null when there is no session", async () => {
    // given
    mockAuth.mockResolvedValue(null);

    // when
    const ui = await CollectionPage();

    // then
    expect(ui).toBeNull();
    expect(mockFindByUserId).not.toHaveBeenCalled();
  });

  it("folds the open loan onto the book it belongs to", async () => {
    // given
    const user = userEvent.setup();
    mockAuth.mockResolvedValue({ user: { id: "owner-1" } });
    mockFindByUserId.mockResolvedValue([lentBook, shelvedBook]);
    mockFindOpenLoansForOwner.mockResolvedValue([
      {
        bookId: lentBook.id,
        status: "active",
        startedAt: new Date("2026-03-12T00:00:00.000Z"),
        requester: { name: "Ania" },
      },
    ]);
    render(await CollectionPage());

    // when
    // The loan line now lives in the book's drawer, not directly on the shelf.
    await user.click(screen.getByRole("button", { name: /^View Solaris,/ }));

    // then
    expect(
      screen.getByText("Lent to Ania · since 12 Mar 2026")
    ).toBeInTheDocument();
  });

  it("leaves books without an open loan unmarked", async () => {
    // given
    const user = userEvent.setup();
    mockAuth.mockResolvedValue({ user: { id: "owner-1" } });
    mockFindByUserId.mockResolvedValue([lentBook, shelvedBook]);
    mockFindOpenLoansForOwner.mockResolvedValue([
      {
        bookId: lentBook.id,
        status: "active",
        startedAt: new Date("2026-03-12T00:00:00.000Z"),
        requester: { name: "Ania" },
      },
    ]);
    render(await CollectionPage());

    // when
    // Delete lives in each book's drawer; open both to compare.
    await user.click(screen.getByRole("button", { name: /^View Solaris,/ }));
    await user.click(
      screen.getByRole("button", { name: /^View Clean Code,/ })
    );

    // then
    // only the lent book carries a loan line, so exactly one Delete is hidden
    expect(screen.getAllByRole("button", { name: "Delete" })).toHaveLength(1);
  });

  it("shows no loan lines when nothing is out", async () => {
    // given
    const user = userEvent.setup();
    mockAuth.mockResolvedValue({ user: { id: "owner-1" } });
    mockFindByUserId.mockResolvedValue([lentBook, shelvedBook]);
    render(await CollectionPage());

    // when
    await user.click(screen.getByRole("button", { name: /^View Solaris,/ }));
    await user.click(
      screen.getByRole("button", { name: /^View Clean Code,/ })
    );

    // then
    expect(
      screen.queryByText(/Lent to|Return pending/)
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Delete" })).toHaveLength(2);
  });
});
