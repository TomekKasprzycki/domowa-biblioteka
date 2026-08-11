/** @jest-environment jsdom */
import { renderHook } from "@testing-library/react";
import { useActionSuccess } from "@/lib/use-action-success.utils";

describe("useActionSuccess", () => {
  it("does not fire on initial mount", () => {
    // given
    const onSuccess = jest.fn();

    // when
    renderHook(() => useActionSuccess(false, null, onSuccess));

    // then
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("fires when a pending action settles with no error", () => {
    // given
    const onSuccess = jest.fn();
    const { rerender } = renderHook(
      ({ isPending }: { isPending: boolean }) =>
        useActionSuccess(isPending, null, onSuccess),
      { initialProps: { isPending: true } }
    );

    // when
    rerender({ isPending: false });

    // then
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("does not fire when the settled action returned an error", () => {
    // given
    const onSuccess = jest.fn();
    const { rerender } = renderHook(
      ({ isPending, error }: { isPending: boolean; error: string | null }) =>
        useActionSuccess(isPending, error, onSuccess),
      { initialProps: { isPending: true, error: null as string | null } }
    );

    // when
    rerender({ isPending: false, error: "Title is required" });

    // then
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("does not fire while the action is still pending", () => {
    // given
    const onSuccess = jest.fn();
    const { rerender } = renderHook(
      ({ isPending }: { isPending: boolean }) =>
        useActionSuccess(isPending, null, onSuccess),
      { initialProps: { isPending: false } }
    );

    // when
    rerender({ isPending: true });

    // then
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
