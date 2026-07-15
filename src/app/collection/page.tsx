import { auth } from "@/auth";
import { findByUserId } from "@/server/book/book.repository";
import { AddBookForm } from "./_components/add-book-form";
import { BookList } from "./_components/book-list";

export default async function CollectionPage() {
  const session = await auth();
  if (!session?.user) return null;

  const books = await findByUserId(session.user.id);
  const plainBooks = books.map((b) => ({
    id: b.id,
    title: b.title,
    author: b.author,
    notes: b.notes,
    createdAt: b.createdAt,
  }));

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
