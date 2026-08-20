/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "../../shared/dialog.mock";
import { Drawer } from "@/app/_components/drawer";

function getDialog(): HTMLDialogElement {
  return screen.getByRole("dialog", { hidden: true }) as HTMLDialogElement;
}

describe("Drawer", () => {
  it("renders the title and author", () => {
    // given / when
    render(
      <Drawer
        open
        onClose={jest.fn()}
        spineColor="#17402C"
        title="Solaris"
        author="Stanisław Lem"
        isbn="978-83-08-07725-4"
      />
    );

    // then
    expect(screen.getByText("Solaris")).toBeInTheDocument();
    expect(screen.getByText("Stanisław Lem")).toBeInTheDocument();
  });

  it("renders the ISBN when present", () => {
    // given / when
    render(
      <Drawer
        open
        onClose={jest.fn()}
        spineColor="#17402C"
        title="Solaris"
        author="Stanisław Lem"
        isbn="978-83-08-07725-4"
      />
    );

    // then
    expect(screen.getByText("ISBN 978-83-08-07725-4")).toBeInTheDocument();
  });

  it("renders the added-manually note when ISBN is missing", () => {
    // given / when
    render(
      <Drawer
        open
        onClose={jest.fn()}
        spineColor="#17402C"
        title="Ferdydurke"
        author="Witold Gombrowicz"
        isbn={null}
      />
    );

    // then
    expect(
      screen.getByText("No ISBN — added manually")
    ).toBeInTheDocument();
  });

  it("renders the status slot when provided", () => {
    // given / when
    render(
      <Drawer
        open
        onClose={jest.fn()}
        spineColor="#17402C"
        title="Solaris"
        author="Stanisław Lem"
        isbn={null}
        statusSlot={<span>Available</span>}
      />
    );

    // then
    expect(screen.getByText("Available")).toBeInTheDocument();
  });

  it("omits the status slot when absent", () => {
    // given / when
    render(
      <Drawer
        open
        onClose={jest.fn()}
        spineColor="#17402C"
        title="Solaris"
        author="Stanisław Lem"
        isbn={null}
      />
    );

    // then
    expect(screen.queryByText("Available")).not.toBeInTheDocument();
  });

  it("renders the actions slot when provided", () => {
    // given / when
    render(
      <Drawer
        open
        onClose={jest.fn()}
        spineColor="#17402C"
        title="Solaris"
        author="Stanisław Lem"
        isbn={null}
        actionsSlot={<button>Borrow</button>}
      />
    );

    // then
    expect(screen.getByRole("button", { name: "Borrow" })).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", async () => {
    // given
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(
      <Drawer
        open
        onClose={onClose}
        spineColor="#17402C"
        title="Solaris"
        author="Stanisław Lem"
        isbn={null}
      />
    );

    // when
    await user.click(screen.getByRole("button", { name: "Close ✕" }));

    // then
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("opens the dialog when open is true", () => {
    // given / when
    render(
      <Drawer
        open
        onClose={jest.fn()}
        spineColor="#17402C"
        title="Solaris"
        author="Stanisław Lem"
        isbn={null}
      />
    );

    // then
    expect(getDialog().open).toBe(true);
  });

  it("stays closed while open is false", () => {
    // given / when
    render(
      <Drawer
        open={false}
        onClose={jest.fn()}
        spineColor="#17402C"
        title="Solaris"
        author="Stanisław Lem"
        isbn={null}
      />
    );

    // then
    expect(getDialog().open).toBe(false);
  });
});
