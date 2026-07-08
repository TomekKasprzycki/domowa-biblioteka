import { RegisterForm } from "./_components/register-form";

export default function RegisterPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Create account
        </h1>
        <RegisterForm />
      </div>
    </main>
  );
}
