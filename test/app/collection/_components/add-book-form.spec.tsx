/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/app/collection/actions", () => ({
  addBookAction: jest.fn().mockResolvedValue(null),
}));
import { addBookAction } from "@/app/collection/actions";
import { AddBookForm } from "@/app/collection/_components/add-book-form";

const mockAdd = addBookAction as jest.Mock;

describe("AddBookForm", () => {
  beforeEach(() => {
    mockAdd.mockClear();
    mockAdd.mockResolvedValue(null);
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
});
