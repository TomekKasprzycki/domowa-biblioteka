/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/app/borrow/actions", () => ({
  confirmReturnAction: jest.fn().mockResolvedValue(null),
}));
import { confirmReturnAction } from "@/app/borrow/actions";
import { PendingReturnRow } from "@/app/(app)/requests/_components/pending-return-row";
import type { PendingReturn } from "@/app/(app)/requests/requests.types";

const mockConfirmReturn = confirmReturnAction as jest.Mock;

const pendingReturn: PendingReturn = {
  id: "11111111-1111-1111-1111-111111111111",
  book: { title: "Clean Code", author: "Robert Martin" },
  requester: { name: "Alice" },
  startedAt: new Date("2026-03-12T00:00:00.000Z"),
};

describe("PendingReturnRow", () => {
  beforeEach(() => {
    mockConfirmReturn.mockClear();
  });

  it("renders the book title, author and who says they returned it", () => {
    // given
    render(<PendingReturnRow pendingReturn={pendingReturn} />);

    // when / then
    expect(screen.getByText("Clean Code")).toBeInTheDocument();
    expect(screen.getByText("Robert Martin")).toBeInTheDocument();
    expect(
      screen.getByText(/Alice zgłasza zwrot/)
    ).toBeInTheDocument();
  });

  it("shows how long the book had been out", () => {
    // given
    render(<PendingReturnRow pendingReturn={pendingReturn} />);

    // when / then
    expect(
      screen.getByText(/wypożyczono od 12 mar 2026/)
    ).toBeInTheDocument();
  });

  it("omits the borrowed-since note when no start date was recorded", () => {
    // given
    render(
      <PendingReturnRow
        pendingReturn={{ ...pendingReturn, startedAt: null }}
      />
    );

    // when / then
    expect(screen.queryByText(/wypożyczono od/)).not.toBeInTheDocument();
  });

  it("carries the loan id in a hidden field", () => {
    // given
    const { container } = render(
      <PendingReturnRow pendingReturn={pendingReturn} />
    );

    // when
    const hidden = container.querySelector<HTMLInputElement>(
      'input[type="hidden"][name="loanId"]'
    );

    // then
    expect(hidden).toHaveValue(pendingReturn.id);
  });

  it("invokes confirmReturnAction when the confirm button is clicked", async () => {
    // given
    const user = userEvent.setup();
    render(<PendingReturnRow pendingReturn={pendingReturn} />);

    // when
    await user.click(
      screen.getByRole("button", { name: "Potwierdź odbiór" })
    );

    // then
    expect(mockConfirmReturn).toHaveBeenCalledTimes(1);
  });
});
