/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "../../../../shared/dialog.mock";

jest.mock("@/app/(app)/collection/actions", () => ({
  deleteBookAction: jest.fn().mockResolvedValue(null),
  updateBookAction: jest.fn().mockResolvedValue(null),
}));
import { BookList } from "@/app/(app)/collection/_components/book-list";
import type { CollectionBook } from "@/app/(app)/collection/collection.types";

const solaris: CollectionBook = {
  id: "11111111-1111-1111-1111-111111111111",
  title: "Solaris",
  author: "Stanisław Lem",
  notes: null,
  isbn: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  loan: null,
};

const cyberiad: CollectionBook = {
  ...solaris,
  id: "22222222-2222-2222-2222-222222222222",
  title: "Cyberiada",
};

describe("BookList", () => {
  it("shows the empty-state copy when there are no books", () => {
    // given / when
    render(<BookList books={[]} />);

    // then
    expect(screen.getByText("Twoja kolekcja jest pusta.")).toBeInTheDocument();
  });

  it("renders one spine per book", () => {
    // given / when
    render(<BookList books={[solaris, cyberiad]} />);

    // then
    expect(
      screen.getByRole("button", { name: /^Zobacz: Solaris,/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Zobacz: Cyberiada,/ })
    ).toBeInTheDocument();
  });

  it("exposes the shelf as a list with one item per book", () => {
    // given / when
    render(<BookList books={[solaris, cyberiad]} />);

    // then
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("keeps the edit dialog closed until a row's Edit is clicked", () => {
    // given / when
    render(<BookList books={[solaris, cyberiad]} />);

    // then
    expect(screen.queryByLabelText("Tytuł")).toBeNull();
  });

  it("opens the edit dialog for the book whose Edit was clicked", async () => {
    // given
    const user = userEvent.setup();
    render(<BookList books={[solaris, cyberiad]} />);

    // when
    await user.click(
      screen.getByRole("button", { name: /^Zobacz: Cyberiada,/ })
    );
    await user.click(screen.getByRole("button", { name: "Edytuj" }));

    // then
    expect(screen.getByLabelText("Tytuł")).toHaveValue("Cyberiada");
  });

  it("closes the edit dialog when Cancel is clicked", async () => {
    // given
    const user = userEvent.setup();
    render(<BookList books={[solaris]} />);
    await user.click(screen.getByRole("button", { name: /^Zobacz: Solaris,/ }));
    await user.click(screen.getByRole("button", { name: "Edytuj" }));

    // when
    await user.click(screen.getByRole("button", { name: "Anuluj" }));

    // then
    expect(screen.queryByLabelText("Tytuł")).toBeNull();
  });
});
