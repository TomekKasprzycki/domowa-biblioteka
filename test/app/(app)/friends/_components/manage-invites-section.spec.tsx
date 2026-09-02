/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { setMatchMedia, resetMatchMedia } from "../../../../shared/match-media.mock";

jest.mock("@/app/(app)/friends/actions", () => ({
  sendInviteAction: jest.fn().mockResolvedValue(null),
  acceptInviteAction: jest.fn().mockResolvedValue(null),
  rejectInviteAction: jest.fn().mockResolvedValue(null),
  removeFriendAction: jest.fn().mockResolvedValue(null),
}));

import { ManageInvitesSection } from "@/app/(app)/friends/_components/manage-invites-section";
import type { ReceivedInvite, SentInvite } from "@/app/(app)/friends/friends.types";

const LARGE_SCREEN_QUERY = "(min-width: 1024px)";

const received: ReceivedInvite[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    otherUser: { email: "tomek@example.com", name: "Tomek" },
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  },
];

const sent: SentInvite[] = [
  {
    id: "22222222-2222-2222-2222-222222222222",
    otherUser: { email: "ola@example.com", name: "Ola" },
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  },
];

function getDetails(): HTMLDetailsElement {
  return screen.getByText("Zarządzaj zaproszeniami").closest("details") as HTMLDetailsElement;
}

describe("ManageInvitesSection", () => {
  beforeEach(() => {
    resetMatchMedia();
  });

  it("renders the invite form and both sub-sections' headings and rows, at heading level 3", () => {
    // given / when
    render(<ManageInvitesSection received={received} sent={sent} />);

    // then
    expect(screen.getByLabelText("E-mail znajomego")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Otrzymane" })
    ).toBeInTheDocument();
    expect(screen.getByText("Tomek")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Wysłane" })
    ).toBeInTheDocument();
    expect(screen.getByText("Ola")).toBeInTheDocument();
  });

  it("is closed by default when the large-screen query does not match", () => {
    // given
    setMatchMedia(LARGE_SCREEN_QUERY, false);

    // when
    render(<ManageInvitesSection received={received} sent={sent} />);

    // then
    expect(getDetails().open).toBe(false);
  });

  it("is forced open when the large-screen query matches", () => {
    // given
    setMatchMedia(LARGE_SCREEN_QUERY, true);

    // when
    render(<ManageInvitesSection received={received} sent={sent} />);

    // then
    expect(getDetails().open).toBe(true);
  });
});
