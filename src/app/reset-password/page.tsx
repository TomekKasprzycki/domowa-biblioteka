import Link from "next/link";
import { ResetPasswordForm } from "./_components/reset-password-form";

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { token } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        <h1 className="font-display text-3xl font-semibold text-ink">
          Reset password
        </h1>

        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <>
            <p
              role="alert"
              className="rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-800"
            >
              This link is invalid or has expired. Request a new one.
            </p>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-green-700 underline"
            >
              Back to forgot password
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
