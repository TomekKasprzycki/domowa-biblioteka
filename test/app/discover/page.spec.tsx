/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/server/friend-connection/friend-connection.repository", () => ({
  findFriendUsers: jest.fn(),
}));
jest.mock("@/server/book/book.repository", () => ({
  findByOwnerIds: jest.fn(),
}));
jest.mock("next/navigation", () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

import { auth } from "@/auth";
import { findFriendUsers } from "@/server/friend-connection/friend-connection.repository";
import { findByOwnerIds } from "@/server/book/book.repository";
import { redirect } from "next/navigation";
import DiscoverPage from "@/app/discover/page";

const mockAuth = auth as jest.Mock;
const mockFindFriendUsers = findFriendUsers as jest.Mock;
const mockFindByOwnerIds = findByOwnerIds as jest.Mock;
const mockRedirect = redirect as unknown as jest.Mock;

const friend = {
  id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  name: "Alice",
  email: "alice@example.com",
};

const book = {
  id: "1",
  title: "Clean Code",
  author: "Robert Martin",
  notes: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  owner: friend,
};

describe("DiscoverPage", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockFindFriendUsers.mockReset();
    mockFindByOwnerIds.mockReset();
    mockRedirect.mockClear();
    mockAuth.mockResolvedValue({ user: { id: "me" } });
    mockFindFriendUsers.mockResolvedValue([friend]);
    mockFindByOwnerIds.mockResolvedValue([book]);
  });

  it("renders confirmed friends' books when no friend param is present", async () => {
    // given
    const ui = await DiscoverPage({ searchParams: Promise.resolve({}) });

    // when
    render(ui);

    // then
    expect(screen.getByText("Clean Code")).toBeInTheDocument();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("pre-scopes when the friend param matches a confirmed friend", async () => {
    // given
    const ui = await DiscoverPage({
      searchParams: Promise.resolve({ friend: friend.id }),
    });

    // when
    render(ui);

    // then
    expect(screen.getByText("Clean Code")).toBeInTheDocument();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("redirects when the friend param is a valid uuid but not a friend", async () => {
    // given
    const nonFriendUuid = "ffffffff-ffff-ffff-ffff-ffffffffffff";

    // when / then
    await expect(
      DiscoverPage({ searchParams: Promise.resolve({ friend: nonFriendUuid }) })
    ).rejects.toThrow(/NEXT_REDIRECT/);
    expect(mockRedirect).toHaveBeenCalledWith("/friends?notice=not-a-friend");
    expect(mockFindByOwnerIds).not.toHaveBeenCalled();
  });

  it("redirects on a malformed non-uuid friend param without querying", async () => {
    // given
    const malformed = "not-a-uuid";

    // when / then
    await expect(
      DiscoverPage({ searchParams: Promise.resolve({ friend: malformed }) })
    ).rejects.toThrow(/NEXT_REDIRECT/);
    expect(mockRedirect).toHaveBeenCalledWith("/friends?notice=not-a-friend");
    expect(mockFindByOwnerIds).not.toHaveBeenCalled();
  });
});
