import { lookupByIsbn } from "@/server/book/openlibrary.gateway";
import {
  installFetchStub,
  jsonResponse,
  foundWithAuthorFixture,
  foundWithoutAuthorFixture,
  notFoundFixture,
  abortError,
} from "../../shared/openlibrary.mock";

describe("lookupByIsbn", () => {
  let fetchSpy: jest.SpyInstance;
  const originalContact = process.env.OPENLIBRARY_CONTACT;

  beforeEach(() => {
    fetchSpy = installFetchStub();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    if (originalContact === undefined) {
      delete process.env.OPENLIBRARY_CONTACT;
    } else {
      process.env.OPENLIBRARY_CONTACT = originalContact;
    }
  });

  it("returns title and author for a record with an authors key", async () => {
    // given a record with authors
    const isbn = "9780140328721";
    fetchSpy.mockResolvedValue(jsonResponse(foundWithAuthorFixture(isbn)));

    // when looking it up
    const result = await lookupByIsbn(isbn);

    // then both fields come back
    expect(result).toEqual({ title: "Fantastic Mr. Fox", author: "Roald Dahl" });
  });

  it("returns a null author for a record with no authors key", async () => {
    // given a record with no authors key
    const isbn = "9780000000002";
    fetchSpy.mockResolvedValue(jsonResponse(foundWithoutAuthorFixture(isbn)));

    // when looking it up
    const result = await lookupByIsbn(isbn);

    // then the title fills and author is null
    expect(result).toEqual({
      title: "The three voices of poetry",
      author: null,
    });
  });

  it("returns null for a 200 response with an empty body", async () => {
    // given the upstream miss shape
    fetchSpy.mockResolvedValue(jsonResponse(notFoundFixture));

    // when looking it up
    const result = await lookupByIsbn("9999999999999");

    // then it is treated as not found
    expect(result).toBeNull();
  });

  it("returns null for a non-2xx response", async () => {
    // given an upstream error
    fetchSpy.mockResolvedValue(jsonResponse({}, { status: 500 }));

    // when looking it up
    const result = await lookupByIsbn("9780140328721");

    // then it degrades to not found rather than throwing
    expect(result).toBeNull();
  });

  it("returns null when the request aborts", async () => {
    // given a timeout/abort
    fetchSpy.mockRejectedValue(abortError());

    // when looking it up
    const result = await lookupByIsbn("9780140328721");

    // then it degrades to not found rather than throwing
    expect(result).toBeNull();
  });

  it("requests the exact normalized bibkey", async () => {
    // given a normalized ISBN
    const isbn = "9780140328721";
    fetchSpy.mockResolvedValue(jsonResponse(foundWithAuthorFixture(isbn)));

    // when looking it up
    await lookupByIsbn(isbn);

    // then the request URL carries that exact bibkey, URL-encoded
    const requestedUrl = fetchSpy.mock.calls[0][0] as string;
    expect(requestedUrl).toContain(
      `bibkeys=${encodeURIComponent(`ISBN:${isbn}`)}`
    );
  });

  it("sends a User-Agent header when OPENLIBRARY_CONTACT is set", async () => {
    // given a configured contact address
    process.env.OPENLIBRARY_CONTACT = "contact@example.org";
    const isbn = "9780140328721";
    fetchSpy.mockResolvedValue(jsonResponse(foundWithAuthorFixture(isbn)));

    // when looking it up
    await lookupByIsbn(isbn);

    // then the User-Agent header is present
    const requestInit = fetchSpy.mock.calls[0][1] as RequestInit;
    const headers = requestInit.headers as Record<string, string>;
    expect(headers["User-Agent"]).toBe(
      "domowa-biblioteka (contact@example.org)"
    );
  });

  it("omits the User-Agent header when OPENLIBRARY_CONTACT is unset", async () => {
    // given no configured contact address
    delete process.env.OPENLIBRARY_CONTACT;
    const isbn = "9780140328721";
    fetchSpy.mockResolvedValue(jsonResponse(foundWithAuthorFixture(isbn)));

    // when looking it up
    await lookupByIsbn(isbn);

    // then no User-Agent header is sent
    const requestInit = fetchSpy.mock.calls[0][1] as RequestInit;
    const headers = requestInit.headers as Record<string, string>;
    expect(headers["User-Agent"]).toBeUndefined();
  });
});
