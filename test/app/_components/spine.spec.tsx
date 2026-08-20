/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Spine } from "@/app/_components/spine";

describe("Spine", () => {
  it("renders as a button with a combined title/author aria-label", () => {
    // given / when
    render(
      <Spine title="Solaris" author="Stanisław Lem" onClick={jest.fn()} />
    );

    // then
    expect(
      screen.getByRole("button", { name: "View Solaris, Stanisław Lem" })
    ).toBeInTheDocument();
  });

  it("fires onClick when pressed", async () => {
    // given
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(<Spine title="Solaris" author="Stanisław Lem" onClick={onClick} />);

    // when
    await user.click(screen.getByRole("button"));

    // then
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders the tag when provided", () => {
    // given / when
    render(
      <Spine
        title="Rok 1984"
        author="George Orwell"
        tag="On loan"
        onClick={jest.fn()}
      />
    );

    // then
    expect(screen.getByText("On loan")).toBeInTheDocument();
  });

  it("omits the tag when not provided", () => {
    // given / when
    render(
      <Spine title="Rok 1984" author="George Orwell" onClick={jest.fn()} />
    );

    // then
    expect(screen.queryByText("On loan")).not.toBeInTheDocument();
  });

  it("gives the same title the same rendered style across renders", () => {
    // given
    const { container: first } = render(
      <Spine title="Cyberiada" author="Stanisław Lem" onClick={jest.fn()} />
    );
    const firstButton = first.querySelector("button");

    // when
    const { container: second } = render(
      <Spine title="Cyberiada" author="Stanisław Lem" onClick={jest.fn()} />
    );
    const secondButton = second.querySelector("button");

    // then
    expect(firstButton?.style.background).toBe(secondButton?.style.background);
    expect(firstButton?.style.height).toBe(secondButton?.style.height);
    expect(firstButton?.style.width).toBe(secondButton?.style.width);
  });
});
