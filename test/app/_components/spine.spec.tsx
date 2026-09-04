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
      screen.getByRole("button", { name: "Zobacz: Solaris, Stanisław Lem" })
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

  it("folds the tag into the accessible name, since aria-label hides visible content from assistive tech", () => {
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
    expect(
      screen.getByRole("button", {
        name: "Zobacz: Rok 1984, George Orwell, On loan",
      })
    ).toBeInTheDocument();
  });

  it("omits the tag when not provided", () => {
    // given / when
    render(
      <Spine title="Rok 1984" author="George Orwell" onClick={jest.fn()} />
    );

    // then
    expect(screen.queryByText("On loan")).not.toBeInTheDocument();
  });

  it("shows a title/author tooltip when no ISBN is given", () => {
    // given / when
    render(
      <Spine title="Solaris" author="Stanisław Lem" onClick={jest.fn()} />
    );

    // then
    expect(screen.getByRole("button")).toHaveAttribute(
      "title",
      "Solaris — Stanisław Lem"
    );
  });

  it("includes the ISBN in the tooltip when given", () => {
    // given / when
    render(
      <Spine
        title="Solaris"
        author="Stanisław Lem"
        isbn="978-83-08-07725-4"
        onClick={jest.fn()}
      />
    );

    // then
    expect(screen.getByRole("button")).toHaveAttribute(
      "title",
      "Solaris — Stanisław Lem · ISBN 978-83-08-07725-4"
    );
  });

  it("folds the owner into the accessible name and tooltip when given", () => {
    // given / when
    render(
      <Spine
        title="Solaris"
        author="Stanisław Lem"
        owner="Kasia"
        onClick={jest.fn()}
      />
    );

    // then
    expect(
      screen.getByRole("button", {
        name: "Zobacz: Solaris, Stanisław Lem, właściciel: Kasia",
      })
    ).toHaveAttribute("title", "Solaris — Stanisław Lem · właściciel: Kasia");
  });

  it("splits a long title into two columns, with ellipsis only on the second", () => {
    // given a title well past the 35-character 2-column threshold
    const longTitle =
      "Alpha Beta Gamma Delta Epsilon Zeta Eta Theta Iota Kappa Lambda Mu Nu Xi Omicron";

    // when
    const { container } = render(
      <Spine title={longTitle} author="Some Author" onClick={jest.fn()} />
    );
    const columns = container.querySelectorAll("button > span > span");

    // then
    expect(columns).toHaveLength(2);
    expect(columns[0].className).not.toContain("text-ellipsis");
    expect(columns[1].className).toContain("text-ellipsis");
  });

  it("renders a short title as a single column with ellipsis", () => {
    // given / when
    const { container } = render(
      <Spine title="Solaris" author="Stanisław Lem" onClick={jest.fn()} />
    );
    const columns = container.querySelectorAll("button > span > span");

    // then
    expect(columns).toHaveLength(1);
    expect(columns[0].className).toContain("text-ellipsis");
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
