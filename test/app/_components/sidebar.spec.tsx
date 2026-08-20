/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
  signOut: jest.fn(),
}));
jest.mock("@/server/loan/loan.repository", () => ({
  countIncomingRequests: jest.fn(),
  countPendingReturns: jest.fn(),
}));
jest.mock("@/server/book/book.repository", () => ({
  countBooksForUser: jest.fn(),
}));
jest.mock("next/navigation", () => ({
  usePathname: jest.fn(() => "/collection"),
}));

import { auth } from "@/auth";
import {
  countIncomingRequests,
  countPendingReturns,
} from "@/server/loan/loan.repository";
import { countBooksForUser } from "@/server/book/book.repository";
import Sidebar from "@/app/_components/sidebar";

const mockAuth = auth as jest.Mock;
const mockCountIncomingRequests = countIncomingRequests as jest.Mock;
const mockCountPendingReturns = countPendingReturns as jest.Mock;
const mockCountBooksForUser = countBooksForUser as jest.Mock;

const signedInSession = {
  user: {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    name: "Ada",
    email: "ada@example.com",
  },
};

const requestBadge = /borrow requests awaiting your response/;
const returnBadge = /returns awaiting your confirmation/;

describe("Sidebar", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockCountIncomingRequests.mockReset();
    mockCountPendingReturns.mockReset();
    mockCountBooksForUser.mockReset();
    mockCountIncomingRequests.mockResolvedValue(0);
    mockCountPendingReturns.mockResolvedValue(0);
    mockCountBooksForUser.mockResolvedValue(0);
  });

  it("renders nothing for a signed-out visitor", async () => {
    // given
    mockAuth.mockResolvedValue(null);

    // when
    const result = await Sidebar();

    // then
    expect(result).toBeNull();
  });

  it("shows the Collection, Friends, Discover, Requests and Borrowing links for a signed-in user", async () => {
    // given
    mockAuth.mockResolvedValue(signedInSession);

    // when
    render(await Sidebar());

    // then
    expect(screen.getByRole("link", { name: /Collection/ })).toHaveAttribute(
      "href",
      "/collection"
    );
    expect(screen.getByRole("link", { name: /Friends/ })).toHaveAttribute(
      "href",
      "/friends"
    );
    expect(screen.getByRole("link", { name: /Discover/ })).toHaveAttribute(
      "href",
      "/discover"
    );
    expect(screen.getByRole("link", { name: /Requests/ })).toHaveAttribute(
      "href",
      "/requests"
    );
    expect(screen.getByRole("link", { name: /Borrowing/ })).toHaveAttribute(
      "href",
      "/borrowing"
    );
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });

  it("shows the pending-request badge when the count is greater than zero", async () => {
    // given
    mockAuth.mockResolvedValue(signedInSession);
    mockCountIncomingRequests.mockResolvedValue(3);

    // when
    render(await Sidebar());

    // then
    expect(screen.getByLabelText(requestBadge)).toHaveTextContent("3");
  });

  it("shows the pending-return badge when the count is greater than zero", async () => {
    // given
    mockAuth.mockResolvedValue(signedInSession);
    mockCountPendingReturns.mockResolvedValue(2);

    // when
    render(await Sidebar());

    // then
    expect(screen.getByLabelText(returnBadge)).toHaveTextContent("2");
  });

  it("hides the pending-request badge when the count is zero", async () => {
    // given
    mockAuth.mockResolvedValue(signedInSession);
    mockCountIncomingRequests.mockResolvedValue(0);

    // when
    render(await Sidebar());

    // then
    expect(screen.queryByLabelText(requestBadge)).not.toBeInTheDocument();
  });

  it("hides the pending-return badge when the count is zero", async () => {
    // given
    mockAuth.mockResolvedValue(signedInSession);
    mockCountPendingReturns.mockResolvedValue(0);

    // when
    render(await Sidebar());

    // then
    expect(screen.queryByLabelText(returnBadge)).not.toBeInTheDocument();
  });

  it("still renders the sidebar when the pending-request query fails", async () => {
    // given
    mockAuth.mockResolvedValue(signedInSession);
    mockCountIncomingRequests.mockRejectedValue(new Error("db unavailable"));
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // when
    render(await Sidebar());

    // then
    expect(screen.getByRole("link", { name: /Requests/ })).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("shows the book count in the sidebar foot", async () => {
    // given
    mockAuth.mockResolvedValue(signedInSession);
    mockCountBooksForUser.mockResolvedValue(10);

    // when
    render(await Sidebar());

    // then
    expect(screen.getByText("10 books on your shelf")).toBeInTheDocument();
  });

  it("degrades the book count to 0 when the query fails", async () => {
    // given
    mockAuth.mockResolvedValue(signedInSession);
    mockCountBooksForUser.mockRejectedValue(new Error("db unavailable"));
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // when
    render(await Sidebar());

    // then
    expect(screen.getByText("0 books on your shelf")).toBeInTheDocument();
    consoleError.mockRestore();
  });
});
