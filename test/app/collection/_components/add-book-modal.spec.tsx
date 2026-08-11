/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { pressEscape } from "../../../shared/dialog.mock";

jest.mock("@/app/collection/actions", () => ({
  addBookAction: jest.fn().mockResolvedValue(null),
}));
import { addBookAction } from "@/app/collection/actions";
import { AddBookModal } from "@/app/collection/_components/add-book-modal";

const mockAdd = addBookAction as jest.Mock;

function getDialog(): HTMLDialogElement {
  return screen.getByRole("dialog", { hidden: true }) as HTMLDialogElement;
}

describe("AddBookModal", () => {
  beforeEach(() => {
    mockAdd.mockClear();
    mockAdd.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("keeps the dialog closed until the trigger is clicked", () => {
    // given / when
    render(<AddBookModal />);

    // then
    expect(getDialog().open).toBe(false);
  });

  it("opens the dialog when the trigger is clicked", async () => {
    // given
    const user = userEvent.setup();
    render(<AddBookModal />);

    // when
    await user.click(screen.getByRole("button", { name: "Add book" }));

    // then
    expect(getDialog().open).toBe(true);
  });

  it("closes the dialog after a successful save", async () => {
    // given
    const user = userEvent.setup();
    render(<AddBookModal />);
    await user.click(screen.getByRole("button", { name: "Add book" }));
    await user.type(screen.getByLabelText("Title"), "Solaris");
    await user.type(screen.getByLabelText("Author"), "Stanisław Lem");

    // when
    await user.click(screen.getByRole("button", { name: "Add" }));

    // then
    // The close lands a render after the action settles: the success hook runs
    // in an effect, which then flips the open state the dialog effect reads.
    await waitFor(() => expect(getDialog().open).toBe(false));
  });

  it("keeps the dialog open when the action returns an error", async () => {
    // given
    const user = userEvent.setup();
    mockAdd.mockResolvedValue(
      "You already have a book with this title and author."
    );
    render(<AddBookModal />);
    await user.click(screen.getByRole("button", { name: "Add book" }));
    await user.type(screen.getByLabelText("Title"), "Solaris");
    await user.type(screen.getByLabelText("Author"), "Stanisław Lem");

    // when
    await user.click(screen.getByRole("button", { name: "Add" }));

    // then
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(getDialog().open).toBe(true);
  });

  it("dismisses an untouched dialog without prompting", async () => {
    // given
    const user = userEvent.setup();
    const confirmSpy = jest.spyOn(window, "confirm");
    render(<AddBookModal />);
    await user.click(screen.getByRole("button", { name: "Add book" }));

    // when
    pressEscape(getDialog());

    // then
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(getDialog().open).toBe(false);
  });

  it("keeps a dirty dialog open when the discard prompt is declined", async () => {
    // given
    const user = userEvent.setup();
    jest.spyOn(window, "confirm").mockReturnValue(false);
    render(<AddBookModal />);
    await user.click(screen.getByRole("button", { name: "Add book" }));
    await user.type(screen.getByLabelText("Title"), "Sola");

    // when
    pressEscape(getDialog());

    // then
    expect(getDialog().open).toBe(true);
  });

  it("discards a dirty dialog when the prompt is accepted", async () => {
    // given
    const user = userEvent.setup();
    jest.spyOn(window, "confirm").mockReturnValue(true);
    render(<AddBookModal />);
    await user.click(screen.getByRole("button", { name: "Add book" }));
    await user.type(screen.getByLabelText("Title"), "Sola");

    // when
    pressEscape(getDialog());

    // then
    expect(getDialog().open).toBe(false);
  });

  it("starts empty when reopened after a discard", async () => {
    // given
    const user = userEvent.setup();
    jest.spyOn(window, "confirm").mockReturnValue(true);
    render(<AddBookModal />);
    await user.click(screen.getByRole("button", { name: "Add book" }));
    await user.type(screen.getByLabelText("Title"), "Sola");
    pressEscape(getDialog());

    // when
    await user.click(screen.getByRole("button", { name: "Add book" }));

    // then
    expect(screen.getByLabelText("Title")).toHaveValue("");
  });
});
