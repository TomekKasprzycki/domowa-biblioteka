/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/app/(app)/collection/actions", () => ({
  addBookAction: jest.fn().mockResolvedValue(null),
}));
jest.mock("@/app/(app)/collection/isbn-lookup.client", () => ({
  lookupIsbn: jest.fn(),
}));
import { addBookAction } from "@/app/(app)/collection/actions";
import { lookupIsbn } from "@/app/(app)/collection/isbn-lookup.client";
import { AddBookForm } from "@/app/(app)/collection/_components/add-book-form";

const mockAdd = addBookAction as jest.Mock;
const mockLookup = lookupIsbn as jest.Mock;

describe("AddBookForm", () => {
  beforeEach(() => {
    mockAdd.mockClear();
    mockAdd.mockResolvedValue(null);
    mockLookup.mockReset();
  });

  it("renders the title, author and notes fields", () => {
    // given
    const onSaved = jest.fn();
    const onCancel = jest.fn();

    // when
    render(<AddBookForm onSaved={onSaved} onCancel={onCancel} />);

    // then
    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Author")).toBeInTheDocument();
    expect(screen.getByLabelText("Notes (optional)")).toBeInTheDocument();
  });

  it("submits the entered book to addBookAction", async () => {
    // given
    const user = userEvent.setup();
    render(<AddBookForm onSaved={jest.fn()} onCancel={jest.fn()} />);
    await user.type(screen.getByLabelText("Title"), "Solaris");
    await user.type(screen.getByLabelText("Author"), "Stanisław Lem");

    // when
    await user.click(screen.getByRole("button", { name: "Add" }));

    // then
    const formData = mockAdd.mock.calls[0][1] as FormData;
    expect(formData.get("title")).toBe("Solaris");
    expect(formData.get("author")).toBe("Stanisław Lem");
  });

  it("calls onSaved once the action resolves without an error", async () => {
    // given
    const user = userEvent.setup();
    const onSaved = jest.fn();
    render(<AddBookForm onSaved={onSaved} onCancel={jest.fn()} />);
    await user.type(screen.getByLabelText("Title"), "Solaris");
    await user.type(screen.getByLabelText("Author"), "Stanisław Lem");

    // when
    await user.click(screen.getByRole("button", { name: "Add" }));

    // then
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it("shows the error and does not call onSaved when the action fails", async () => {
    // given
    const user = userEvent.setup();
    const onSaved = jest.fn();
    mockAdd.mockResolvedValue(
      "You already have a book with this title and author."
    );
    render(<AddBookForm onSaved={onSaved} onCancel={jest.fn()} />);
    await user.type(screen.getByLabelText("Title"), "Solaris");
    await user.type(screen.getByLabelText("Author"), "Stanisław Lem");

    // when
    await user.click(screen.getByRole("button", { name: "Add" }));

    // then
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You already have a book with this title and author."
    );
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("calls onCancel when Cancel is clicked", async () => {
    // given
    const user = userEvent.setup();
    const onCancel = jest.fn();
    render(<AddBookForm onSaved={jest.fn()} onCancel={onCancel} />);

    // when
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    // then
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("fills title and author from a successful lookup", async () => {
    // given a lookup that resolves with both fields
    const user = userEvent.setup();
    mockLookup.mockResolvedValue({
      status: "found",
      title: "Fantastic Mr. Fox",
      author: "Roald Dahl",
    });
    render(<AddBookForm onSaved={jest.fn()} onCancel={jest.fn()} />);
    await user.type(screen.getByLabelText("ISBN (optional)"), "9780140328721");

    // when
    await user.click(screen.getByRole("button", { name: "Look up" }));

    // then
    expect(await screen.findByLabelText("Title")).toHaveValue(
      "Fantastic Mr. Fox"
    );
    expect(screen.getByLabelText("Author")).toHaveValue("Roald Dahl");
  });

  it("fills only the title when the lookup returns no author", async () => {
    // given a lookup that resolves with a null author
    const user = userEvent.setup();
    mockLookup.mockResolvedValue({
      status: "found",
      title: "The three voices of poetry",
      author: null,
    });
    render(<AddBookForm onSaved={jest.fn()} onCancel={jest.fn()} />);
    await user.type(screen.getByLabelText("ISBN (optional)"), "9780140328721");

    // when
    await user.click(screen.getByRole("button", { name: "Look up" }));

    // then
    expect(await screen.findByLabelText("Title")).toHaveValue(
      "The three voices of poetry"
    );
    expect(screen.getByLabelText("Author")).toHaveValue("");
  });

  it("shows the searching state while the lookup is pending", async () => {
    // given a lookup that has not resolved yet
    const user = userEvent.setup();
    let resolveLookup: (value: unknown) => void = () => {};
    mockLookup.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLookup = resolve;
        })
    );
    render(<AddBookForm onSaved={jest.fn()} onCancel={jest.fn()} />);
    await user.type(screen.getByLabelText("ISBN (optional)"), "9780140328721");

    // when
    await user.click(screen.getByRole("button", { name: "Look up" }));

    // then
    expect(screen.getByRole("status")).toHaveTextContent(
      "Searching Open Library…"
    );

    // cleanup: resolve so the pending promise doesn't leak into other tests
    resolveLookup({ status: "found", title: "Solaris", author: "Lem" });
  });

  it("shows the session-expired message for an unauthenticated result, not not-found", async () => {
    // given a lookup that resolves as unauthenticated
    const user = userEvent.setup();
    mockLookup.mockResolvedValue({ status: "unauthenticated" });
    render(<AddBookForm onSaved={jest.fn()} onCancel={jest.fn()} />);
    await user.type(screen.getByLabelText("ISBN (optional)"), "9780140328721");

    // when
    await user.click(screen.getByRole("button", { name: "Look up" }));

    // then
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Your session has expired. Reload and sign in to look up an ISBN."
    );
    expect(screen.getByRole("status")).not.toHaveTextContent("Not found");
  });

  it("shows a generic error message for an error result, not not-found or session-expired", async () => {
    // given a lookup that resolves as a generic error
    const user = userEvent.setup();
    mockLookup.mockResolvedValue({ status: "error" });
    render(<AddBookForm onSaved={jest.fn()} onCancel={jest.fn()} />);
    await user.type(screen.getByLabelText("ISBN (optional)"), "9780140328721");

    // when
    await user.click(screen.getByRole("button", { name: "Look up" }));

    // then
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Something went wrong. Type the details in manually."
    );
    expect(screen.getByRole("status")).not.toHaveTextContent("session has expired");
    expect(screen.getByLabelText("Title")).toBeEnabled();
  });

  it("blocks submit until the confirmation checkbox is ticked after a lookup", async () => {
    // given a successful lookup
    const user = userEvent.setup();
    mockLookup.mockResolvedValue({
      status: "found",
      title: "Solaris",
      author: "Stanisław Lem",
    });
    render(<AddBookForm onSaved={jest.fn()} onCancel={jest.fn()} />);
    await user.type(screen.getByLabelText("ISBN (optional)"), "9780140328721");
    await user.click(screen.getByRole("button", { name: "Look up" }));
    await screen.findByDisplayValue("Solaris");

    // when / then: submit is disabled before confirmation
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();

    // when the checkbox is ticked
    await user.click(
      screen.getByRole("checkbox", {
        name: "This is the right book — title and author are correct.",
      })
    );

    // then submit becomes enabled
    expect(screen.getByRole("button", { name: "Add" })).toBeEnabled();
  });

  it("submits a manually typed book in one step with no checkbox present", async () => {
    // given a book typed in entirely by hand
    const user = userEvent.setup();
    render(<AddBookForm onSaved={jest.fn()} onCancel={jest.fn()} />);
    await user.type(screen.getByLabelText("Title"), "Solaris");
    await user.type(screen.getByLabelText("Author"), "Stanisław Lem");

    // when / then no checkbox renders and submit is already enabled
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeEnabled();

    // and the book still submits normally
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(mockAdd).toHaveBeenCalledTimes(1);
  });

  it("leaves the fields untouched and the form usable after a not-found result", async () => {
    // given a lookup that resolves as not found
    const user = userEvent.setup();
    mockLookup.mockResolvedValue({ status: "not-found" });
    render(<AddBookForm onSaved={jest.fn()} onCancel={jest.fn()} />);
    await user.type(screen.getByLabelText("ISBN (optional)"), "9780140328721");

    // when
    await user.click(screen.getByRole("button", { name: "Look up" }));

    // then the fields stay empty, no checkbox appears, and the form still works
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Not found. Type the details in manually."
    );
    expect(screen.getByLabelText("Title")).toHaveValue("");
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeEnabled();
  });

  it("includes the ISBN in the submitted FormData", async () => {
    // given a book with an ISBN typed in
    const user = userEvent.setup();
    render(<AddBookForm onSaved={jest.fn()} onCancel={jest.fn()} />);
    await user.type(screen.getByLabelText("ISBN (optional)"), "9780140328721");
    await user.type(screen.getByLabelText("Title"), "Solaris");
    await user.type(screen.getByLabelText("Author"), "Stanisław Lem");

    // when
    await user.click(screen.getByRole("button", { name: "Add" }));

    // then
    const formData = mockAdd.mock.calls[0][1] as FormData;
    expect(formData.get("isbn")).toBe("9780140328721");
  });

  it("keeps typed title and author in the fields after the action returns an error", async () => {
    // given an action that rejects with a duplicate error
    const user = userEvent.setup();
    mockAdd.mockResolvedValue(
      "You already have a book with this title and author."
    );
    render(<AddBookForm onSaved={jest.fn()} onCancel={jest.fn()} />);
    await user.type(screen.getByLabelText("Title"), "Solaris");
    await user.type(screen.getByLabelText("Author"), "Stanisław Lem");

    // when
    await user.click(screen.getByRole("button", { name: "Add" }));
    await screen.findByRole("alert");

    // then the typed values survive the failed submit (React 19 would
    // otherwise blank an uncontrolled form's fields here)
    expect(screen.getByLabelText("Title")).toHaveValue("Solaris");
    expect(screen.getByLabelText("Author")).toHaveValue("Stanisław Lem");
  });
});
