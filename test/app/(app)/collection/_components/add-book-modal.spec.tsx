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
    expect(getDialog("Dodaj książkę").open).toBe(false);
  });

  it("opens the dialog when the trigger is clicked", async () => {
    // given
    const user = userEvent.setup();
    render(<AddBookModal />);

    // when
    await user.click(screen.getByRole("button", { name: "Dodaj książkę" }));

    // then
    expect(getDialog("Dodaj książkę").open).toBe(true);
  });

  it("closes the dialog after a successful save", async () => {
    // given
    const user = userEvent.setup();
    render(<AddBookModal />);
    await user.click(screen.getByRole("button", { name: "Dodaj książkę" }));
    await user.type(screen.getByLabelText("Tytuł"), "Solaris");
    await user.type(screen.getByLabelText("Autor"), "Stanisław Lem");

    // when
    await user.click(screen.getByRole("button", { name: "Zapisz książkę" }));

    // then
    // The close lands a render after the action settles: the success hook runs
    // in an effect, which then flips the open state the dialog effect reads.
    await waitFor(() => expect(getDialog("Dodaj książkę").open).toBe(false));
  });

  it("keeps the dialog open when the action returns an error", async () => {
    // given
    const user = userEvent.setup();
    mockAdd.mockResolvedValue(
      "Masz już książkę o tym tytule i autorze."
    );
    render(<AddBookModal />);
    await user.click(screen.getByRole("button", { name: "Dodaj książkę" }));
    await user.type(screen.getByLabelText("Tytuł"), "Solaris");
    await user.type(screen.getByLabelText("Autor"), "Stanisław Lem");

    // when
    await user.click(screen.getByRole("button", { name: "Zapisz książkę" }));

    // then
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(getDialog("Dodaj książkę").open).toBe(true);
  });

  it("dismisses an untouched dialog without prompting", async () => {
    // given
    const user = userEvent.setup();
    render(<AddBookModal />);
    await user.click(screen.getByRole("button", { name: "Dodaj książkę" }));

    // when
    act(() => {
      pressEscape(getDialog("Dodaj książkę"));
    });

    // then
    expect(getDialog("Odrzuć książkę").open).toBe(false);
    expect(getDialog("Dodaj książkę").open).toBe(false);
  });

  it("opens a discard-confirm modal for a dirty dialog, keeping the Add dialog open", async () => {
    // given
    const user = userEvent.setup();
    render(<AddBookModal />);
    await user.click(screen.getByRole("button", { name: "Dodaj książkę" }));
    await user.type(screen.getByLabelText("Tytuł"), "Sola");

    // when
    act(() => {
      pressEscape(getDialog("Dodaj książkę"));
    });

    // then
    expect(getDialog("Dodaj książkę").open).toBe(true);
    expect(getDialog("Odrzuć książkę").open).toBe(true);
  });

  it("keeps the Add dialog open when the discard confirm is cancelled", async () => {
    // given
    const user = userEvent.setup();
    render(<AddBookModal />);
    await user.click(screen.getByRole("button", { name: "Dodaj książkę" }));
    await user.type(screen.getByLabelText("Tytuł"), "Sola");
    act(() => {
      pressEscape(getDialog("Dodaj książkę"));
    });

    // when
    await user.click(
      within(getDialog("Odrzuć książkę")).getByRole("button", {
        name: "Anuluj",
      })
    );

    // then
    expect(getDialog("Dodaj książkę").open).toBe(true);
    expect(getDialog("Odrzuć książkę").open).toBe(false);
  });

  it("discards a dirty dialog when the discard confirm is accepted", async () => {
    // given
    const user = userEvent.setup();
    render(<AddBookModal />);
    await user.click(screen.getByRole("button", { name: "Dodaj książkę" }));
    await user.type(screen.getByLabelText("Tytuł"), "Sola");
    act(() => {
      pressEscape(getDialog("Dodaj książkę"));
    });

    // when
    await user.click(
      within(getDialog("Odrzuć książkę")).getByRole("button", {
        name: "Odrzuć",
      })
    );

    // then
    expect(getDialog("Dodaj książkę").open).toBe(false);
  });

  it("starts empty when reopened after a discard", async () => {
    // given
    const user = userEvent.setup();
    render(<AddBookModal />);
    await user.click(screen.getByRole("button", { name: "Dodaj książkę" }));
    await user.type(screen.getByLabelText("Tytuł"), "Sola");
    act(() => {
      pressEscape(getDialog("Dodaj książkę"));
    });
    await user.click(
      within(getDialog("Odrzuć książkę")).getByRole("button", {
        name: "Odrzuć",
      })
    );

    // when
    await user.click(screen.getByRole("button", { name: "Dodaj książkę" }));

    // then
    expect(screen.getByLabelText("Tytuł")).toHaveValue("");
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
    await user.click(screen.getByRole("button", { name: "Dodaj książkę" }));
    await user.type(screen.getByLabelText("ISBN (opcjonalnie)"), "9780140328721");
    await user.click(screen.getByRole("button", { name: "Wyszukaj" }));
    await screen.findByRole("checkbox");
    await user.clear(screen.getByLabelText("ISBN (opcjonalnie)"));
    await user.clear(screen.getByLabelText("Tytuł"));
    await user.clear(screen.getByLabelText("Autor"));

    // when
    act(() => {
      pressEscape(getDialog("Dodaj książkę"));
    });

    // then
    expect(getDialog("Odrzuć książkę").open).toBe(false);
    expect(getDialog("Dodaj książkę").open).toBe(false);
  });

  it("prompts on Esc after a failed submit, since the retained values are now dirty", async () => {
    // given a failed submit whose typed values survive (React 19 would
    // otherwise blank an uncontrolled form here)
    const user = userEvent.setup();
    mockAdd.mockResolvedValue(
      "Masz już książkę o tym tytule i autorze."
    );
    render(<AddBookModal />);
    await user.click(screen.getByRole("button", { name: "Dodaj książkę" }));
    await user.type(screen.getByLabelText("Tytuł"), "Solaris");
    await user.type(screen.getByLabelText("Autor"), "Stanisław Lem");
    await user.click(screen.getByRole("button", { name: "Zapisz książkę" }));
    await screen.findByRole("alert");

    // when
    act(() => {
      pressEscape(getDialog("Dodaj książkę"));
    });

    // then the retained values are dirty, so the discard-confirm modal opens
    expect(getDialog("Odrzuć książkę").open).toBe(true);
  });
});
