import { auth } from "@/auth";
import { Card } from "@/app/_components/card";
import { DeleteAccountForm } from "@/app/(app)/account/_components/delete-account-form";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.email) return null;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-ink">
        Konto
      </h1>

      <Card>
        <h2 className="mb-2 text-sm font-semibold text-green-800">
          Usuń konto
        </h2>
        <p className="mb-4 text-sm text-ink-soft">
          To trwale usunie Twoje konto oraz wszystko, co jest z nim związane —
          Twoją kolekcję książek, połączenia ze znajomymi i historię
          wypożyczeń. Tej operacji nie można cofnąć. Jeśli masz obecnie
          aktywne wypożyczenie lub jedna z Twoich książek jest wypożyczona
          znajomemu, najpierw to rozwiąż.
        </p>
        <DeleteAccountForm email={session.user.email} />
      </Card>
    </div>
  );
}
