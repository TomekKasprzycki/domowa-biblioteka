import { auth } from "@/auth";
import { findOutgoingLoans } from "@/server/loan/loan.repository";
import { BorrowingList } from "@/app/(app)/borrowing/_components/borrowing-list";
import type { OutgoingLoan } from "@/app/(app)/borrowing/borrowing.types";

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
    <div className="flex flex-col gap-7">
      <div>
        <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-wide text-green-600">
          Loan status
        </span>
        <h1 className="font-display text-[30px] font-semibold text-ink">
          Borrowing
        </h1>
      </div>
      <BorrowingList loans={plainLoans} />
    </div>
  );
}
