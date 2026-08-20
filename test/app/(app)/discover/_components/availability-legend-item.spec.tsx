/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { AvailabilityLegendItem } from "@/app/(app)/discover/_components/availability-legend-item";

describe("AvailabilityLegendItem", () => {
  it.each([
    ["available" as const, "Available"],
    ["unavailable" as const, "Unavailable"],
  ])("renders its children for the %s tone", (tone, label) => {
    // given / when
    render(<AvailabilityLegendItem tone={tone}>{label}</AvailabilityLegendItem>);

    // then
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
