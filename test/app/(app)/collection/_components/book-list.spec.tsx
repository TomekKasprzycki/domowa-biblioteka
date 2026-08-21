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
    expect(screen.getByText("Your collection is empty.")).toBeInTheDocument();
  });

  it("renders one spine per book", () => {
    // given / when
    render(<BookList books={[solaris, cyberiad]} />);

    // then
    expect(
      screen.getByRole("button", { name: /^View Solaris,/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^View Cyberiada,/ })
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
    expect(screen.queryByLabelText("Title")).toBeNull();
  });

  it("opens the edit dialog for the book whose Edit was clicked", async () => {
    // given
    const user = userEvent.setup();
    render(<BookList books={[solaris, cyberiad]} />);

    // when
    await user.click(
      screen.getByRole("button", { name: /^View Cyberiada,/ })
    );
    await user.click(screen.getByRole("button", { name: "Edit" }));

    // then
    expect(screen.getByLabelText("Title")).toHaveValue("Cyberiada");
  });

  it("closes the edit dialog when Cancel is clicked", async () => {
    // given
    const user = userEvent.setup();
    render(<BookList books={[solaris]} />);
    await user.click(screen.getByRole("button", { name: /^View Solaris,/ }));
    await user.click(screen.getByRole("button", { name: "Edit" }));

    // when
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    // then
    expect(screen.queryByLabelText("Title")).toBeNull();
  });
});
