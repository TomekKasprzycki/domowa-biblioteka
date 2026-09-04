/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/app/(app)/account/actions", () => ({
  deleteAccountAction: jest.fn().mockResolvedValue(null),
}));
import { deleteAccountAction } from "@/app/(app)/account/actions";
import { DeleteAccountForm } from "@/app/(app)/account/_components/delete-account-form";

const mockDeleteAccount = deleteAccountAction as jest.Mock;

describe("DeleteAccountForm", () => {
  beforeEach(() => {
    mockDeleteAccount.mockClear();
  });

  it("keeps the delete button disabled until the typed value matches the session email", async () => {
    // given
    const user = userEvent.setup();
    render(<DeleteAccountForm email="me@example.com" />);
    const button = screen.getByRole("button", { name: /usuń moje konto/i });
    const input = screen.getByLabelText(/me@example\.com/i);

    // then (initial state)
    expect(button).toBeDisabled();

    // when (partial/incorrect match)
    await user.type(input, "someone-else@example.com");

    // then
    expect(button).toBeDisabled();

    // when (exact match)
    await user.clear(input);
    await user.type(input, "me@example.com");

    // then
    expect(button).toBeEnabled();
  });

  it("invokes deleteAccountAction when submitted with a matching confirmation", async () => {
    // given
    const user = userEvent.setup();
    render(<DeleteAccountForm email="me@example.com" />);
    await user.type(
      screen.getByLabelText(/me@example\.com/i),
      "me@example.com"
    );

    // when
    await user.click(
      screen.getByRole("button", { name: /usuń moje konto/i })
    );

    // then
    expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
  });
});
