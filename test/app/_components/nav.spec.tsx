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
import { auth } from "@/auth";
import {
  countIncomingRequests,
  countPendingReturns,
} from "@/server/loan/loan.repository";
import Nav from "@/app/_components/nav";

const mockAuth = auth as jest.Mock;
const mockCountIncomingRequests = countIncomingRequests as jest.Mock;
const mockCountPendingReturns = countPendingReturns as jest.Mock;

const signedInSession = {
  user: {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    name: "Ada",
    email: "ada@example.com",
  },
};

const requestBadge = /borrow requests awaiting your response/;
const returnBadge = /returns awaiting your confirmation/;

describe("Nav", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockCountIncomingRequests.mockReset();
    mockCountPendingReturns.mockReset();
    mockCountIncomingRequests.mockResolvedValue(0);
    mockCountPendingReturns.mockResolvedValue(0);
  });

  it("shows the Collection, Discover, Friends, Requests and Borrowing links for a signed-in user", async () => {
    // given
    mockAuth.mockResolvedValue(signedInSession);

    // when
    render(await Nav());

    // then
    expect(screen.getByRole("link", { name: "Collection" })).toHaveAttribute(
      "href",
      "/collection"
    );
    expect(screen.getByRole("link", { name: "Discover" })).toHaveAttribute(
      "href",
      "/discover"
    );
    expect(screen.getByRole("link", { name: "Friends" })).toHaveAttribute(
      "href",
      "/friends"
    );
    expect(
      screen.getByRole("link", { name: /^Requests/ })
    ).toHaveAttribute("href", "/requests");
    expect(screen.getByRole("link", { name: "Borrowing" })).toHaveAttribute(
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
    render(await Nav());

    // then
    expect(screen.getByLabelText(requestBadge)).toHaveTextContent("3");
  });

  it("shows the pending-return badge when the count is greater than zero", async () => {
    // given
    mockAuth.mockResolvedValue(signedInSession);
    mockCountPendingReturns.mockResolvedValue(2);

    // when
    render(await Nav());

    // then
    expect(screen.getByLabelText(returnBadge)).toHaveTextContent("2");
  });

  it("distinguishes the two badges when both counts are non-zero", async () => {
    // given
    mockAuth.mockResolvedValue(signedInSession);
    mockCountIncomingRequests.mockResolvedValue(4);
    mockCountPendingReturns.mockResolvedValue(1);

    // when
    render(await Nav());

    // then
    expect(screen.getByLabelText(requestBadge)).toHaveTextContent("4");
    expect(screen.getByLabelText(returnBadge)).toHaveTextContent("1");
  });

  it("hides the pending-request badge when the count is zero", async () => {
    // given
    mockAuth.mockResolvedValue(signedInSession);
    mockCountIncomingRequests.mockResolvedValue(0);

    // when
    render(await Nav());

    // then
    expect(screen.queryByLabelText(requestBadge)).not.toBeInTheDocument();
  });

  it("hides the pending-return badge when the count is zero", async () => {
    // given
    mockAuth.mockResolvedValue(signedInSession);
    mockCountPendingReturns.mockResolvedValue(0);

    // when
    render(await Nav());

    // then
    expect(screen.queryByLabelText(returnBadge)).not.toBeInTheDocument();
  });

  it("still renders the nav when the pending-request query fails", async () => {
    // given
    mockAuth.mockResolvedValue(signedInSession);
    mockCountIncomingRequests.mockRejectedValue(new Error("db unavailable"));
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // when
    render(await Nav());

    // then
    expect(
      screen.getByRole("link", { name: /^Requests/ })
    ).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("still renders the nav when the pending-return query fails", async () => {
    // given
    mockAuth.mockResolvedValue(signedInSession);
    mockCountPendingReturns.mockRejectedValue(new Error("db unavailable"));
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // when
    render(await Nav());

    // then
    expect(
      screen.getByRole("link", { name: /^Requests/ })
    ).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("keeps the surviving badge when only one count query fails", async () => {
    // given
    mockAuth.mockResolvedValue(signedInSession);
    mockCountIncomingRequests.mockResolvedValue(5);
    mockCountPendingReturns.mockRejectedValue(new Error("db unavailable"));
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // when
    render(await Nav());

    // then
    expect(screen.getByLabelText(requestBadge)).toHaveTextContent("5");
    expect(screen.queryByLabelText(returnBadge)).not.toBeInTheDocument();
    consoleError.mockRestore();
  });

  it("shows the Sign in and Sign up links for a signed-out visitor", async () => {
    // given
    mockAuth.mockResolvedValue(null);

    // when
    render(await Nav());

    // then
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute(
      "href",
      "/login"
    );
    expect(screen.getByRole("link", { name: /sign up/i })).toHaveAttribute(
      "href",
      "/register"
    );
    expect(
      screen.queryByRole("link", { name: "Friends" })
    ).not.toBeInTheDocument();
  });
});
