/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
  signOut: jest.fn(),
}));
jest.mock("@/server/loan/loan.repository", () => ({
  countIncomingRequests: jest.fn(),
}));
import { auth } from "@/auth";
import { countIncomingRequests } from "@/server/loan/loan.repository";
import Nav from "@/app/_components/nav";

const mockAuth = auth as jest.Mock;
const mockCountIncomingRequests = countIncomingRequests as jest.Mock;

describe("Nav", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockCountIncomingRequests.mockReset();
    mockCountIncomingRequests.mockResolvedValue(0);
  });

  it("shows the Collection, Discover, Friends, Requests and Borrowing links for a signed-in user", async () => {
    // given
    mockAuth.mockResolvedValue({ user: { name: "Ada", email: "ada@example.com" } });

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
    mockAuth.mockResolvedValue({ user: { name: "Ada", email: "ada@example.com" } });
    mockCountIncomingRequests.mockResolvedValue(3);

    // when
    render(await Nav());

    // then
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("hides the pending-request badge when the count is zero", async () => {
    // given
    mockAuth.mockResolvedValue({ user: { name: "Ada", email: "ada@example.com" } });
    mockCountIncomingRequests.mockResolvedValue(0);

    // when
    render(await Nav());

    // then
    expect(screen.queryByText("0")).not.toBeInTheDocument();
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
