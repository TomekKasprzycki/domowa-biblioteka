import { auth } from "@/auth";
import { findByUserId } from "@/server/book/book.repository";
import { findOpenLoansForOwner } from "@/server/loan/loan.repository";
import { AddBookModal } from "@/app/(app)/collection/_components/add-book-modal";
import { BookList } from "@/app/(app)/collection/_components/book-list";
import type { CollectionBook } from "@/app/(app)/collection/collection.types";

export default async function CollectionPage() {
  const session = await auth();
  if (!session?.user) return null;

  // Independent queries — findOpenLoansForOwner is scoped by owner, not by the
  // book ids, so it doesn't wait on the book list.
  // findOpenLoansForOwner is the owner-scoped reader: it loads the borrower,
  // which /discover's reader deliberately does not.
  const [books, openLoans] = await Promise.all([
    findByUserId(session.user.id),
    findOpenLoansForOwner(session.user.id),
  ]);
  const loanByBookId = new Map(openLoans.map((loan) => [loan.bookId, loan]));

  const plainBooks: CollectionBook[] = books.map((b) => {
    const loan = loanByBookId.get(b.id);
    return {
      id: b.id,
      title: b.title,
      author: b.author,
      notes: b.notes,
      isbn: b.isbn,
      createdAt: b.createdAt,
      loan: loan
        ? {
            status: loan.status,
            borrowerName: loan.requester.name,
            startedAt: loan.startedAt,
          }
        : null,
    };
  });

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-wide text-green-600">
            Your shelf
          </span>
          <h1 className="font-display text-[30px] font-semibold text-ink">
            Your collection
          </h1>
        </div>
        <AddBookModal />
      </div>
      <BookList books={plainBooks} />
    </div>
  );
}
