import { BorrowingRow } from "@/app/(app)/borrowing/_components/borrowing-row";
import type { OutgoingLoan } from "@/app/(app)/borrowing/borrowing.types";

// Terminal states: nothing the borrower does can move these on. Everything else
// is live and belongs at the top where it can still be acted on.
const PAST_STATUSES: ReadonlySet<OutgoingLoan["status"]> = new Set([
  "returned",
  "declined",
]);

export function BorrowingList({ loans }: { loans: OutgoingLoan[] }) {
  if (loans.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        You have no borrow requests or active loans.
      </p>
    );
  }

  const current = loans.filter((loan) => !PAST_STATUSES.has(loan.status));
  const past = loans.filter((loan) => PAST_STATUSES.has(loan.status));

  return (
    <div className="flex flex-col gap-6">
      {current.length > 0 && (
        <ul className="flex flex-col gap-3">
          {current.map((loan) => (
            <BorrowingRow key={loan.id} loan={loan} />
          ))}
        </ul>
      )}

      {/* A native disclosure keeps history available without client state and
          without pushing live loans below the fold. */}
      {past.length > 0 && (
        <details className="rounded-lg border border-zinc-200 p-4">
          <summary className="cursor-pointer text-sm font-medium text-zinc-700">
            Past loans ({past.length})
          </summary>
          <ul className="mt-3 flex flex-col gap-3">
            {past.map((loan) => (
              <BorrowingRow key={loan.id} loan={loan} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
