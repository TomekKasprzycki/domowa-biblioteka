import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="flex flex-col items-center gap-6 text-center max-w-md">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Domowa Biblioteka
        </h1>

        {session?.user ? (
          <>
            <p className="text-lg text-zinc-600">
              Welcome back, {session.user.name ?? session.user.email}.
            </p>
            <a
              href="/collection"
              className="text-sm font-medium text-zinc-900 underline"
            >
              Go to your collection
            </a>
          </>
        ) : (
          <>
            <p className="text-lg text-zinc-600">
              Browse your friends&apos; bookshelves and borrow without the
              awkward ask.
            </p>
            <div className="flex flex-col gap-3 w-full sm:flex-row sm:justify-center">
              <a
                href="/register"
                className="rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
              >
                Create account
              </a>
              <a
                href="/login"
                className="rounded-full border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50"
              >
                Sign in
              </a>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
