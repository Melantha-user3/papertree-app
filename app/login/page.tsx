import Link from "next/link";
import { redirect } from "next/navigation";
import { login, signup } from "@/app/login/actions";
import { AuthForm } from "@/components/auth/auth-form";
import { PaperTreeMark } from "@/components/brand/papertree-mark";
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
              Create a private workspace when you are ready to upload your own PDFs.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
              You can inspect the Quantum Dots sample without an account. Registration is only
              needed for saved projects, private uploads, and user-scoped storage.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Auth</p>
                <p className="mt-2 text-sm text-slate-700">
                  Email/password accounts are handled by Supabase Auth.
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
                  Upload PDFs, extract parameters, and draft reviews from locked paper chains.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center">
          <div className="w-full rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <PaperTreeMark className="h-10 w-10" />
              <div>
                <p className="text-sm font-semibold text-slate-950">PaperTree</p>
                <p className="text-xs text-slate-500">Alpha research workspace</p>
              </div>
            </div>

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
              {mode === "signup"
                ? "Create an alpha account and go straight to the private workspace. No email confirmation step is required."
                : "Use the account you created for private projects, or open the sample project without signing in."}
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

            <AuthForm action={mode === "signup" ? signup : login} mode={mode} />
          </div>
        </section>
      </div>
    </main>
  );
}
