import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { findByOwnerIds } from "@/server/book/book.repository";
import { findFriendUsers } from "@/server/friend-connection/friend-connection.repository";
import {
  findOpenLoansForBooks,
  findRequestedLoansForBooksByRequester,
} from "@/server/loan/loan.repository";
import { DiscoverSearch } from "@/app/(app)/discover/_components/discover-search";
import { AvailabilityLegendItem } from "@/app/(app)/discover/_components/availability-legend-item";
import type { DiscoverBook } from "@/app/(app)/discover/discover.types";

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
  const openLoans = await findOpenLoansForBooks(bookIds);
  const requestedLoans = await findRequestedLoansForBooksByRequester(
    bookIds,
    session.user.id
  );

  const openLoanByBookId = new Map(
    openLoans.map((loan) => [loan.bookId, loan])
  );
  const requestedBookIds = new Set(requestedLoans.map((loan) => loan.bookId));

  const plainBooks: DiscoverBook[] = books.map((b) => {
    const openLoan = openLoanByBookId.get(b.id);
    return {
      id: b.id,
      title: b.title,
      author: b.author,
      notes: b.notes,
      isbn: b.isbn,
      createdAt: b.createdAt,
      owner: { id: b.owner.id, name: b.owner.name, email: b.owner.email },
      availability: {
        status: openLoan ? "on_loan" : "available",
        borrowedByViewer: openLoan?.requesterId === session.user.id,
        requestedByViewer: requestedBookIds.has(b.id),
      },
    };
  });

  return (
    <div className="flex flex-col gap-7">
      <div>
        <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-wide text-green-600">
          Their shelf
        </span>
        <h1 className="font-display text-[30px] font-semibold text-ink">
          Discover
        </h1>
      </div>
      <div className="flex flex-wrap gap-[18px] text-[12.5px] text-ink-soft">
        <AvailabilityLegendItem tone="available">Available</AvailabilityLegendItem>
        <AvailabilityLegendItem tone="unavailable">Unavailable</AvailabilityLegendItem>
      </div>
      <DiscoverSearch
        books={plainBooks}
        friends={friends}
        initialFriendId={initialFriendId}
      />
    </div>
  );
}
