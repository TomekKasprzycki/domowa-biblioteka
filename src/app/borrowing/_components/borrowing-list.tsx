import type { OutgoingLoan } from "@/app/borrowing/borrowing.types";

function statusLabel(loan: OutgoingLoan): string {
  if (loan.status === "active") return `Borrowed from ${loan.owner.name}`;
  if (loan.status === "declined") return `Declined by ${loan.owner.name}`;
  return `Requested from ${loan.owner.name}`;
}

export function BorrowingList({ loans }: { loans: OutgoingLoan[] }) {
  if (loans.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        You have no borrow requests or active loans.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {loans.map((loan) => (
        <li
          key={loan.id}
          className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4"
        >
          <p className="font-medium text-zinc-900">{loan.book.title}</p>
          <p className="text-sm text-zinc-600">{loan.book.author}</p>
          <p className="mt-1 text-sm text-zinc-500">{statusLabel(loan)}</p>
        </li>
      ))}
    </ul>
  );
}
