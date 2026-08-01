import Link from "next/link";
import { auth, signOut } from "@/auth";
import {
  countIncomingRequests,
  countPendingReturns,
} from "@/server/loan/loan.repository";

// Nav renders from the root layout, so an unhandled rejection here would 500
// every page — including ones that otherwise need no database. The badges are
// decorative, so a failed count degrades to "no badge" rather than an error.
async function safeCount(
  label: string,
  load: () => Promise<number>
): Promise<number> {
  try {
    return await load();
  } catch (error) {
    console.error(`Failed to load ${label} for nav badge`, error);
    return 0;
  }
}

export default async function Nav() {
  const session = await auth();
  const userId = session?.user?.id;
  // Two counts, not one total: a borrow request and a pending return need
  // different actions from the owner, and a return left unconfirmed keeps a
  // book locked indefinitely — so it must be distinguishable before clicking.
  const [pendingRequestCount, pendingReturnCount] = userId
    ? await Promise.all([
        safeCount("pending request count", () => countIncomingRequests(userId)),
        safeCount("pending return count", () => countPendingReturns(userId)),
      ])
    : [0, 0];

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
                <span
                  aria-label={`${pendingRequestCount} borrow requests awaiting your response`}
                  className="ml-1 inline-flex items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-semibold text-white"
                >
                  {pendingRequestCount}
                </span>
              )}
              {pendingReturnCount > 0 && (
                <span
                  aria-label={`${pendingReturnCount} returns awaiting your confirmation`}
                  className="ml-1 inline-flex items-center justify-center rounded-full bg-emerald-600 px-1.5 py-0.5 text-xs font-semibold text-white"
                >
                  {pendingReturnCount}
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
