/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/app/friends/actions", () => ({
  sendInviteAction: jest.fn().mockResolvedValue(null),
  acceptInviteAction: jest.fn().mockResolvedValue(null),
  rejectInviteAction: jest.fn().mockResolvedValue(null),
  removeFriendAction: jest.fn().mockResolvedValue(null),
}));
import {
  acceptInviteAction,
  rejectInviteAction,
} from "@/app/friends/actions";
import { ReceivedInviteRow } from "@/app/friends/_components/received-invite-row";
import type { ReceivedInvite } from "@/app/friends/friends.types";

const mockAccept = acceptInviteAction as jest.Mock;
const mockReject = rejectInviteAction as jest.Mock;

const invite: ReceivedInvite = {
  id: "11111111-1111-1111-1111-111111111111",
  otherUser: { email: "requester@example.com", name: "Requester Person" },
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("ReceivedInviteRow", () => {
  beforeEach(() => {
    mockAccept.mockClear();
    mockReject.mockClear();
  });

  it("renders the inviting user's name and email", () => {
    // given
    render(<ReceivedInviteRow invite={invite} />);

    // when
    const name = screen.getByText("Requester Person");
    const email = screen.getByText("requester@example.com");

    // then
    expect(name).toBeInTheDocument();
    expect(email).toBeInTheDocument();
  });

  it("carries the connection id in a hidden field for each action form", () => {
    // given
    const { container } = render(<ReceivedInviteRow invite={invite} />);

    // when
    const hidden = container.querySelectorAll<HTMLInputElement>(
      'input[type="hidden"][name="connectionId"]'
    );

    // then
    expect(hidden).toHaveLength(2);
    expect(hidden[0]).toHaveValue(invite.id);
    expect(hidden[1]).toHaveValue(invite.id);
  });

  it("invokes acceptInviteAction when Accept is clicked", async () => {
    // given
    const user = userEvent.setup();
    render(<ReceivedInviteRow invite={invite} />);

    // when
    await user.click(screen.getByRole("button", { name: /accept/i }));

    // then
    expect(mockAccept).toHaveBeenCalledTimes(1);
    expect(mockReject).not.toHaveBeenCalled();
  });

  it("invokes rejectInviteAction when Reject is clicked", async () => {
    // given
    const user = userEvent.setup();
    render(<ReceivedInviteRow invite={invite} />);

    // when
    await user.click(screen.getByRole("button", { name: /reject/i }));

    // then
    expect(mockReject).toHaveBeenCalledTimes(1);
    expect(mockAccept).not.toHaveBeenCalled();
  });
});
