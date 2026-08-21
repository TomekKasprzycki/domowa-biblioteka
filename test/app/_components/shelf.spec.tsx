/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { Shelf } from "@/app/_components/shelf";

describe("Shelf", () => {
  it("renders its children", () => {
    // given / when
    render(
      <Shelf>
        <button>Solaris</button>
        <button>Cyberiada</button>
      </Shelf>
    );

    // then
    expect(screen.getByRole("button", { name: "Solaris" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cyberiada" })
    ).toBeInTheDocument();
  });

  it("exposes itself as a list, excluding the decorative ledge", () => {
    // given / when
    render(
      <Shelf>
        <button>Solaris</button>
      </Shelf>
    );

    // then
    expect(screen.getByRole("list")).toBeInTheDocument();
  });
});
