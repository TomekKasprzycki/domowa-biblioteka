/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "../../../../shared/dialog.mock";

jest.mock("@/app/borrow/actions", () => ({
  markReturnedAction: jest.fn().mockResolvedValue(null),
}));
import { markReturnedAction } from "@/app/borrow/actions";
import { BorrowingRow } from "@/app/(app)/borrowing/_components/borrowing-row";
import type { OutgoingLoan } from "@/app/(app)/borrowing/borrowing.types";

const mockMarkReturned = markReturnedAction as jest.Mock;

const activeLoan: OutgoingLoan = {
  id: "22222222-2222-2222-2222-222222222222",
  book: { title: "Refactoring", author: "Martin Fowler" },
  owner: { name: "Marta" },
  status: "active",
  startedAt: new Date("2026-01-01T00:00:00.000Z"),
};

function loanWith(status: OutgoingLoan["status"]): OutgoingLoan {
  return { ...activeLoan, status };
}

describe("BorrowingRow", () => {
  beforeEach(() => {
    mockMarkReturned.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("offers the return button on an active loan", () => {
    // given
    render(<BorrowingRow loan={activeLoan} />);

    // when / then
    expect(
      screen.getByRole("button", { name: "Oznacz jako zwrócone" })
    ).toBeInTheDocument();
  });

  it.each([
    ["requested" as const],
    ["return_pending" as const],
    ["returned" as const],
    ["declined" as const],
  ])("hides the return button when the loan is %s", (status) => {
    // given
    render(<BorrowingRow loan={loanWith(status)} />);

    // when / then
    expect(
      screen.queryByRole("button", { name: "Oznacz jako zwrócone" })
    ).not.toBeInTheDocument();
  });

  it.each([
    ["requested" as const, "Prośba wysłana do Marta"],
    ["active" as const, "Wypożyczona od Marta"],
    [
      "return_pending" as const,
      "Zwrot w trakcie — czeka na potwierdzenie od Marta",
    ],
    ["returned" as const, "Zwrócona do Marta"],
    ["declined" as const, "Odrzucona przez Marta"],
  ])("labels a %s loan as %s", (status, label) => {
    // given
    render(<BorrowingRow loan={loanWith(status)} />);

    // when / then
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("carries the loan id in a hidden field", () => {
    // given
    const { container } = render(<BorrowingRow loan={activeLoan} />);

    // when
    const hidden = container.querySelector<HTMLInputElement>(
      'input[type="hidden"][name="loanId"]'
    );

    // then
    expect(hidden).toHaveValue(activeLoan.id);
  });

  it("opens a confirm modal instead of firing the action immediately", async () => {
    // given
    const user = userEvent.setup();
    render(<BorrowingRow loan={activeLoan} />);

    // when
    await user.click(screen.getByRole("button", { name: "Oznacz jako zwrócone" }));

    // then
    expect(
      screen.getByRole("dialog", { name: /potwierdź zwrot/i })
    ).toBeInTheDocument();
    expect(mockMarkReturned).not.toHaveBeenCalled();
  });

  it("does not fire the action when the confirm modal is cancelled", async () => {
    // given
    const user = userEvent.setup();
    render(<BorrowingRow loan={activeLoan} />);
    await user.click(screen.getByRole("button", { name: "Oznacz jako zwrócone" }));
    const dialog = screen.getByRole("dialog", { name: /potwierdź zwrot/i });

    // when
    await user.click(within(dialog).getByRole("button", { name: "Anuluj" }));

    // then
    expect(mockMarkReturned).not.toHaveBeenCalled();
  });

  it("fires markReturnedAction when the confirm modal is confirmed", async () => {
    // given
    const user = userEvent.setup();
    render(<BorrowingRow loan={activeLoan} />);
    await user.click(screen.getByRole("button", { name: "Oznacz jako zwrócone" }));
    const dialog = screen.getByRole("dialog", { name: /potwierdź zwrot/i });

    // when
    await user.click(
      within(dialog).getByRole("button", { name: "Oznacz jako zwrócone" })
    );

    // then
    expect(mockMarkReturned).toHaveBeenCalledTimes(1);
  });
});
