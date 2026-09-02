/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { pressEscape } from "../../../../shared/dialog.mock";

jest.mock("@/app/(app)/collection/actions", () => ({
  addBookAction: jest.fn().mockResolvedValue(null),
}));
jest.mock("@/app/(app)/collection/isbn-lookup.client", () => ({
  lookupIsbn: jest.fn(),
}));
import { addBookAction } from "@/app/(app)/collection/actions";
import { lookupIsbn } from "@/app/(app)/collection/isbn-lookup.client";
import { AddBookModal } from "@/app/(app)/collection/_components/add-book-modal";

const mockAdd = addBookAction as jest.Mock;
const mockLookup = lookupIsbn as jest.Mock;

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

describe("AddBookModal", () => {
  beforeEach(() => {
    mockAdd.mockClear();
    mockAdd.mockResolvedValue(null);
    mockLookup.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("keeps the dialog closed until the trigger is clicked", () => {
    // given / when
    render(<AddBookModal />);

    // then
    expect(getDialog("Add book").open).toBe(false);
  });

  it("opens the dialog when the trigger is clicked", async () => {
    // given
    const user = userEvent.setup();
    render(<AddBookModal />);

    // when
    await user.click(screen.getByRole("button", { name: "Add book" }));

    // then
    expect(getDialog("Add book").open).toBe(true);
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
    await waitFor(() => expect(getDialog("Add book").open).toBe(false));
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
    expect(getDialog("Add book").open).toBe(true);
  });

  it("dismisses an untouched dialog without prompting", async () => {
    // given
    const user = userEvent.setup();
    render(<AddBookModal />);
    await user.click(screen.getByRole("button", { name: "Add book" }));

    // when
    act(() => {
      pressEscape(getDialog("Add book"));
    });

    // then
    expect(getDialog("Discard book").open).toBe(false);
    expect(getDialog("Add book").open).toBe(false);
  });

  it("opens a discard-confirm modal for a dirty dialog, keeping the Add dialog open", async () => {
    // given
    const user = userEvent.setup();
    render(<AddBookModal />);
    await user.click(screen.getByRole("button", { name: "Add book" }));
    await user.type(screen.getByLabelText("Title"), "Sola");

    // when
    act(() => {
      pressEscape(getDialog("Add book"));
    });

    // then
    expect(getDialog("Add book").open).toBe(true);
    expect(getDialog("Discard book").open).toBe(true);
  });

  it("keeps the Add dialog open when the discard confirm is cancelled", async () => {
    // given
    const user = userEvent.setup();
    render(<AddBookModal />);
    await user.click(screen.getByRole("button", { name: "Add book" }));
    await user.type(screen.getByLabelText("Title"), "Sola");
    act(() => {
      pressEscape(getDialog("Add book"));
    });

    // when
    await user.click(
      within(getDialog("Discard book")).getByRole("button", {
        name: "Anuluj",
      })
    );

    // then
    expect(getDialog("Add book").open).toBe(true);
    expect(getDialog("Discard book").open).toBe(false);
  });

  it("discards a dirty dialog when the discard confirm is accepted", async () => {
    // given
    const user = userEvent.setup();
    render(<AddBookModal />);
    await user.click(screen.getByRole("button", { name: "Add book" }));
    await user.type(screen.getByLabelText("Title"), "Sola");
    act(() => {
      pressEscape(getDialog("Add book"));
    });

    // when
    await user.click(
      within(getDialog("Discard book")).getByRole("button", {
        name: "Discard",
      })
    );

    // then
    expect(getDialog("Add book").open).toBe(false);
  });

  it("starts empty when reopened after a discard", async () => {
    // given
    const user = userEvent.setup();
    render(<AddBookModal />);
    await user.click(screen.getByRole("button", { name: "Add book" }));
    await user.type(screen.getByLabelText("Title"), "Sola");
    act(() => {
      pressEscape(getDialog("Add book"));
    });
    await user.click(
      within(getDialog("Discard book")).getByRole("button", {
        name: "Discard",
      })
    );

    // when
    await user.click(screen.getByRole("button", { name: "Add book" }));

    // then
    expect(screen.getByLabelText("Title")).toHaveValue("");
  });

  it("closes without prompting when every field is cleared, even with the confirmation checkbox rendered", async () => {
    // given a successful lookup that renders the checkbox, then every field
    // cleared back to empty by hand — this is the case that discriminates a
    // working isDirty from a permanently-true one, since the checkbox's
    // .value is "on" regardless of checked state
    const user = userEvent.setup();
    mockLookup.mockResolvedValue({
      status: "found",
      title: "Solaris",
      author: "Stanisław Lem",
    });
    render(<AddBookModal />);
    await user.click(screen.getByRole("button", { name: "Add book" }));
    await user.type(screen.getByLabelText("ISBN (optional)"), "9780140328721");
    await user.click(screen.getByRole("button", { name: "Look up" }));
    await screen.findByRole("checkbox");
    await user.clear(screen.getByLabelText("ISBN (optional)"));
    await user.clear(screen.getByLabelText("Title"));
    await user.clear(screen.getByLabelText("Author"));

    // when
    act(() => {
      pressEscape(getDialog("Add book"));
    });

    // then
    expect(getDialog("Discard book").open).toBe(false);
    expect(getDialog("Add book").open).toBe(false);
  });

  it("prompts on Esc after a failed submit, since the retained values are now dirty", async () => {
    // given a failed submit whose typed values survive (React 19 would
    // otherwise blank an uncontrolled form here)
    const user = userEvent.setup();
    mockAdd.mockResolvedValue(
      "You already have a book with this title and author."
    );
    render(<AddBookModal />);
    await user.click(screen.getByRole("button", { name: "Add book" }));
    await user.type(screen.getByLabelText("Title"), "Solaris");
    await user.type(screen.getByLabelText("Author"), "Stanisław Lem");
    await user.click(screen.getByRole("button", { name: "Add" }));
    await screen.findByRole("alert");

    // when
    act(() => {
      pressEscape(getDialog("Add book"));
    });

    // then the retained values are dirty, so the discard-confirm modal opens
    expect(getDialog("Discard book").open).toBe(true);
  });
});
