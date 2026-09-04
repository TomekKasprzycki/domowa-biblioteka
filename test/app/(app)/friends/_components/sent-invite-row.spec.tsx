/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { SentInviteRow } from "@/app/(app)/friends/_components/sent-invite-row";
import type { SentInvite } from "@/app/(app)/friends/friends.types";

const invite: SentInvite = {
  id: "11111111-1111-1111-1111-111111111111",
  otherUser: { email: "addressee@example.com", name: "Addressee Person" },
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("SentInviteRow", () => {
  it("renders the invited user's name and email", () => {
    // given
    render(<SentInviteRow invite={invite} />);

    // when
    const name = screen.getByText("Addressee Person");
    const email = screen.getByText("addressee@example.com");

    // then
    expect(name).toBeInTheDocument();
    expect(email).toBeInTheDocument();
  });

  it("shows a pending status", () => {
    // given
    render(<SentInviteRow invite={invite} />);

    // when
    const status = screen.getByText("Oczekuje");

    // then
    expect(status).toBeInTheDocument();
  });
});
