/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "../../shared/dialog.mock";
import { ConfirmModal } from "@/app/_components/confirm-modal";

function getDialog(): HTMLDialogElement {
  return screen.getByRole("dialog", { hidden: true }) as HTMLDialogElement;
}

describe("ConfirmModal", () => {
  it("stays closed while open is false", () => {
    // given / when
    render(
      <ConfirmModal
        open={false}
        title="Delete book"
        message='Delete "Solaris"?'
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    // then
    expect(getDialog().open).toBe(false);
  });

  it("opens the dialog and shows the title and message", () => {
    // given / when
    render(
      <ConfirmModal
        open
        title="Delete book"
        message='Delete "Solaris"?'
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    // then
    expect(getDialog().open).toBe(true);
    expect(getDialog()).toHaveAccessibleName("Delete book");
    expect(screen.getByText('Delete "Solaris"?')).toBeInTheDocument();
  });

  it("uses the default Confirm/Cancel labels when none are given", () => {
    // given / when
    render(
      <ConfirmModal
        open
        title="Delete book"
        message='Delete "Solaris"?'
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    // then
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("calls onConfirm when the confirm button is clicked", async () => {
    // given
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    render(
      <ConfirmModal
        open
        title="Delete book"
        message='Delete "Solaris"?'
        confirmLabel="Delete"
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />
    );

    // when
    await user.click(screen.getByRole("button", { name: "Delete" }));

    // then
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when the cancel button is clicked", async () => {
    // given
    const user = userEvent.setup();
    const onCancel = jest.fn();
    render(
      <ConfirmModal
        open
        title="Delete book"
        message='Delete "Solaris"?'
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />
    );

    // when
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    // then
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when the backdrop is clicked", async () => {
    // given
    const user = userEvent.setup();
    const onCancel = jest.fn();
    render(
      <ConfirmModal
        open
        title="Delete book"
        message='Delete "Solaris"?'
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />
    );

    // when
    await user.click(getDialog());

    // then
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
