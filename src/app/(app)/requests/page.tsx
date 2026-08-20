import { auth } from "@/auth";
import {
  findIncomingRequests,
  findPendingReturnsForOwner,
} from "@/server/loan/loan.repository";
import { RequestsList } from "@/app/(app)/requests/_components/requests-list";
import { PendingReturnsList } from "@/app/(app)/requests/_components/pending-returns-list";
import { Section } from "@/app/_components/section";
import type {
  IncomingRequest,
  PendingReturn,
} from "@/app/(app)/requests/requests.types";

export default async function RequestsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const [requests, pendingReturns] = await Promise.all([
    findIncomingRequests(session.user.id),
    findPendingReturnsForOwner(session.user.id),
  ]);

  const plainRequests: IncomingRequest[] = requests.map((r) => ({
    id: r.id,
    book: { title: r.book.title, author: r.book.author },
    requester: { name: r.requester.name, email: r.requester.email },
    createdAt: r.createdAt,
  }));

  const plainPendingReturns: PendingReturn[] = pendingReturns.map((r) => ({
    id: r.id,
    book: { title: r.book.title, author: r.book.author },
    requester: { name: r.requester.name },
    startedAt: r.startedAt,
  }));

  return (
    <div className="flex flex-col gap-7">
      <div>
        <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-wide text-green-600">
          Request inbox
        </span>
        <h1 className="font-display text-[30px] font-semibold text-ink">
          Requests
        </h1>
      </div>
      {/* Returns first: a pending return keeps a book locked out of
          circulation, so it is the more urgent of the two. */}
      <PendingReturnsList pendingReturns={plainPendingReturns} />
      <Section title="Borrow requests" collapsible={false}>
        <RequestsList requests={plainRequests} />
      </Section>
    </div>
  );
}
