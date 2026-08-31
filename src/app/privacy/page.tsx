import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="flex flex-1 justify-center px-4 py-16">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <Link
          href="/"
          className="text-sm font-medium text-green-700 underline"
        >
          ← Back
        </Link>

        <h1 className="font-display text-3xl font-semibold text-ink">
          Privacy Notice
        </h1>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-ink">
            What we collect, and why
          </h2>
          <p className="text-sm text-ink-soft">
            Domowa Biblioteka collects only what the app itself needs to run —
            nothing is collected for advertising, analytics, or resale.
          </p>
          <ul className="list-disc pl-5 text-sm text-ink-soft">
            <li>
              <strong className="text-ink">Account information</strong> — your
              email, password (stored as a salted hash, never in plain text),
              and name. Used to create and secure your account and identify
              you to friends you connect with.
            </li>
            <li>
              <strong className="text-ink">Social graph</strong> — who you
              have sent or accepted a friend connection with. Used to decide
              whose book collection you can see and borrow from — a
              collection is never visible outside your confirmed friend
              circle.
            </li>
            <li>
              <strong className="text-ink">Your collection</strong> — the
              books you add (title, author, optional notes and ISBN). Used to
              show your shelf to your confirmed friends and to your own
              collection view.
            </li>
            <li>
              <strong className="text-ink">Loan history</strong> — who
              borrowed which book, from whom, and when. Used to track which
              books are available and to run the borrow-and-return flow.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-ink">Legal basis</h2>
          <p className="text-sm text-ink-soft">
            We process this data on the basis of performance of a contract:
            creating an account is how you agree to use the app, and each
            category above exists to deliver a feature you asked for by using
            it (adding a book, sending a friend request, requesting a loan).
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-ink">
            Who processes this data
          </h2>
          <p className="text-sm text-ink-soft">
            Two infrastructure providers process data on our behalf:
          </p>
          <ul className="list-disc pl-5 text-sm text-ink-soft">
            <li>
              <strong className="text-ink">Vercel</strong> — hosts the
              application and runs its server functions.
            </li>
            <li>
              <strong className="text-ink">Neon</strong> — hosts the
              database. The database currently runs in a United States region
              rather than the European Union region our application servers
              use; this is a known gap we intend to close by migrating to an
              EU database region, and in the interim we rely on our
              processor&apos;s standard data-transfer safeguards.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-ink">Your rights</h2>
          <p className="text-sm text-ink-soft">
            You can permanently delete your account and everything tied to it
            — your collection, friend connections, and loan history — at any
            time from{" "}
            <Link
              href="/account"
              className="font-medium text-green-700 underline"
            >
              your account page
            </Link>
            . Deletion is immediate and cannot be undone.
          </p>
        </section>
      </div>
    </main>
  );
}
