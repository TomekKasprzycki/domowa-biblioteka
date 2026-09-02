/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render } from "@testing-library/react";

jest.mock("@/app/login/actions", () => ({
  loginAction: jest.fn().mockResolvedValue(null),
}));

import LoginPage from "@/app/login/page";

describe("LoginPage", () => {
  it("defaults the callbackUrl to /collection when none is provided", async () => {
    // given
    const ui = await LoginPage({ searchParams: Promise.resolve({}) });

    // when
    const { container } = render(ui);
    const hidden = container.querySelector<HTMLInputElement>(
      'input[type="hidden"][name="callbackUrl"]'
    );

    // then
    expect(hidden).toHaveValue("/collection");
  });

  it("passes an explicit callbackUrl through unchanged", async () => {
    // given
    const ui = await LoginPage({
      searchParams: Promise.resolve({ callbackUrl: "/requests" }),
    });

    // when
    const { container } = render(ui);
    const hidden = container.querySelector<HTMLInputElement>(
      'input[type="hidden"][name="callbackUrl"]'
    );

    // then
    expect(hidden).toHaveValue("/requests");
  });
});
