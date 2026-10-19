import { redirect } from "next/navigation";
import { login } from "@/lib/auth";

async function attemptLogin(formData: FormData) {
  "use server";
  const secret = String(formData.get("secret") ?? "");
  const next = String(formData.get("next") ?? "/");
  const ok = await login(secret);
  if (!ok) redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  redirect(next || "/");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next = "/" } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <form
        action={attemptLogin}
        className="w-full space-y-4 rounded-lg border p-6"
      >
        <div>
          <h1 className="text-xl font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the session secret from your <code>.env</code>.
          </p>
        </div>
        <input type="hidden" name="next" value={next} />
        <input
          name="secret"
          type="password"
          autoFocus
          required
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder="SESSION_SECRET"
        />
        {error ? (
          <p className="text-sm text-destructive">Incorrect secret.</p>
        ) : null}
        <button
          type="submit"
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Continue
        </button>
      </form>
    </main>
  );
}
