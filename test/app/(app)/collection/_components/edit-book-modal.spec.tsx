/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { pressEscape } from "../../../../shared/dialog.mock";

jest.mock("@/app/(app)/collection/actions", () => ({
  updateBookAction: jest.fn().mockResolvedValue(null),
}));
import { updateBookAction } from "@/app/(app)/collection/actions";
import { EditBookModal } from "@/app/(app)/collection/_components/edit-book-modal";
import type { CollectionBook } from "@/app/(app)/collection/collection.types";

const mockUpdate = updateBookAction as jest.Mock;

const book: CollectionBook = {
  id: "11111111-1111-1111-1111-111111111111",
  title: "Solaris",
  author: "Stanisław Lem",
  notes: "Paperback",
  isbn: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  loan: null,
};

// Not name-matched via getByRole: a closed <dialog>'s subtree counts as
// hidden for accessible-name computation, so aria-labelledby resolves to ""
// while the dialog is shut — exactly the state most of these assertions
// need to inspect. Match on the rendered heading text instead.
function getDialog(title: string): HTMLDialogElement {
  const dialogs = screen.getAllByRole("dialog", {
    hidden: true,
  }) as HTMLDialogElement[];
  const match = dialogs.find((d) => d.querySelector("h2")?.textContent === title);
  if (!match) throw new Error(`No dialog found with heading "${title}"`);
  return match;
}

describe("EditBookModal", () => {
  beforeEach(() => {
    mockUpdate.mockClear();
    mockUpdate.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("opens pre-filled with the book's current values", () => {
    // given / when
    render(<EditBookModal book={book} onClose={jest.fn()} />);

    // then
    expect(screen.getByLabelText("Title")).toHaveValue("Solaris");
    expect(screen.getByLabelText("Author")).toHaveValue("Stanisław Lem");
    expect(screen.getByLabelText("Notes (optional)")).toHaveValue("Paperback");
  });

  it("submits the edited values with the book id", async () => {
    // given
    const user = userEvent.setup();
    render(<EditBookModal book={book} onClose={jest.fn()} />);
    await user.clear(screen.getByLabelText("Author"));
    await user.type(screen.getByLabelText("Author"), "Lem");

    // when
    await user.click(screen.getByRole("button", { name: "Save" }));

    // then
    const formData = mockUpdate.mock.calls[0][1] as FormData;
    expect(formData.get("bookId")).toBe(book.id);
    expect(formData.get("author")).toBe("Lem");
  });

  it("submits an emptied notes field so the clear can be persisted", async () => {
    // given
    const user = userEvent.setup();
    render(<EditBookModal book={book} onClose={jest.fn()} />);
    await user.clear(screen.getByLabelText("Notes (optional)"));

    // when
    await user.click(screen.getByRole("button", { name: "Save" }));

    // then
    const formData = mockUpdate.mock.calls[0][1] as FormData;
    expect(formData.get("notes")).toBe("");
  });

  it("calls onClose after a successful save", async () => {
    // given
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<EditBookModal book={book} onClose={onClose} />);

    // when
    await user.click(screen.getByRole("button", { name: "Save" }));

    // then
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("keeps the dialog open and shows the error when the save fails", async () => {
    // given
    const user = userEvent.setup();
    const onClose = jest.fn();
    mockUpdate.mockResolvedValue(
      "You already have a book with this title and author."
    );
    render(<EditBookModal book={book} onClose={onClose} />);

    // when
    await user.click(screen.getByRole("button", { name: "Save" }));

    // then
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You already have a book with this title and author."
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it("dismisses without prompting when nothing was changed", async () => {
    // given
    const onClose = jest.fn();
    render(<EditBookModal book={book} onClose={onClose} />);

    // when
    act(() => {
      pressEscape(getDialog("Edit book"));
    });

    // then
    expect(getDialog("Discard changes").open).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("opens a discard-confirm modal on Escape when dirty, keeping the edit dialog open", async () => {
    // given
    const user = userEvent.setup();
    render(<EditBookModal book={book} onClose={jest.fn()} />);
    await user.type(screen.getByLabelText("Title"), " Redux");

    // when
    act(() => {
      pressEscape(getDialog("Edit book"));
    });

    // then
    expect(getDialog("Edit book").open).toBe(true);
    expect(getDialog("Discard changes").open).toBe(true);
  });

  it("keeps the edit dialog open when the discard confirm is cancelled", async () => {
    // given
    const user = userEvent.setup();
    render(<EditBookModal book={book} onClose={jest.fn()} />);
    await user.type(screen.getByLabelText("Title"), " Redux");
    act(() => {
      pressEscape(getDialog("Edit book"));
    });

    // when
    await user.click(
      within(getDialog("Discard changes")).getByRole("button", {
        name: "Cancel",
      })
    );

    // then
    expect(getDialog("Edit book").open).toBe(true);
    expect(getDialog("Discard changes").open).toBe(false);
  });

  it("calls onClose when the discard confirm is accepted", async () => {
    // given
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<EditBookModal book={book} onClose={onClose} />);
    await user.type(screen.getByLabelText("Title"), " Redux");
    act(() => {
      pressEscape(getDialog("Edit book"));
    });

    // when
    await user.click(
      within(getDialog("Discard changes")).getByRole("button", {
        name: "Discard",
      })
    );

    // then
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not prompt when an edit is typed and then undone", async () => {
    // given
    const user = userEvent.setup();
    render(<EditBookModal book={book} onClose={jest.fn()} />);
    await user.type(screen.getByLabelText("Title"), "X");
    await user.type(screen.getByLabelText("Title"), "{backspace}");

    // when
    act(() => {
      pressEscape(getDialog("Edit book"));
    });

    // then
    expect(getDialog("Discard changes").open).toBe(false);
  });
});
