import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { normalizeIsbn } from "@/lib/normalize-isbn.utils";
import { lookupByIsbn } from "@/server/book/openlibrary.gateway";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(null, { status: 401 });
  }

  const rawIsbn = request.nextUrl.searchParams.get("isbn") ?? "";
  const normalizedIsbn = normalizeIsbn(rawIsbn);
  if (!normalizedIsbn) {
    return NextResponse.json(null, { status: 400 });
  }

  const result = await lookupByIsbn(normalizedIsbn);
  if (!result) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json({
    found: true,
    title: result.title,
    author: result.author,
  });
}
