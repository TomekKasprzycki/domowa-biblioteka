import { PendingReturnRow } from "@/app/(app)/requests/_components/pending-return-row";
import { Section } from "@/app/_components/section";
import type { PendingReturn } from "@/app/(app)/requests/requests.types";

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
    <Section title="Oczekuje na Twoje potwierdzenie" collapsible={false}>
      <ul className="flex flex-col gap-3">
        {pendingReturns.map((pendingReturn) => (
          <PendingReturnRow
            key={pendingReturn.id}
            pendingReturn={pendingReturn}
          />
        ))}
      </ul>
    </Section>
  );
}
