/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/server/loan/loan.repository", () => ({
  findIncomingRequests: jest.fn(),
}));
jest.mock("@/app/borrow/actions", () => ({
  approveRequestAction: jest.fn(),
  declineRequestAction: jest.fn(),
}));

import { auth } from "@/auth";
import { findIncomingRequests } from "@/server/loan/loan.repository";
import RequestsPage from "@/app/requests/page";

const mockAuth = auth as jest.Mock;
const mockFindIncomingRequests = findIncomingRequests as jest.Mock;

const request = {
  id: "11111111-1111-1111-1111-111111111111",
  book: { title: "Clean Code", author: "Robert Martin" },
  requester: { name: "Alice", email: "alice@example.com" },
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("RequestsPage", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockFindIncomingRequests.mockReset();
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
    expect(screen.getByText(/Requested by Alice/)).toBeInTheDocument();
  });

  it("renders an empty state when there are no pending requests", async () => {
    // given
    mockAuth.mockResolvedValue({ user: { id: "owner-1" } });
    mockFindIncomingRequests.mockResolvedValue([]);

    // when
    const ui = await RequestsPage();
    render(ui);

    // then
    expect(screen.getByText(/no pending requests/i)).toBeInTheDocument();
  });

  it("returns null when there is no session", async () => {
    // given
    mockAuth.mockResolvedValue(null);

    // when
    const ui = await RequestsPage();

    // then
    expect(ui).toBeNull();
    expect(mockFindIncomingRequests).not.toHaveBeenCalled();
  });
});
