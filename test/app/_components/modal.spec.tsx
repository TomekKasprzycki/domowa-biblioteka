/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { pressEscape } from "../../shared/dialog.mock";
import { Modal } from "@/app/_components/modal";

function getDialog(): HTMLDialogElement {
  return screen.getByRole("dialog", { hidden: true }) as HTMLDialogElement;
}

describe("Modal", () => {
  it("stays closed while open is false", () => {
    // given
    const onClose = jest.fn();

    // when
    render(
      <Modal open={false} onClose={onClose} title="Add book">
        <p>body</p>
      </Modal>
    );

    // then
    expect(getDialog().open).toBe(false);
  });

  it("opens the dialog when open becomes true", () => {
    // given
    const onClose = jest.fn();

    // when
    render(
      <Modal open onClose={onClose} title="Add book">
        <p>body</p>
      </Modal>
    );

    // then
    expect(getDialog().open).toBe(true);
  });

  it("labels the dialog with its title", () => {
    // given
    const onClose = jest.fn();

    // when
    render(
      <Modal open onClose={onClose} title="Add book">
        <p>body</p>
      </Modal>
    );

    // then
    expect(getDialog()).toHaveAccessibleName("Add book");
  });

  it("calls onClose when the backdrop is clicked", async () => {
    // given
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose} title="Add book">
        <p>body</p>
      </Modal>
    );

    // when
    await user.click(getDialog());

    // then
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ignores clicks on its content", async () => {
    // given
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose} title="Add book">
        <p>body</p>
      </Modal>
    );

    // when
    await user.click(screen.getByText("body"));

    // then
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose when Escape is pressed and no guard is set", () => {
    // given
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose} title="Add book">
        <p>body</p>
      </Modal>
    );

    // when
    pressEscape(getDialog());

    // then
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps the dialog open when the guard vetoes Escape", () => {
    // given
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose} title="Add book" canClose={() => false}>
        <p>body</p>
      </Modal>
    );

    // when
    pressEscape(getDialog());

    // then
    expect(getDialog().open).toBe(true);
  });

  it("keeps the dialog open when the guard vetoes a backdrop click", async () => {
    // given
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose} title="Add book" canClose={() => false}>
        <p>body</p>
      </Modal>
    );

    // when
    await user.click(getDialog());

    // then
    expect(onClose).not.toHaveBeenCalled();
  });
});
