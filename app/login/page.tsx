import Link from "next/link";
import { redirect } from "next/navigation";
import { login, signup } from "@/app/login/actions";
import { getAuthenticatedUser } from "@/lib/supabase/auth";

interface LoginPageProps {
  searchParams: Promise<{
    error?: string;
    message?: string;
    mode?: string;
  }>;
}

function ModeButton({
  active,
  href,
  label,
}: {
  active: boolean;
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] ${
        active
          ? "bg-teal-600 text-white"
          : "bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
      }`}
    >
      {label}
    </Link>
  );
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getAuthenticatedUser();

  if (user) {
    redirect("/canvas");
  }

  const params = await searchParams;
  const mode = params.mode === "signup" ? "signup" : "signin";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(13,148,136,0.12),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.12),_transparent_30%)]" />
          <div className="relative">
            <p className="text-xs uppercase tracking-[0.24em] text-teal-700">PaperTree</p>
            <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Private paper analysis for real research workflows.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
              Sign in to upload PDFs, run asynchronous analysis through your configured LLM
              provider, and keep every paper isolated to its owning Supabase user.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Auth</p>
                <p className="mt-2 text-sm text-slate-700">
                  `/canvas` is server-protected and redirects to login when no session exists.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Storage</p>
                <p className="mt-2 text-sm text-slate-700">
                  Paper files are stored under user-scoped paths and fetched via signed URLs.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Analysis</p>
                <p className="mt-2 text-sm text-slate-700">
                  Upload transitions through `uploaded`, `analyzing`, and `ready / error`.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center">
          <div className="w-full rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-2">
              <ModeButton active={mode === "signin"} href="/login?mode=signin" label="Sign In" />
              <ModeButton
                active={mode === "signup"}
                href="/login?mode=signup"
                label="Create Account"
              />
            </div>

            <h2 className="mt-6 text-2xl font-semibold text-slate-900">
              {mode === "signup" ? "Create your workspace" : "Sign in to PaperTree"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Email/password auth is wired. If you later enable GitHub OAuth in Supabase, this page
              can be extended without changing the protected routes.
            </p>

            {params.error ? (
              <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {params.error}
              </div>
            ) : null}

            {params.message ? (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                {params.message}
              </div>
            ) : null}

            <form className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm text-slate-700">Email</span>
                <input
                  required
                  autoComplete="email"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500"
                  name="email"
                  placeholder="you@example.com"
                  type="email"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-slate-700">Password</span>
                <input
                  required
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500"
                  minLength={8}
                  name="password"
                  placeholder="At least 8 characters"
                  type="password"
                />
              </label>

              <div className="grid gap-3 pt-2 sm:grid-cols-2">
                <button
                  className="rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
                  formAction={login}
                  type="submit"
                >
                  Sign In
                </button>
                <button
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                  formAction={signup}
                  type="submit"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
