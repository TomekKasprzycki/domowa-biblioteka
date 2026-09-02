/**
 * jsdom implements no window.matchMedia at all. Patch in a controllable
 * stub: tests set the current match state per query via setMatchMedia() and
 * that both updates what a live mediaQuery.matches read returns and fires
 * any registered `change` listeners, simulating a viewport crossing a
 * breakpoint after mount.
 *
 * Import for side effects at the top of any spec whose component reads
 * window.matchMedia.
 */
type ChangeListener = (event: MediaQueryListEvent) => void;

const listenersByQuery = new Map<string, Set<ChangeListener>>();
const matchesByQuery = new Map<string, boolean>();

function installMatchMediaStub(): void {
  window.matchMedia = jest.fn((query: string) => {
    if (!matchesByQuery.has(query)) matchesByQuery.set(query, false);
    if (!listenersByQuery.has(query)) listenersByQuery.set(query, new Set());

    return {
      get matches() {
        return matchesByQuery.get(query) ?? false;
      },
      media: query,
      addEventListener: (_type: "change", listener: ChangeListener) => {
        listenersByQuery.get(query)!.add(listener);
      },
      removeEventListener: (_type: "change", listener: ChangeListener) => {
        listenersByQuery.get(query)!.delete(listener);
      },
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => true,
      onchange: null,
    } as unknown as MediaQueryList;
  }) as unknown as typeof window.matchMedia;
}

installMatchMediaStub();

/** Sets the current match state for a query and notifies registered listeners, simulating a resize across that query's breakpoint. */
export function setMatchMedia(query: string, matches: boolean): void {
  matchesByQuery.set(query, matches);
  const event = { matches, media: query } as MediaQueryListEvent;
  listenersByQuery.get(query)?.forEach((listener) => listener(event));
}

/** Resets all tracked queries/listeners — call between tests that use different queries or expect a clean slate. */
export function resetMatchMedia(): void {
  listenersByQuery.clear();
  matchesByQuery.clear();
}
