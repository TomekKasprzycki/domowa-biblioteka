import { lookupIsbn } from "@/app/(app)/collection/isbn-lookup.client";

describe("lookupIsbn", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("maps a found body to the found variant", async () => {
    // given a 200 body reporting a hit
    global.fetch = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ found: true, title: "Fantastic Mr. Fox", author: "Roald Dahl" }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    // when looking up an ISBN
    const result = await lookupIsbn("9780140328721");

    // then it maps to the found variant
    expect(result).toEqual({
      status: "found",
      title: "Fantastic Mr. Fox",
      author: "Roald Dahl",
    });
  });

  it("maps a found: false body to the not-found variant", async () => {
    // given a 200 body reporting a miss
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ found: false }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

    // when looking up an ISBN
    const result = await lookupIsbn("9999999999999");

    // then it maps to the not-found variant
    expect(result).toEqual({ status: "not-found" });
  });

  it("maps a redirected response to the unauthenticated variant", async () => {
    // given a response that followed the middleware's /login redirect
    const response = new Response("<html>login</html>", {
      status: 200,
      headers: { "content-type": "text/html" },
    });
    Object.defineProperty(response, "redirected", { value: true });
    global.fetch = jest.fn().mockResolvedValue(response);

    // when looking up an ISBN
    const result = await lookupIsbn("9780140328721");

    // then it maps to the unauthenticated variant
    expect(result).toEqual({ status: "unauthenticated" });
  });

  it("maps a non-redirected unparseable body to the error variant", async () => {
    // given a 200 response whose body is not JSON, and not a login redirect
    global.fetch = jest.fn().mockResolvedValue(
      new Response("<html>not json</html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      })
    );

    // when looking up an ISBN
    const result = await lookupIsbn("9780140328721");

    // then it maps to the error variant, not unauthenticated
    expect(result).toEqual({ status: "error" });
  });

  it("maps a network error to the not-found variant", async () => {
    // given a fetch that rejects
    global.fetch = jest.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    // when looking up an ISBN
    const result = await lookupIsbn("9780140328721");

    // then it degrades to not-found rather than throwing
    expect(result).toEqual({ status: "not-found" });
  });
});
