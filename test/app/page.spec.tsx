/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("next/navigation", () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Home from "@/app/page";

const mockAuth = auth as jest.Mock;
const mockRedirect = redirect as unknown as jest.Mock;

describe("Home", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockRedirect.mockClear();
  });

  it("redirects to /collection when a session is present", async () => {
    // given
    mockAuth.mockResolvedValue({ user: { id: "me" } });

    // when / then
    await expect(
      Home({ searchParams: Promise.resolve({}) })
    ).rejects.toThrow(/NEXT_REDIRECT/);
    expect(mockRedirect).toHaveBeenCalledWith("/collection");
  });

  it("renders the welcome content without redirecting when signed out", async () => {
    // given
    mockAuth.mockResolvedValue(null);

    // when
    const ui = await Home({ searchParams: Promise.resolve({}) });
    render(ui);

    // then
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(
      screen.getByRole("link", { name: /create account/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
  });

  it("renders the accountDeleted flash message when signed out", async () => {
    // given
    mockAuth.mockResolvedValue(null);

    // when
    const ui = await Home({
      searchParams: Promise.resolve({ accountDeleted: "1" }),
    });
    render(ui);

    // then
    expect(screen.getByRole("status")).toHaveTextContent(
      /account has been deleted/i
    );
  });
});
