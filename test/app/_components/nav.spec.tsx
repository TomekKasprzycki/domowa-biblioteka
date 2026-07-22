/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
  signOut: jest.fn(),
}));
import { auth } from "@/auth";
import Nav from "@/app/_components/nav";

const mockAuth = auth as jest.Mock;

describe("Nav", () => {
  beforeEach(() => {
    mockAuth.mockReset();
  });

  it("shows the Collection, Discover and Friends links for a signed-in user", async () => {
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
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
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
