import { RequestRow } from "@/app/requests/_components/request-row";
import type { IncomingRequest } from "@/app/requests/requests.types";

export function RequestsList({ requests }: { requests: IncomingRequest[] }) {
  if (requests.length === 0) {
    return <p className="text-sm text-zinc-500">No pending requests.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {requests.map((request) => (
        <RequestRow key={request.id} request={request} />
      ))}
    </ul>
  );
}
