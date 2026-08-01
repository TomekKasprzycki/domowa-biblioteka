import { auth } from "@/auth";
import { findByUserId } from "@/server/book/book.repository";
import { findOpenLoansForOwner } from "@/server/loan/loan.repository";
import { AddBookForm } from "@/app/collection/_components/add-book-form";
import { BookList } from "@/app/collection/_components/book-list";
import type { CollectionBook } from "@/app/collection/collection.types";

export default async function CollectionPage() {
  const session = await auth();
  if (!session?.user) return null;

  const books = await findByUserId(session.user.id);
  // Owner-scoped reader: it loads the borrower, which /discover's reader
  // deliberately does not. See findOpenLoansForOwner.
  const openLoans = await findOpenLoansForOwner(session.user.id);
  const loanByBookId = new Map(openLoans.map((loan) => [loan.bookId, loan]));

  const plainBooks: CollectionBook[] = books.map((b) => {
    const loan = loanByBookId.get(b.id);
    return {
      id: b.id,
      title: b.title,
      author: b.author,
      notes: b.notes,
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
    <main className="flex flex-1 flex-col items-center px-4 py-10">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Your collection
        </h1>
        <AddBookForm />
        <BookList books={plainBooks} />
      </div>
    </main>
  );
}
