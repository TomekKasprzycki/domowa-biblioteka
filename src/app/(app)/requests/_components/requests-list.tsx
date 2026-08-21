import { RequestRow } from "@/app/(app)/requests/_components/request-row";
import { EmptyNote } from "@/app/_components/empty-note";
import type { IncomingRequest } from "@/app/(app)/requests/requests.types";

export function RequestsList({ requests }: { requests: IncomingRequest[] }) {
  if (requests.length === 0) {
    return <EmptyNote>No pending requests.</EmptyNote>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {requests.map((request) => (
        <RequestRow key={request.id} request={request} />
      ))}
    </ul>
  );
}
