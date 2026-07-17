/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

jest.mock("@/app/friends/actions", () => ({
  sendInviteAction: jest.fn().mockResolvedValue(null),
  acceptInviteAction: jest.fn().mockResolvedValue(null),
  rejectInviteAction: jest.fn().mockResolvedValue(null),
  removeFriendAction: jest.fn().mockResolvedValue(null),
}));
import { FriendsList } from "@/app/friends/_components/friends-list";
import type { Friend } from "@/app/friends/friends.types";

const friends: Friend[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    otherUser: { email: "friend@example.com", name: "Friendly Person" },
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  },
];

describe("FriendsList", () => {
  it("shows an empty-state message when there are no friends", () => {
    // given
    render(<FriendsList friends={[]} />);

    // when
    const message = screen.getByText(/you have no friends yet/i);

    // then
    expect(message).toBeInTheDocument();
  });

  it("renders a row for each confirmed friend", () => {
    // given
    render(<FriendsList friends={friends} />);

    // when
    const name = screen.getByText("Friendly Person");

    // then
    expect(name).toBeInTheDocument();
  });
});
