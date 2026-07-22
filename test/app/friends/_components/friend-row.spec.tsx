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
import { removeFriendAction } from "@/app/friends/actions";
import { FriendRow } from "@/app/friends/_components/friend-row";
import type { Friend } from "@/app/friends/friends.types";

const mockRemove = removeFriendAction as jest.Mock;

const friend: Friend = {
  id: "33333333-3333-3333-3333-333333333333",
  otherUser: {
    id: "44444444-4444-4444-4444-444444444444",
    email: "friend@example.com",
    name: "Friendly Person",
  },
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("FriendRow", () => {
  beforeEach(() => {
    mockRemove.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("links to the friend's collection via the deep link", () => {
    // given
    render(<FriendRow friend={friend} />);

    // when
    const link = screen.getByRole("link", { name: /view collection/i });

    // then
    expect(link).toHaveAttribute(
      "href",
      `/discover?friend=${friend.otherUser.id}`
    );
  });

  it("renders the friend's name and email with the connection id hidden field", () => {
    // given
    const { container } = render(<FriendRow friend={friend} />);

    // when
    const name = screen.getByText("Friendly Person");
    const hidden = container.querySelector<HTMLInputElement>(
      'input[type="hidden"][name="connectionId"]'
    );

    // then
    expect(name).toBeInTheDocument();
    expect(hidden).toHaveValue(friend.id);
  });

  it("does not submit the remove action when the confirm dialog is cancelled", async () => {
    // given
    const user = userEvent.setup();
    jest.spyOn(window, "confirm").mockReturnValue(false);
    render(<FriendRow friend={friend} />);

    // when
    await user.click(screen.getByRole("button", { name: /remove/i }));

    // then
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it("submits the remove action when the confirm dialog is accepted", async () => {
    // given
    const user = userEvent.setup();
    jest.spyOn(window, "confirm").mockReturnValue(true);
    render(<FriendRow friend={friend} />);

    // when
    await user.click(screen.getByRole("button", { name: /remove/i }));

    // then
    expect(mockRemove).toHaveBeenCalledTimes(1);
  });
});
