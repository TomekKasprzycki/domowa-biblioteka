/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import "../../../shared/match-media.mock";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/server/friend-connection/friend-connection.repository", () => ({
  findPendingReceived: jest.fn(),
  findPendingSent: jest.fn(),
  findFriends: jest.fn(),
}));
jest.mock("@/server/book/book.repository", () => ({
  countBooksForUser: jest.fn(),
}));
jest.mock("@/app/(app)/friends/actions", () => ({
  sendInviteAction: jest.fn().mockResolvedValue(null),
  acceptInviteAction: jest.fn().mockResolvedValue(null),
  rejectInviteAction: jest.fn().mockResolvedValue(null),
  removeFriendAction: jest.fn().mockResolvedValue(null),
}));

import { auth } from "@/auth";
import {
  findPendingReceived,
  findPendingSent,
  findFriends,
} from "@/server/friend-connection/friend-connection.repository";
import { countBooksForUser } from "@/server/book/book.repository";
import FriendsPage from "@/app/(app)/friends/page";

const mockAuth = auth as jest.Mock;
const mockReceived = findPendingReceived as jest.Mock;
const mockSent = findPendingSent as jest.Mock;
const mockFriends = findFriends as jest.Mock;
const mockCountBooksForUser = countBooksForUser as jest.Mock;

describe("FriendsPage", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockReceived.mockReset();
    mockSent.mockReset();
    mockFriends.mockReset();
    mockCountBooksForUser.mockReset();
    mockAuth.mockResolvedValue({ user: { id: "me" } });
    mockReceived.mockResolvedValue([]);
    mockSent.mockResolvedValue([]);
    mockFriends.mockResolvedValue([]);
    mockCountBooksForUser.mockResolvedValue(0);
  });

  it("renders the notice banner when notice=not-a-friend is present", async () => {
    // given
    const ui = await FriendsPage({
      searchParams: Promise.resolve({ notice: "not-a-friend" }),
    });

    // when
    render(ui);

    // then
    expect(screen.getByRole("alert")).toHaveTextContent(
      /nie masz połączenia z tym użytkownikiem/i
    );
  });

  it("renders no banner when the notice param is absent", async () => {
    // given
    const ui = await FriendsPage({ searchParams: Promise.resolve({}) });

    // when
    render(ui);

    // then
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("fetches a book count per confirmed friend and renders it on the row", async () => {
    // given
    const friendUser = {
      id: "friend-1",
      email: "friend@example.com",
      name: "Friendly Person",
    };
    mockFriends.mockResolvedValue([
      {
        id: "connection-1",
        requesterId: "me",
        requester: { id: "me" },
        addresseeId: friendUser.id,
        addressee: friendUser,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    mockCountBooksForUser.mockResolvedValue(6);

    // when
    const ui = await FriendsPage({ searchParams: Promise.resolve({}) });
    render(ui);

    // then
    expect(mockCountBooksForUser).toHaveBeenCalledTimes(1);
    expect(mockCountBooksForUser).toHaveBeenCalledWith(friendUser.id);
    expect(screen.getByText("6 książek na półce")).toBeInTheDocument();
  });

  it("renders the invite form exactly once — regression guard against the admin block rendering twice", async () => {
    // given
    const ui = await FriendsPage({ searchParams: Promise.resolve({}) });

    // when
    render(ui);

    // then
    expect(screen.getAllByLabelText(/e-mail znajomego/i)).toHaveLength(1);
  });
});
