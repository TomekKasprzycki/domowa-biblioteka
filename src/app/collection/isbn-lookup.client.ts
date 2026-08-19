import type { IsbnLookupResult } from "@/app/collection/collection.types";

export async function lookupIsbn(raw: string): Promise<IsbnLookupResult> {
  let response: Response;
  try {
    response = await fetch(`/api/isbn?isbn=${encodeURIComponent(raw)}`);
  } catch {
    return { status: "not-found" };
  }

  // Middleware redirects a signed-out or session-expired request to the
  // /login HTML page rather than letting it reach the route handler; fetch
  // follows that redirect and hands back a 200 full of HTML, so neither the
  // status code nor response.ok reveals what happened — only these two do.
  if (response.redirected) {
    return { status: "unauthenticated" };
  }

  let body: { found: boolean; title?: string; author?: string | null };
  try {
    body = await response.json();
  } catch {
    // Not a redirect, so this isn't the /login-page shape — an unexpected
    // non-JSON 200 from somewhere else in the stack (e.g. a proxy).
    return { status: "error" };
  }

  if (!body.found) {
    return { status: "not-found" };
  }

  return {
    status: "found",
    title: body.title ?? "",
    author: body.author ?? null,
  };
}
