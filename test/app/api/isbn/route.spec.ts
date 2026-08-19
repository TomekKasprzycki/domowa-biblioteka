import { NextRequest } from "next/server";
import { GET } from "@/app/api/isbn/route";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/server/book/openlibrary.gateway", () => ({
  lookupByIsbn: jest.fn(),
}));

import { auth } from "@/auth";
import { lookupByIsbn } from "@/server/book/openlibrary.gateway";

const mockAuth = auth as jest.Mock;
const mockLookup = lookupByIsbn as jest.Mock;

function request(isbn: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/isbn?isbn=${encodeURIComponent(isbn)}`
  );
}

describe("GET /api/isbn", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockLookup.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    // given no signed-in user
    mockAuth.mockResolvedValue(null);

    // when requesting a lookup
    const response = await GET(request("9780140328721"));

    // then it is rejected before the gateway is called
    expect(response.status).toBe(401);
    expect(mockLookup).not.toHaveBeenCalled();
  });

  it("returns 400 for an ISBN with a broken check digit", async () => {
    // given a signed-in user and a malformed ISBN
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    // when requesting a lookup
    const response = await GET(request("9780140328722"));

    // then it is rejected before the gateway is called
    expect(response.status).toBe(400);
    expect(mockLookup).not.toHaveBeenCalled();
  });

  it("returns found: false when the gateway reports no match", async () => {
    // given a signed-in user and an ISBN the gateway can't find
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockLookup.mockResolvedValue(null);

    // when requesting a lookup
    const response = await GET(request("9780140328721"));
    const body = await response.json();

    // then the flat not-found shape comes back
    expect(response.status).toBe(200);
    expect(body).toEqual({ found: false });
  });

  it("returns found: true with title and author when the gateway hits", async () => {
    // given a signed-in user and an ISBN the gateway resolves
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockLookup.mockResolvedValue({ title: "Fantastic Mr. Fox", author: "Roald Dahl" });

    // when requesting a lookup
    const response = await GET(request("9780140328721"));
    const body = await response.json();

    // then the flat found shape comes back, with no other upstream fields
    expect(response.status).toBe(200);
    expect(body).toEqual({
      found: true,
      title: "Fantastic Mr. Fox",
      author: "Roald Dahl",
    });
  });
});
