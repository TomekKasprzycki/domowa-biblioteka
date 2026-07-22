import { auth } from "@/auth";
import { findOutgoingLoans } from "@/server/loan/loan.repository";
import { BorrowingList } from "@/app/borrowing/_components/borrowing-list";
import type { OutgoingLoan } from "@/app/borrowing/borrowing.types";

export default async function BorrowingPage() {
  const session = await auth();
  if (!session?.user) return null;

  const loans = await findOutgoingLoans(session.user.id);
  const plainLoans: OutgoingLoan[] = loans.map((l) => ({
    id: l.id,
    book: { title: l.book.title, author: l.book.author },
    owner: { name: l.owner.name },
    status: l.status,
    startedAt: l.startedAt,
  }));

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-10">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Borrowing
        </h1>
        <BorrowingList loans={plainLoans} />
      </div>
    </main>
  );
}
