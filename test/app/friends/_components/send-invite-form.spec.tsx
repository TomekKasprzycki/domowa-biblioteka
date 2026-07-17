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
import { sendInviteAction } from "@/app/friends/actions";
import { SendInviteForm } from "@/app/friends/_components/send-invite-form";

const mockSendInvite = sendInviteAction as jest.Mock;

describe("SendInviteForm", () => {
  beforeEach(() => {
    mockSendInvite.mockClear();
  });

  it("renders the email field and the submit button", () => {
    // given
    render(<SendInviteForm />);

    // when
    const input = screen.getByLabelText(/friend's email/i);
    const button = screen.getByRole("button", { name: /send invite/i });

    // then
    expect(input).toHaveAttribute("type", "email");
    expect(input).toBeRequired();
    expect(button).toBeInTheDocument();
  });

  it("invokes sendInviteAction when the form is submitted", async () => {
    // given
    const user = userEvent.setup();
    render(<SendInviteForm />);
    await user.type(
      screen.getByLabelText(/friend's email/i),
      "friend@example.com"
    );

    // when
    await user.click(screen.getByRole("button", { name: /send invite/i }));

    // then
    expect(mockSendInvite).toHaveBeenCalledTimes(1);
  });
});
