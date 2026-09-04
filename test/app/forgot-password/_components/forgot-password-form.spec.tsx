/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/app/forgot-password/actions", () => ({
  requestPasswordResetAction: jest.fn(),
}));
import { requestPasswordResetAction } from "@/app/forgot-password/actions";
import { ForgotPasswordForm } from "@/app/forgot-password/_components/forgot-password-form";

const mockRequestPasswordReset = requestPasswordResetAction as jest.Mock;

describe("ForgotPasswordForm", () => {
  beforeEach(() => {
    mockRequestPasswordReset.mockReset();
  });

  it("renders the email field", () => {
    // given
    mockRequestPasswordReset.mockResolvedValue(null);

    // when
    render(<ForgotPasswordForm />);

    // then
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
  });

  it("calls the action on submit", async () => {
    // given
    const user = userEvent.setup();
    mockRequestPasswordReset.mockResolvedValue(null);
    render(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText(/e-mail/i), "me@example.com");

    // when
    await user.click(
      screen.getByRole("button", { name: /wyślij link resetujący/i })
    );

    // then
    expect(mockRequestPasswordReset).toHaveBeenCalledTimes(1);
  });

  it("renders a returned error string inline", async () => {
    // given
    const user = userEvent.setup();
    mockRequestPasswordReset.mockResolvedValue("Nieprawidłowy adres e-mail");
    render(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText(/e-mail/i), "me@example.com");

    // when
    await user.click(
      screen.getByRole("button", { name: /wyślij link resetujący/i })
    );

    // then
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Nieprawidłowy adres e-mail"
    );
  });
});
