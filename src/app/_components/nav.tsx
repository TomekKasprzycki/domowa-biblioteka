import Link from "next/link";
import { auth, signOut } from "@/auth";

export default async function Nav() {
  const session = await auth();

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
              href="/friends"
              className="text-sm font-medium text-zinc-900 hover:underline"
            >
              Friends
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
