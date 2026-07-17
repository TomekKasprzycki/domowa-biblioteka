/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

jest.mock("@/app/friends/actions", () => ({
  sendInviteAction: jest.fn().mockResolvedValue(null),
  acceptInviteAction: jest.fn().mockResolvedValue(null),
  rejectInviteAction: jest.fn().mockResolvedValue(null),
  removeFriendAction: jest.fn().mockResolvedValue(null),
}));
import { ReceivedInvitesList } from "@/app/friends/_components/received-invites-list";
import type { ReceivedInvite } from "@/app/friends/friends.types";

const invites: ReceivedInvite[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    otherUser: { email: "a@example.com", name: "Alice Example" },
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    otherUser: { email: "b@example.com", name: "Bob Example" },
    createdAt: new Date("2026-01-02T00:00:00.000Z"),
  },
];

describe("ReceivedInvitesList", () => {
  it("shows an empty-state message when there are no invites", () => {
    // given
    render(<ReceivedInvitesList invites={[]} />);

    // when
    const message = screen.getByText(/no pending invitations/i);

    // then
    expect(message).toBeInTheDocument();
  });

  it("renders a row for each received invite", () => {
    // given
    render(<ReceivedInvitesList invites={invites} />);

    // when
    const first = screen.getByText("Alice Example");
    const second = screen.getByText("Bob Example");

    // then
    expect(first).toBeInTheDocument();
    expect(second).toBeInTheDocument();
  });
});
