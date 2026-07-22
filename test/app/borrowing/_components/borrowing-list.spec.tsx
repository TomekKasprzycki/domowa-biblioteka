/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { BorrowingList } from "@/app/borrowing/_components/borrowing-list";
import type { OutgoingLoan } from "@/app/borrowing/borrowing.types";

const requestedLoan: OutgoingLoan = {
  id: "11111111-1111-1111-1111-111111111111",
  book: { title: "Clean Code", author: "Robert Martin" },
  owner: { name: "Marta" },
  status: "requested",
  startedAt: null,
};

const activeLoan: OutgoingLoan = {
  id: "22222222-2222-2222-2222-222222222222",
  book: { title: "Refactoring", author: "Martin Fowler" },
  owner: { name: "Marta" },
  status: "active",
  startedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const declinedLoan: OutgoingLoan = {
  id: "33333333-3333-3333-3333-333333333333",
  book: { title: "The Pragmatic Programmer", author: "Andy Hunt" },
  owner: { name: "Marta" },
  status: "declined",
  startedAt: null,
};

describe("BorrowingList", () => {
  it("shows an empty-state message when there are no loans", () => {
    // given
    render(<BorrowingList loans={[]} />);

    // when
    const message = screen.getByText(
      /you have no borrow requests or active loans/i
    );

    // then
    expect(message).toBeInTheDocument();
  });

  it("labels a pending loan as requested from the owner", () => {
    // given
    render(<BorrowingList loans={[requestedLoan]} />);

    // when / then
    expect(screen.getByText("Requested from Marta")).toBeInTheDocument();
  });

  it("labels an active loan as borrowed from the owner", () => {
    // given
    render(<BorrowingList loans={[activeLoan]} />);

    // when / then
    expect(screen.getByText("Borrowed from Marta")).toBeInTheDocument();
  });

  it("labels a declined loan as declined by the owner", () => {
    // given
    render(<BorrowingList loans={[declinedLoan]} />);

    // when / then
    expect(screen.getByText("Declined by Marta")).toBeInTheDocument();
  });

  it("renders a row per loan with its book title and author", () => {
    // given
    render(
      <BorrowingList loans={[requestedLoan, activeLoan, declinedLoan]} />
    );

    // when / then
    expect(screen.getByText("Clean Code")).toBeInTheDocument();
    expect(screen.getByText("Refactoring")).toBeInTheDocument();
    expect(
      screen.getByText("The Pragmatic Programmer")
    ).toBeInTheDocument();
    expect(screen.getByText("Andy Hunt")).toBeInTheDocument();
  });
});
