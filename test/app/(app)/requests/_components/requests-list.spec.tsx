/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

jest.mock("@/app/borrow/actions", () => ({
  approveRequestAction: jest.fn().mockResolvedValue(null),
  declineRequestAction: jest.fn().mockResolvedValue(null),
}));
import { RequestsList } from "@/app/(app)/requests/_components/requests-list";
import type { IncomingRequest } from "@/app/(app)/requests/requests.types";

const requests: IncomingRequest[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    book: { title: "Clean Code", author: "Robert Martin" },
    requester: { name: "Alice Example", email: "a@example.com" },
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    book: { title: "Refactoring", author: "Martin Fowler" },
    requester: { name: "Bob Example", email: "b@example.com" },
    createdAt: new Date("2026-01-02T00:00:00.000Z"),
  },
];

describe("RequestsList", () => {
  it("shows an empty-state message when there are no requests", () => {
    // given
    render(<RequestsList requests={[]} />);

    // when
    const message = screen.getByText(/brak oczekujących próśb/i);

    // then
    expect(message).toBeInTheDocument();
  });

  it("renders a row for each incoming request", () => {
    // given
    render(<RequestsList requests={requests} />);

    // when
    const first = screen.getByText("Clean Code");
    const second = screen.getByText("Refactoring");

    // then
    expect(first).toBeInTheDocument();
    expect(second).toBeInTheDocument();
    expect(
      screen.getByText(/Alice Example chce wypożyczyć tę książkę/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Bob Example chce wypożyczyć tę książkę/)
    ).toBeInTheDocument();
  });
});
