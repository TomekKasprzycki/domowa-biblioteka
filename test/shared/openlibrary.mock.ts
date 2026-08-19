/**
 * Stub for global.fetch, so gateway specs can drive every upstream Open
 * Library response shape without a real HTTP dependency (msw is deliberately
 * deferred, see context/foundation/lessons.md). Consumers own setup/teardown:
 * call installFetchStub() in beforeEach/afterEach of their own spec.
 */

export function installFetchStub(): jest.SpyInstance {
  return jest.spyOn(global, "fetch");
}

export function jsonResponse(body: unknown, init?: { status?: number }): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { "content-type": "application/json" },
  });
}

export const foundWithAuthorFixture = (isbn: string) => ({
  [`ISBN:${isbn}`]: {
    title: "Fantastic Mr. Fox",
    authors: [{ name: "Roald Dahl", url: "https://openlibrary.org/authors/OL34184A" }],
  },
});

export const foundWithoutAuthorFixture = (isbn: string) => ({
  [`ISBN:${isbn}`]: {
    title: "The three voices of poetry",
  },
});

export const notFoundFixture = {};

export function abortError(): DOMException {
  return new DOMException("The operation was aborted.", "AbortError");
}
