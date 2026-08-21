/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

jest.mock("@/auth", () => ({ signOut: jest.fn() }));

const mockUsePathname = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

import { SidebarNav } from "@/app/_components/sidebar-nav";

describe("SidebarNav", () => {
  beforeEach(() => {
    mockUsePathname.mockReset();
  });

  it("marks the link matching the current route as active", () => {
    // given
    mockUsePathname.mockReturnValue("/friends");

    // when
    render(
      <SidebarNav pendingRequestCount={0} pendingReturnCount={0} />
    );

    // then
    expect(screen.getByRole("link", { name: /Friends/ })).toHaveClass(
      "bg-green-700"
    );
  });

  it("does not mark non-matching links as active", () => {
    // given
    mockUsePathname.mockReturnValue("/friends");

    // when
    render(
      <SidebarNav pendingRequestCount={0} pendingReturnCount={0} />
    );

    // then
    expect(screen.getByRole("link", { name: /Collection/ })).not.toHaveClass(
      "bg-green-700"
    );
  });

  it("renders the pending-request badge when the count is greater than zero", () => {
    // given
    mockUsePathname.mockReturnValue("/collection");

    // when
    render(
      <SidebarNav pendingRequestCount={4} pendingReturnCount={0} />
    );

    // then
    expect(
      screen.getByLabelText(/borrow requests awaiting your response/)
    ).toHaveTextContent("4");
  });

  it("renders the sign-out button", () => {
    // given
    mockUsePathname.mockReturnValue("/collection");

    // when
    render(
      <SidebarNav pendingRequestCount={0} pendingReturnCount={0} />
    );

    // then
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });
});
