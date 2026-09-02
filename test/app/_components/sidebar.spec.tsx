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

const requestBadge = /Liczba próśb o wypożyczenie/;
const returnBadge = /Liczba zwrotów oczekujących/;

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
    expect(
      screen.getByRole("link", { name: /Twoja kolekcja/ })
    ).toHaveAttribute("href", "/collection");
    expect(screen.getByRole("link", { name: /Znajomi/ })).toHaveAttribute(
      "href",
      "/friends"
    );
    expect(screen.getByRole("link", { name: /Odkrywaj/ })).toHaveAttribute(
      "href",
      "/discover"
    );
    expect(screen.getByRole("link", { name: /Prośby/ })).toHaveAttribute(
      "href",
      "/requests"
    );
    expect(screen.getByRole("link", { name: /Wypożyczenia/ })).toHaveAttribute(
      "href",
      "/borrowing"
    );
    expect(
      screen.getByRole("button", { name: /wyloguj/i })
    ).toBeInTheDocument();
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
    expect(screen.getByRole("link", { name: /Prośby/ })).toBeInTheDocument();
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
    expect(screen.getByText("10 książek na półce")).toBeInTheDocument();
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
    expect(screen.getByText("0 książek na półce")).toBeInTheDocument();
    consoleError.mockRestore();
  });
});
