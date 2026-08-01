import { auth } from "@/auth";
import {
  findIncomingRequests,
  findPendingReturnsForOwner,
} from "@/server/loan/loan.repository";
import { RequestsList } from "@/app/requests/_components/requests-list";
import { PendingReturnsList } from "@/app/requests/_components/pending-returns-list";
import type {
  IncomingRequest,
  PendingReturn,
} from "@/app/requests/requests.types";

export default async function RequestsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const requests = await findIncomingRequests(session.user.id);
  const plainRequests: IncomingRequest[] = requests.map((r) => ({
    id: r.id,
    book: { title: r.book.title, author: r.book.author },
    requester: { name: r.requester.name, email: r.requester.email },
    createdAt: r.createdAt,
  }));

  const pendingReturns = await findPendingReturnsForOwner(session.user.id);
  const plainPendingReturns: PendingReturn[] = pendingReturns.map((r) => ({
    id: r.id,
    book: { title: r.book.title, author: r.book.author },
    requester: { name: r.requester.name, email: r.requester.email },
    startedAt: r.startedAt,
  }));

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-10">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Requests
        </h1>
        {/* Returns first: a pending return keeps a book locked out of
            circulation, so it is the more urgent of the two. */}
        <PendingReturnsList pendingReturns={plainPendingReturns} />
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium text-zinc-900">Borrow requests</h2>
          <RequestsList requests={plainRequests} />
        </section>
      </div>
    </main>
  );
}
