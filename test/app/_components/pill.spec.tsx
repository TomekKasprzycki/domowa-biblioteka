/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { Pill } from "@/app/_components/pill";

describe("Pill", () => {
  it.each([
    ["active" as const, "Confirmed"],
    ["pending" as const, "Pending"],
    ["mine" as const, "With you"],
  ])("renders its children for the %s tone", (tone, label) => {
    // given / when
    render(<Pill tone={tone}>{label}</Pill>);

    // then
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
