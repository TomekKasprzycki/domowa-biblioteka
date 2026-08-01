import { auth } from "@/auth";
import { findIncomingRequests } from "@/server/loan/loan.repository";
import { RequestsList } from "@/app/requests/_components/requests-list";
import type { IncomingRequest } from "@/app/requests/requests.types";

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

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-10">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Requests
        </h1>
        <RequestsList requests={plainRequests} />
      </div>
    </main>
  );
}
