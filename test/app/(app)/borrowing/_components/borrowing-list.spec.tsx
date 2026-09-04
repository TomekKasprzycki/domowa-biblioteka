/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

// BorrowingList renders BorrowingRow, a Client Component that imports the
// Server Action module — which pulls in auth and the data source if loaded for
// real.
jest.mock("@/app/borrow/actions", () => ({
  markReturnedAction: jest.fn().mockResolvedValue(null),
}));
import { BorrowingList } from "@/app/(app)/borrowing/_components/borrowing-list";
import type { OutgoingLoan } from "@/app/(app)/borrowing/borrowing.types";

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

const returnPendingLoan: OutgoingLoan = {
  id: "44444444-4444-4444-4444-444444444444",
  book: { title: "Domain-Driven Design", author: "Eric Evans" },
  owner: { name: "Marta" },
  status: "return_pending",
  startedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const returnedLoan: OutgoingLoan = {
  id: "55555555-5555-5555-5555-555555555555",
  book: { title: "Solaris", author: "Stanisław Lem" },
  owner: { name: "Marta" },
  status: "returned",
  startedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("BorrowingList", () => {
  it("shows an empty-state message when there are no loans", () => {
    // given
    render(<BorrowingList loans={[]} />);

    // when
    const message = screen.getByText(
      /nie masz żadnych próśb o wypożyczenie ani aktywnych wypożyczeń/i
    );

    // then
    expect(message).toBeInTheDocument();
  });

  it("labels a pending loan as requested from the owner", () => {
    // given
    render(<BorrowingList loans={[requestedLoan]} />);

    // when / then
    expect(screen.getByText("Prośba wysłana do Marta")).toBeInTheDocument();
  });

  it("labels an active loan as borrowed from the owner", () => {
    // given
    render(<BorrowingList loans={[activeLoan]} />);

    // when / then
    expect(screen.getByText("Wypożyczona od Marta")).toBeInTheDocument();
  });

  it("labels a declined loan as declined by the owner", () => {
    // given
    render(<BorrowingList loans={[declinedLoan]} />);

    // when / then
    expect(screen.getByText("Odrzucona przez Marta")).toBeInTheDocument();
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

  it("labels a loan awaiting the owner's confirmation as return pending", () => {
    // given
    render(<BorrowingList loans={[returnPendingLoan]} />);

    // when / then
    expect(
      screen.getByText("Zwrot w trakcie — czeka na potwierdzenie od Marta")
    ).toBeInTheDocument();
  });

  it("groups terminal loans into a past-loans disclosure with a count", () => {
    // given
    render(<BorrowingList loans={[declinedLoan, returnedLoan]} />);

    // when
    const summary = screen.getByText("Poprzednie wypożyczenia (2)");

    // then
    expect(summary).toBeInTheDocument();
    expect(summary.closest("details")).not.toHaveAttribute("open");
  });

  it("keeps live loans out of the past-loans disclosure", () => {
    // given
    render(
      <BorrowingList
        loans={[requestedLoan, activeLoan, returnPendingLoan, returnedLoan]}
      />
    );

    // when
    const details = screen
      .getByText("Poprzednie wypożyczenia (1)")
      .closest("details");

    // then
    expect(details).toHaveTextContent("Solaris");
    expect(details).not.toHaveTextContent("Refactoring");
  });

  it("omits the past-loans disclosure when every loan is still live", () => {
    // given
    render(<BorrowingList loans={[requestedLoan, activeLoan]} />);

    // when / then
    expect(
      screen.queryByText(/Poprzednie wypożyczenia/)
    ).not.toBeInTheDocument();
  });
});
