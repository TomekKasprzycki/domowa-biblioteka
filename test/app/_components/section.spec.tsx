/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Section } from "@/app/_components/section";

function getDetails(): HTMLDetailsElement {
  return screen.getByText("content").closest("details") as HTMLDetailsElement;
}

describe("Section", () => {
  it("renders the title as a heading", () => {
    // given / when
    render(
      <Section title="Received">
        <p>content</p>
      </Section>
    );

    // then
    expect(
      screen.getByRole("heading", { name: "Received" })
    ).toBeInTheDocument();
  });

  it("renders its children", () => {
    // given / when
    render(
      <Section title="Received">
        <p>content</p>
      </Section>
    );

    // then
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("is open by default", () => {
    // given / when
    render(
      <Section title="Received">
        <p>content</p>
      </Section>
    );

    // then
    expect(getDetails().open).toBe(true);
  });

  it("collapses when the heading is clicked", async () => {
    // given
    const user = userEvent.setup();
    render(
      <Section title="Received">
        <p>content</p>
      </Section>
    );

    // when
    await user.click(screen.getByRole("heading", { name: "Received" }));

    // then
    expect(getDetails().open).toBe(false);
  });

  it("respects defaultOpen=false", () => {
    // given / when
    render(
      <Section title="Received" defaultOpen={false}>
        <p>content</p>
      </Section>
    );

    // then
    expect(getDetails().open).toBe(false);
  });

  it("renders a plain, non-collapsible section when collapsible is false", () => {
    // given / when
    const { container } = render(
      <Section title="Received" collapsible={false}>
        <p>content</p>
      </Section>
    );

    // then
    expect(container.querySelector("details")).not.toBeInTheDocument();
    expect(container.querySelector("section")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Received" })
    ).toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
  });
});
