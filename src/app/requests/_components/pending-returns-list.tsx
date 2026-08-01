import { PendingReturnRow } from "@/app/requests/_components/pending-return-row";
import type { PendingReturn } from "@/app/requests/requests.types";

export function PendingReturnsList({
  pendingReturns,
}: {
  pendingReturns: PendingReturn[];
}) {
  // /requests is an action inbox: a section with nothing to act on is noise,
  // so it renders nothing rather than an empty state.
  if (pendingReturns.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-medium text-zinc-900">
        Awaiting your confirmation
      </h2>
      <ul className="flex flex-col gap-3">
        {pendingReturns.map((pendingReturn) => (
          <PendingReturnRow
            key={pendingReturn.id}
            pendingReturn={pendingReturn}
          />
        ))}
      </ul>
    </section>
  );
}
