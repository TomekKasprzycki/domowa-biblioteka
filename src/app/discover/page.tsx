import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { findByOwnerIds } from "@/server/book/book.repository";
import { findFriendUsers } from "@/server/friend-connection/friend-connection.repository";
import {
  findActiveLoansForBooks,
  findRequestedLoansForBooksByRequester,
} from "@/server/loan/loan.repository";
import { DiscoverSearch } from "@/app/discover/_components/discover-search";
import type { DiscoverBook } from "@/app/discover/discover.types";

interface DiscoverPageProps {
  searchParams: Promise<{ friend?: string }>;
}

export default async function DiscoverPage({
  searchParams,
}: DiscoverPageProps) {
  const session = await auth();
  if (!session?.user) return null;

  const { friend: friendParam } = await searchParams;

  const friends = await findFriendUsers(session.user.id);

  let initialFriendId: string | null = null;
  if (friendParam) {
    const isFriend = friends.some((f) => f.id === friendParam);
    if (!isFriend) {
      redirect("/friends?notice=not-a-friend");
    }
    initialFriendId = friendParam;
  }

  const books = await findByOwnerIds(friends.map((f) => f.id));
  const bookIds = books.map((b) => b.id);
  const activeLoans = await findActiveLoansForBooks(bookIds);
  const requestedLoans = await findRequestedLoansForBooksByRequester(
    bookIds,
    session.user.id
  );

  const activeLoanByBookId = new Map(
    activeLoans.map((loan) => [loan.bookId, loan])
  );
  const requestedBookIds = new Set(requestedLoans.map((loan) => loan.bookId));

  const plainBooks: DiscoverBook[] = books.map((b) => {
    const activeLoan = activeLoanByBookId.get(b.id);
    return {
      id: b.id,
      title: b.title,
      author: b.author,
      notes: b.notes,
      createdAt: b.createdAt,
      owner: { id: b.owner.id, name: b.owner.name, email: b.owner.email },
      availability: {
        status: activeLoan ? "on_loan" : "available",
        borrowedByViewer: activeLoan?.requesterId === session.user.id,
        requestedByViewer: requestedBookIds.has(b.id),
      },
    };
  });

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-10">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Discover
        </h1>
        <DiscoverSearch
          books={plainBooks}
          friends={friends}
          initialFriendId={initialFriendId}
        />
      </div>
    </main>
  );
}
