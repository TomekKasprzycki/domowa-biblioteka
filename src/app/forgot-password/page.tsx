import Link from "next/link";
import { ForgotPasswordForm } from "./_components/forgot-password-form";

interface ForgotPasswordPageProps {
  searchParams: Promise<{ sent?: string }>;
}

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const { sent } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        <h1 className="font-display text-3xl font-semibold text-ink">
          Nie pamiętasz hasła?
        </h1>

        {sent === "1" && (
          <p
            role="status"
            className="rounded-lg border border-green-300 bg-green-50 px-4 py-2.5 text-sm text-green-800"
          >
            Jeśli ten adres e-mail jest zarejestrowany, wysłaliśmy na niego
            link do zresetowania hasła.
          </p>
        )}

        <ForgotPasswordForm />

        <Link
          href="/privacy"
          className="text-sm font-medium text-green-700 underline"
        >
          Informacja o prywatności
        </Link>
      </div>
    </main>
  );
}
