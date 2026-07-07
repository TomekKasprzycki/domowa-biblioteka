import { LoginForm } from "./_components/login-form";

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { callbackUrl } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Sign in
        </h1>
        <LoginForm callbackUrl={callbackUrl ?? "/"} />
      </div>
    </main>
  );
}
