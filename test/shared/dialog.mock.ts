/**
 * jsdom ships no implementation of the <dialog> modal API — calling
 * showModal() throws "Not implemented", which breaks every spec that renders a
 * Modal. Patch the prototype with enough behaviour for assertions to be
 * meaningful: toggle the `open` attribute, and dispatch the `close` event that
 * Modal relies on to sync React state.
 *
 * Import for side effects at the top of any spec that renders a dialog.
 */
function installDialogStub(): void {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };

  HTMLDialogElement.prototype.show = function show(this: HTMLDialogElement) {
    this.open = true;
  };

  HTMLDialogElement.prototype.close = function close(
    this: HTMLDialogElement,
    returnValue?: string
  ) {
    if (!this.open) return;
    this.open = false;
    if (returnValue !== undefined) {
      this.returnValue = returnValue;
    }
    this.dispatchEvent(new Event("close"));
  };
}

installDialogStub();

/**
 * Simulates the browser's Esc handling: fire the cancelable `cancel` event and
 * close only if nothing called preventDefault(). jsdom does not wire Esc to a
 * dialog at all, so specs covering the dirty-form guard need this.
 */
export function pressEscape(dialog: HTMLDialogElement): void {
  const cancelled = !dialog.dispatchEvent(
    new Event("cancel", { cancelable: true })
  );
  if (!cancelled) {
    dialog.close();
  }
}
