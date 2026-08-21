/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { Field } from "@/app/_components/field";

describe("Field", () => {
  it("renders a text input associated with its label by default", () => {
    // given / when
    render(<Field label="Title" id="title" />);

    // then
    const input = screen.getByLabelText("Title");
    expect(input.tagName).toBe("INPUT");
  });

  it("renders a textarea associated with its label when as is textarea", () => {
    // given / when
    render(<Field label="Notes" id="notes" as="textarea" />);

    // then
    const textarea = screen.getByLabelText("Notes");
    expect(textarea.tagName).toBe("TEXTAREA");
  });
});
