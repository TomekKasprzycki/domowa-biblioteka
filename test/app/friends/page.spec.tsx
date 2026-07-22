/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/server/friend-connection/friend-connection.repository", () => ({
  findPendingReceived: jest.fn(),
  findPendingSent: jest.fn(),
  findFriends: jest.fn(),
}));
jest.mock("@/app/friends/actions", () => ({
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
import FriendsPage from "@/app/friends/page";

const mockAuth = auth as jest.Mock;
const mockReceived = findPendingReceived as jest.Mock;
const mockSent = findPendingSent as jest.Mock;
const mockFriends = findFriends as jest.Mock;

describe("FriendsPage", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockReceived.mockReset();
    mockSent.mockReset();
    mockFriends.mockReset();
    mockAuth.mockResolvedValue({ user: { id: "me" } });
    mockReceived.mockResolvedValue([]);
    mockSent.mockResolvedValue([]);
    mockFriends.mockResolvedValue([]);
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
      /not connected with that user/i
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
});
