const OPEN_LIBRARY_TIMEOUT_MS = 5000;

interface OpenLibraryRecord {
  title?: string;
  authors?: { name: string }[];
}

export async function lookupByIsbn(
  normalizedIsbn: string
): Promise<{ title: string; author: string | null } | null> {
  const bibkey = `ISBN:${normalizedIsbn}`;
  const url = `https://openlibrary.org/api/books?bibkeys=${encodeURIComponent(bibkey)}&format=json&jscmd=data`;

  const contact = process.env.OPENLIBRARY_CONTACT;
  const headers: Record<string, string> = contact
    ? { "User-Agent": `domowa-biblioteka (${contact})` }
    : {};

  let response: Response;
  try {
    response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(OPEN_LIBRARY_TIMEOUT_MS),
    });
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  let body: Record<string, OpenLibraryRecord>;
  try {
    body = await response.json();
  } catch {
    return null;
  }

  const record = body[bibkey];
  if (!record || typeof record !== "object") {
    return null;
  }

  const title = record.title;
  if (!title) {
    return null;
  }

  return {
    title,
    author: record.authors?.[0]?.name ?? null,
  };
}
