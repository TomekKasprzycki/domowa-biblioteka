/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { SentInvitesList } from "@/app/(app)/friends/_components/sent-invites-list";
import type { SentInvite } from "@/app/(app)/friends/friends.types";

const invites: SentInvite[] = [
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

describe("SentInvitesList", () => {
  it("shows an empty-state message when there are no invites", () => {
    // given
    render(<SentInvitesList invites={[]} />);

    // when
    const message = screen.getByText(/nie wysłano jeszcze żadnych zaproszeń/i);

    // then
    expect(message).toBeInTheDocument();
  });

  it("renders a row for each sent invite", () => {
    // given
    render(<SentInvitesList invites={invites} />);

    // when
    const first = screen.getByText("Alice Example");
    const second = screen.getByText("Bob Example");

    // then
    expect(first).toBeInTheDocument();
    expect(second).toBeInTheDocument();
  });
});
