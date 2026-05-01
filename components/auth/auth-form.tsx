"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";

interface AuthFormProps {
  action: (formData: FormData) => void | Promise<void>;
  mode: "signin" | "signup";
}

function SubmitButton({ mode }: { mode: AuthFormProps["mode"] }) {
  const { pending } = useFormStatus();
  const label = mode === "signup" ? "Create account" : "Sign in";

  return (
    <button
      className="w-full rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-wait disabled:bg-teal-500 disabled:opacity-80"
      disabled={pending}
      type="submit"
    >
      {pending ? `${label}...` : label}
    </button>
  );
}

export function AuthForm({ action, mode }: AuthFormProps) {
  return (
    <>
      <form action={action} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm text-slate-700">Email</span>
          <input
            required
            autoComplete="email"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 disabled:bg-slate-50"
            disabled={false}
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
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 disabled:bg-slate-50"
            minLength={8}
            name="password"
            placeholder="At least 8 characters"
            type="password"
          />
        </label>

        <SubmitButton mode={mode} />
      </form>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
        <Link className="font-semibold text-teal-700 underline-offset-4 hover:underline" href="/canvas">
          Open the Quantum Dots sample
        </Link>{" "}
        without creating an account.
      </div>
    </>
  );
}
