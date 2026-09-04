/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/app/reset-password/actions", () => ({
  resetPasswordAction: jest.fn(),
}));
import { resetPasswordAction } from "@/app/reset-password/actions";
import { ResetPasswordForm } from "@/app/reset-password/_components/reset-password-form";

const mockResetPassword = resetPasswordAction as jest.Mock;

describe("ResetPasswordForm", () => {
  beforeEach(() => {
    mockResetPassword.mockReset();
    mockResetPassword.mockResolvedValue(null);
  });

  it("keeps the submit button disabled until password and confirmPassword match", async () => {
    // given
    const user = userEvent.setup();
    render(<ResetPasswordForm token="abc123" />);
    const button = screen.getByRole("button", { name: /zresetuj hasło/i });

    // then (initial state)
    expect(button).toBeDisabled();

    // when (mismatch)
    await user.type(screen.getByLabelText(/^nowe hasło$/i), "password123");
    await user.type(
      screen.getByLabelText(/potwierdź nowe hasło/i),
      "different123"
    );

    // then
    expect(button).toBeDisabled();

    // when (match)
    await user.clear(screen.getByLabelText(/potwierdź nowe hasło/i));
    await user.type(
      screen.getByLabelText(/potwierdź nowe hasło/i),
      "password123"
    );

    // then
    expect(button).toBeEnabled();
  });

  it("fires the mocked action once passwords match and the form is submitted", async () => {
    // given
    const user = userEvent.setup();
    render(<ResetPasswordForm token="abc123" />);
    await user.type(screen.getByLabelText(/^nowe hasło$/i), "password123");
    await user.type(
      screen.getByLabelText(/potwierdź nowe hasło/i),
      "password123"
    );

    // when
    await user.click(screen.getByRole("button", { name: /zresetuj hasło/i }));

    // then
    expect(mockResetPassword).toHaveBeenCalledTimes(1);
  });
});
