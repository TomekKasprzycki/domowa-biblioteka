/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/server/loan/loan.repository", () => ({
  findIncomingRequests: jest.fn(),
  findPendingReturnsForOwner: jest.fn(),
}));
jest.mock("@/app/borrow/actions", () => ({
  approveRequestAction: jest.fn(),
  declineRequestAction: jest.fn(),
  confirmReturnAction: jest.fn(),
}));

import { auth } from "@/auth";
import {
  findIncomingRequests,
  findPendingReturnsForOwner,
} from "@/server/loan/loan.repository";
import RequestsPage from "@/app/(app)/requests/page";

const mockAuth = auth as jest.Mock;
const mockFindIncomingRequests = findIncomingRequests as jest.Mock;
const mockFindPendingReturns = findPendingReturnsForOwner as jest.Mock;

const request = {
  id: "11111111-1111-1111-1111-111111111111",
  book: { title: "Clean Code", author: "Robert Martin" },
  requester: { name: "Alice", email: "alice@example.com" },
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

const pendingReturn = {
  id: "22222222-2222-2222-2222-222222222222",
  book: { title: "Refactoring", author: "Martin Fowler" },
  requester: { name: "Bob", email: "bob@example.com" },
  startedAt: new Date("2026-03-12T00:00:00.000Z"),
};

describe("RequestsPage", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockFindIncomingRequests.mockReset();
    mockFindPendingReturns.mockReset();
    mockFindPendingReturns.mockResolvedValue([]);
  });

  it("renders pending incoming requests for the signed-in owner", async () => {
    // given
    mockAuth.mockResolvedValue({ user: { id: "owner-1" } });
    mockFindIncomingRequests.mockResolvedValue([request]);

    // when
    const ui = await RequestsPage();
    render(ui);

    // then
    expect(screen.getByText("Clean Code")).toBeInTheDocument();
    expect(
      screen.getByText(/Alice chce wypożyczyć tę książkę/)
    ).toBeInTheDocument();
  });

  it("renders an empty state when there are no pending requests", async () => {
    // given
    mockAuth.mockResolvedValue({ user: { id: "owner-1" } });
    mockFindIncomingRequests.mockResolvedValue([]);

    // when
    const ui = await RequestsPage();
    render(ui);

    // then
    expect(screen.getByText(/brak oczekujących próśb/i)).toBeInTheDocument();
  });

  it("returns null when there is no session", async () => {
    // given
    mockAuth.mockResolvedValue(null);

    // when
    const ui = await RequestsPage();

    // then
    expect(ui).toBeNull();
    expect(mockFindIncomingRequests).not.toHaveBeenCalled();
    expect(mockFindPendingReturns).not.toHaveBeenCalled();
  });

  it("renders returns awaiting the owner's confirmation", async () => {
    // given
    mockAuth.mockResolvedValue({ user: { id: "owner-1" } });
    mockFindIncomingRequests.mockResolvedValue([]);
    mockFindPendingReturns.mockResolvedValue([pendingReturn]);

    // when
    render(await RequestsPage());

    // then
    expect(
      screen.getByRole("heading", { name: "Oczekuje na Twoje potwierdzenie" })
    ).toBeInTheDocument();
    expect(screen.getByText("Refactoring")).toBeInTheDocument();
    expect(screen.getByText(/Bob zgłasza zwrot/)).toBeInTheDocument();
  });

  it("omits the confirmation section when nothing awaits confirmation", async () => {
    // given
    mockAuth.mockResolvedValue({ user: { id: "owner-1" } });
    mockFindIncomingRequests.mockResolvedValue([request]);
    mockFindPendingReturns.mockResolvedValue([]);

    // when
    render(await RequestsPage());

    // then
    expect(
      screen.queryByRole("heading", { name: "Oczekuje na Twoje potwierdzenie" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Nowe prośby" })
    ).toBeInTheDocument();
  });

  it("renders both sections when requests and returns are both waiting", async () => {
    // given
    mockAuth.mockResolvedValue({ user: { id: "owner-1" } });
    mockFindIncomingRequests.mockResolvedValue([request]);
    mockFindPendingReturns.mockResolvedValue([pendingReturn]);

    // when
    render(await RequestsPage());

    // then
    expect(screen.getByText("Clean Code")).toBeInTheDocument();
    expect(screen.getByText("Refactoring")).toBeInTheDocument();
  });
});
