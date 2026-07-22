import Link from "next/link";
import { auth, signOut } from "@/auth";
import { countIncomingRequests } from "@/server/loan/loan.repository";

// Nav renders from the root layout, so an unhandled rejection here would 500
// every page — including ones that otherwise need no database. The badge is
// decorative, so a failed count degrades to "no badge" rather than an error.
async function safePendingRequestCount(userId: string): Promise<number> {
  try {
    return await countIncomingRequests(userId);
  } catch (error) {
    console.error("Failed to load pending request count for nav badge", error);
    return 0;
  }
}

export default async function Nav() {
  const session = await auth();
  const pendingRequestCount = session?.user
    ? await safePendingRequestCount(session.user.id)
    : 0;

  return (
    <nav className="flex items-center justify-between px-6 py-3 bg-white border-b border-zinc-200">
      <Link href="/" className="text-sm font-semibold text-zinc-900">
        Domowa Biblioteka
      </Link>
      <div className="flex items-center gap-4">
        {session?.user ? (
          <>
            <Link
              href="/collection"
              className="text-sm font-medium text-zinc-900 hover:underline"
            >
              Collection
            </Link>
            <Link
              href="/discover"
              className="text-sm font-medium text-zinc-900 hover:underline"
            >
              Discover
            </Link>
            <Link
              href="/friends"
              className="text-sm font-medium text-zinc-900 hover:underline"
            >
              Friends
            </Link>
            <Link
              href="/requests"
              className="text-sm font-medium text-zinc-900 hover:underline"
            >
              Requests
              {pendingRequestCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                  {pendingRequestCount}
                </span>
              )}
            </Link>
            <Link
              href="/borrowing"
              className="text-sm font-medium text-zinc-900 hover:underline"
            >
              Borrowing
            </Link>
            <span className="text-sm text-zinc-600">
              {session.user.name ?? session.user.email}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="text-sm font-medium text-zinc-900 hover:underline"
              >
                Sign out
              </button>
            </form>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="text-sm font-medium text-zinc-900 hover:underline"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
