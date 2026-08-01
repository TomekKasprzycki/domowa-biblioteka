/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/server/loan/loan.repository", () => ({
  findOutgoingLoans: jest.fn(),
}));

import { auth } from "@/auth";
import { findOutgoingLoans } from "@/server/loan/loan.repository";
import BorrowingPage from "@/app/borrowing/page";

const mockAuth = auth as jest.Mock;
const mockFindOutgoingLoans = findOutgoingLoans as jest.Mock;

const activeLoan = {
  id: "loan-active",
  book: { title: "Clean Code", author: "Robert Martin" },
  owner: { name: "Marta" },
  status: "active",
  startedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const requestedLoan = {
  id: "loan-requested",
  book: { title: "Refactoring", author: "Martin Fowler" },
  owner: { name: "Marta" },
  status: "requested",
  startedAt: null,
};

const declinedLoan = {
  id: "loan-declined",
  book: { title: "The Pragmatic Programmer", author: "Andy Hunt" },
  owner: { name: "Marta" },
  status: "declined",
  startedAt: null,
};

describe("BorrowingPage", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockFindOutgoingLoans.mockReset();
  });

  it("renders Borrowed from {owner} for an active loan", async () => {
    // given
    mockAuth.mockResolvedValue({ user: { id: "borrower-1" } });
    mockFindOutgoingLoans.mockResolvedValue([activeLoan]);

    // when
    const ui = await BorrowingPage();
    render(ui);

    // then
    expect(screen.getByText("Borrowed from Marta")).toBeInTheDocument();
  });

  it("renders Requested from {owner} for a pending loan", async () => {
    // given
    mockAuth.mockResolvedValue({ user: { id: "borrower-1" } });
    mockFindOutgoingLoans.mockResolvedValue([requestedLoan]);

    // when
    const ui = await BorrowingPage();
    render(ui);

    // then
    expect(screen.getByText("Requested from Marta")).toBeInTheDocument();
  });

  it("renders Declined by {owner} for a declined loan", async () => {
    // given
    mockAuth.mockResolvedValue({ user: { id: "borrower-1" } });
    mockFindOutgoingLoans.mockResolvedValue([declinedLoan]);

    // when
    const ui = await BorrowingPage();
    render(ui);

    // then
    expect(screen.getByText("Declined by Marta")).toBeInTheDocument();
  });

  it("renders an empty state when there are no loans", async () => {
    // given
    mockAuth.mockResolvedValue({ user: { id: "borrower-1" } });
    mockFindOutgoingLoans.mockResolvedValue([]);

    // when
    const ui = await BorrowingPage();
    render(ui);

    // then
    expect(
      screen.getByText(/you have no borrow requests or active loans/i)
    ).toBeInTheDocument();
  });

  it("returns null when there is no session", async () => {
    // given
    mockAuth.mockResolvedValue(null);

    // when
    const ui = await BorrowingPage();

    // then
    expect(ui).toBeNull();
    expect(mockFindOutgoingLoans).not.toHaveBeenCalled();
  });
});
