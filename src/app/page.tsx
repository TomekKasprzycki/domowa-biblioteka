import { auth } from "@/auth";
import { Button } from "@/app/_components/button";

interface HomeProps {
  searchParams: Promise<{ accountDeleted?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const session = await auth();
  const { accountDeleted } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="flex flex-col items-center gap-6 text-center max-w-md">
        <h1 className="font-display text-3xl font-semibold text-ink">
          Domowa Biblioteka
        </h1>

        {accountDeleted === "1" && (
          <p
            role="status"
            className="rounded-lg border border-green-300 bg-green-50 px-4 py-2.5 text-sm text-green-800"
          >
            Your account has been deleted.
          </p>
        )}

        {session?.user ? (
          <>
            <p className="text-lg text-ink-soft">
              Welcome back, {session.user.name ?? session.user.email}.
            </p>
            <a
              href="/collection"
              className="text-sm font-medium text-green-700 underline"
            >
              Go to your collection
            </a>
          </>
        ) : (
          <>
            <p className="text-lg text-ink-soft">
              Browse your friends&apos; bookshelves and borrow without the
              awkward ask.
            </p>
            <div className="flex flex-col gap-3 w-full sm:flex-row sm:justify-center">
              <Button href="/register" variant="primary">
                Create account
              </Button>
              <Button href="/login" variant="ghost">
                Sign in
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
