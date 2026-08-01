/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/app/borrow/actions", () => ({
  markReturnedAction: jest.fn().mockResolvedValue(null),
}));
import { markReturnedAction } from "@/app/borrow/actions";
import { BorrowingRow } from "@/app/borrowing/_components/borrowing-row";
import type { OutgoingLoan } from "@/app/borrowing/borrowing.types";

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
      screen.getByRole("button", { name: "I returned it" })
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
      screen.queryByRole("button", { name: "I returned it" })
    ).not.toBeInTheDocument();
  });

  it.each([
    ["requested" as const, "Requested from Marta"],
    ["active" as const, "Borrowed from Marta"],
    [
      "return_pending" as const,
      "Return pending — waiting for Marta to confirm",
    ],
    ["returned" as const, "Returned to Marta"],
    ["declined" as const, "Declined by Marta"],
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

  it("does not fire the action when the confirm dialog is dismissed", async () => {
    // given
    jest.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<BorrowingRow loan={activeLoan} />);

    // when
    await user.click(screen.getByRole("button", { name: "I returned it" }));

    // then
    expect(mockMarkReturned).not.toHaveBeenCalled();
  });

  it("fires markReturnedAction when the confirm dialog is accepted", async () => {
    // given
    jest.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<BorrowingRow loan={activeLoan} />);

    // when
    await user.click(screen.getByRole("button", { name: "I returned it" }));

    // then
    expect(mockMarkReturned).toHaveBeenCalledTimes(1);
  });
});
