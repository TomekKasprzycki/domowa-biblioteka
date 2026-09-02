/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "../../../../shared/dialog.mock";

jest.mock("@/app/(app)/friends/actions", () => ({
  sendInviteAction: jest.fn().mockResolvedValue(null),
  acceptInviteAction: jest.fn().mockResolvedValue(null),
  rejectInviteAction: jest.fn().mockResolvedValue(null),
  removeFriendAction: jest.fn().mockResolvedValue(null),
}));
import { removeFriendAction } from "@/app/(app)/friends/actions";
import { FriendRow } from "@/app/(app)/friends/_components/friend-row";
import type { Friend } from "@/app/(app)/friends/friends.types";

const mockRemove = removeFriendAction as jest.Mock;

const friend: Friend = {
  id: "33333333-3333-3333-3333-333333333333",
  otherUser: {
    id: "44444444-4444-4444-4444-444444444444",
    email: "friend@example.com",
    name: "Friendly Person",
    bookCount: 6,
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

  it("renders the friend's name, book count, and the connection id hidden field", () => {
    // given
    const { container } = render(<FriendRow friend={friend} />);

    // when
    const name = screen.getByText("Friendly Person");
    const bookCount = screen.getByText("6 books on their shelf");
    const hidden = container.querySelector<HTMLInputElement>(
      'input[type="hidden"][name="connectionId"]'
    );

    // then
    expect(name).toBeInTheDocument();
    expect(bookCount).toBeInTheDocument();
    expect(hidden).toHaveValue(friend.id);
  });

  it("does not render the friend's email", () => {
    // given / when
    render(<FriendRow friend={friend} />);

    // then
    expect(screen.queryByText("friend@example.com")).not.toBeInTheDocument();
  });

  it("uses a singular book count when there is exactly one book", () => {
    // given
    const singleBookFriend: Friend = {
      ...friend,
      otherUser: { ...friend.otherUser, bookCount: 1 },
    };

    // when
    render(<FriendRow friend={singleBookFriend} />);

    // then
    expect(screen.getByText("1 book on their shelf")).toBeInTheDocument();
  });

  it("labels the remove button with the friend's name as both its accessible name and tooltip", () => {
    // given / when
    render(<FriendRow friend={friend} />);

    // then
    const removeButton = screen.getByRole("button", {
      name: "Remove Friendly Person as a friend",
    });
    expect(removeButton).toHaveAttribute(
      "title",
      "Remove Friendly Person as a friend"
    );
  });

  it("opens a confirm modal instead of submitting immediately", async () => {
    // given
    const user = userEvent.setup();
    render(<FriendRow friend={friend} />);

    // when
    await user.click(
      screen.getByRole("button", { name: "Remove Friendly Person as a friend" })
    );

    // then
    expect(
      screen.getByRole("dialog", { name: /remove friend/i })
    ).toBeInTheDocument();
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it("does not submit the remove action when the confirm modal is cancelled", async () => {
    // given
    const user = userEvent.setup();
    render(<FriendRow friend={friend} />);
    await user.click(
      screen.getByRole("button", { name: "Remove Friendly Person as a friend" })
    );

    // when
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    // then
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it("submits the remove action when the confirm modal is confirmed", async () => {
    // given
    const user = userEvent.setup();
    render(<FriendRow friend={friend} />);
    await user.click(
      screen.getByRole("button", { name: "Remove Friendly Person as a friend" })
    );

    // when
    await user.click(screen.getByRole("button", { name: "Remove" }));

    // then
    expect(mockRemove).toHaveBeenCalledTimes(1);
  });
});
