/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/app/collection/actions", () => ({
  deleteBookAction: jest.fn().mockResolvedValue(null),
}));
import { deleteBookAction } from "@/app/collection/actions";
import { BookRow } from "@/app/collection/_components/book-row";
import type { CollectionBook } from "@/app/collection/collection.types";

const mockDelete = deleteBookAction as jest.Mock;

const shelvedBook: CollectionBook = {
  id: "11111111-1111-1111-1111-111111111111",
  title: "Solaris",
  author: "Stanisław Lem",
  notes: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  loan: null,
};

const lentBook: CollectionBook = {
  ...shelvedBook,
  loan: {
    status: "active",
    borrowerName: "Ania",
    startedAt: new Date("2026-03-12T00:00:00.000Z"),
  },
};

const returnPendingBook: CollectionBook = {
  ...shelvedBook,
  loan: {
    status: "return_pending",
    borrowerName: "Ania",
    startedAt: new Date("2026-03-12T00:00:00.000Z"),
  },
};

describe("BookRow", () => {
  beforeEach(() => {
    mockDelete.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows no loan line for a book on the shelf", () => {
    // given
    render(<BookRow book={shelvedBook} onEdit={() => {}} />);

    // when / then
    expect(screen.queryByText(/Lent to|Return pending/)).not.toBeInTheDocument();
  });

  it("names the borrower and start date for a book that is out", () => {
    // given
    render(<BookRow book={lentBook} onEdit={() => {}} />);

    // when / then
    expect(
      screen.getByText("Lent to Ania · since 12 Mar 2026")
    ).toBeInTheDocument();
  });

  it("marks a book whose return awaits confirmation as return pending", () => {
    // given
    render(<BookRow book={returnPendingBook} onEdit={() => {}} />);

    // when / then
    expect(
      screen.getByText("Return pending · Ania · since 12 Mar 2026")
    ).toBeInTheDocument();
  });

  it("offers Delete for a book that is not out", () => {
    // given
    render(<BookRow book={shelvedBook} onEdit={() => {}} />);

    // when / then
    expect(
      screen.getByRole("button", { name: "Delete" })
    ).toBeInTheDocument();
  });

  it.each([
    ["active" as const],
    ["return_pending" as const],
  ])("hides Delete while the loan is %s", (status) => {
    // given
    const book: CollectionBook = {
      ...shelvedBook,
      loan: { status, borrowerName: "Ania", startedAt: null },
    };

    // when
    render(<BookRow book={book} onEdit={() => {}} />);

    // then
    expect(
      screen.queryByRole("button", { name: "Delete" })
    ).not.toBeInTheDocument();
  });

  it("keeps Edit available while the book is out", () => {
    // given
    render(<BookRow book={lentBook} onEdit={() => {}} />);

    // when / then
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("does not fire the delete action when the confirm dialog is dismissed", async () => {
    // given
    jest.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<BookRow book={shelvedBook} onEdit={() => {}} />);

    // when
    await user.click(screen.getByRole("button", { name: "Delete" }));

    // then
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("fires deleteBookAction when the confirm dialog is accepted", async () => {
    // given
    jest.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<BookRow book={shelvedBook} onEdit={() => {}} />);

    // when
    await user.click(screen.getByRole("button", { name: "Delete" }));

    // then
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });
});
