/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/app/borrow/actions", () => ({
  approveRequestAction: jest.fn().mockResolvedValue(null),
  declineRequestAction: jest.fn().mockResolvedValue(null),
}));
import {
  approveRequestAction,
  declineRequestAction,
} from "@/app/borrow/actions";
import { RequestRow } from "@/app/requests/_components/request-row";
import type { IncomingRequest } from "@/app/requests/requests.types";

const mockApprove = approveRequestAction as jest.Mock;
const mockDecline = declineRequestAction as jest.Mock;

const request: IncomingRequest = {
  id: "11111111-1111-1111-1111-111111111111",
  book: { title: "Clean Code", author: "Robert Martin" },
  requester: { name: "Alice", email: "alice@example.com" },
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("RequestRow", () => {
  beforeEach(() => {
    mockApprove.mockClear();
    mockDecline.mockClear();
  });

  it("renders the book title, author and requester name", () => {
    // given
    render(<RequestRow request={request} />);

    // when / then
    expect(screen.getByText("Clean Code")).toBeInTheDocument();
    expect(screen.getByText("Robert Martin")).toBeInTheDocument();
    expect(screen.getByText(/Requested by Alice/)).toBeInTheDocument();
  });

  it("carries the loan id in a hidden field for each action form", () => {
    // given
    const { container } = render(<RequestRow request={request} />);

    // when
    const hidden = container.querySelectorAll<HTMLInputElement>(
      'input[type="hidden"][name="loanId"]'
    );

    // then
    expect(hidden).toHaveLength(2);
    expect(hidden[0]).toHaveValue(request.id);
    expect(hidden[1]).toHaveValue(request.id);
  });

  it("invokes approveRequestAction when Approve is clicked", async () => {
    // given
    const user = userEvent.setup();
    render(<RequestRow request={request} />);

    // when
    await user.click(screen.getByRole("button", { name: "Approve" }));

    // then
    expect(mockApprove).toHaveBeenCalledTimes(1);
    expect(mockDecline).not.toHaveBeenCalled();
  });

  it("invokes declineRequestAction when Decline is clicked", async () => {
    // given
    const user = userEvent.setup();
    render(<RequestRow request={request} />);

    // when
    await user.click(screen.getByRole("button", { name: "Decline" }));

    // then
    expect(mockDecline).toHaveBeenCalledTimes(1);
    expect(mockApprove).not.toHaveBeenCalled();
  });
});
