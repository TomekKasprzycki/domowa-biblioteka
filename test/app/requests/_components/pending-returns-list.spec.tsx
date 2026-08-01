/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

jest.mock("@/app/borrow/actions", () => ({
  confirmReturnAction: jest.fn().mockResolvedValue(null),
}));
import { PendingReturnsList } from "@/app/requests/_components/pending-returns-list";
import type { PendingReturn } from "@/app/requests/requests.types";

const pendingReturn: PendingReturn = {
  id: "11111111-1111-1111-1111-111111111111",
  book: { title: "Clean Code", author: "Robert Martin" },
  requester: { name: "Alice" },
  startedAt: new Date("2026-03-12T00:00:00.000Z"),
};

describe("PendingReturnsList", () => {
  it("renders nothing when there is nothing to confirm", () => {
    // given
    const { container } = render(
      <PendingReturnsList pendingReturns={[]} />
    );

    // when / then
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the section heading when a return awaits confirmation", () => {
    // given
    render(<PendingReturnsList pendingReturns={[pendingReturn]} />);

    // when / then
    expect(
      screen.getByRole("heading", { name: "Awaiting your confirmation" })
    ).toBeInTheDocument();
  });

  it("renders a row per pending return", () => {
    // given
    const second: PendingReturn = {
      ...pendingReturn,
      id: "22222222-2222-2222-2222-222222222222",
      book: { title: "Refactoring", author: "Martin Fowler" },
    };

    // when
    render(<PendingReturnsList pendingReturns={[pendingReturn, second]} />);

    // then
    expect(screen.getByText("Clean Code")).toBeInTheDocument();
    expect(screen.getByText("Refactoring")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "I received it back" })
    ).toHaveLength(2);
  });
});
