import Link from "next/link";
import { RegisterForm } from "./_components/register-form";

export default function RegisterPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        <h1 className="font-display text-3xl font-semibold text-ink">
          Create account
        </h1>
        <RegisterForm />
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
