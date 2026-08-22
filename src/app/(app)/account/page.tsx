import { auth } from "@/auth";
import { Card } from "@/app/_components/card";
import { DeleteAccountForm } from "@/app/(app)/account/_components/delete-account-form";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.email) return null;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-ink">
        Account
      </h1>

      <Card>
        <h2 className="mb-2 text-sm font-semibold text-green-800">
          Delete your account
        </h2>
        <p className="mb-4 text-sm text-ink-soft">
          This permanently deletes your account and everything tied to it —
          your book collection, friend connections, and loan history. This
          cannot be undone. If you currently have an active loan, or one of
          your books is on loan to a friend, resolve it first.
        </p>
        <DeleteAccountForm email={session.user.email} />
      </Card>
    </div>
  );
}
