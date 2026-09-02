import Link from "next/link";
import { LoginForm } from "./_components/login-form";

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string; reset?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { callbackUrl, reset } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        <h1 className="font-display text-3xl font-semibold text-ink">
          Sign in
        </h1>

        {reset === "1" && (
          <p
            role="status"
            className="rounded-lg border border-green-300 bg-green-50 px-4 py-2.5 text-sm text-green-800"
          >
            Your password has been reset. Sign in with your new password.
          </p>
        )}

        <LoginForm callbackUrl={callbackUrl ?? "/collection"} />
        <Link
          href="/privacy"
          className="text-sm font-medium text-green-700 underline"
        >
          Privacy notice
        </Link>
      </div>
    </main>
  );
}
