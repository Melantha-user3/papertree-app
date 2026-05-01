"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/admin-client";
import { createSupabaseRouteClient } from "@/lib/supabase/auth";

function buildRedirect(path: string, params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

function readCredential(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isDuplicateUserError(error: { message?: string } | null) {
  return /already|registered|exists/i.test(error?.message ?? "");
}

async function getRequestOrigin() {
  const headersList = await headers();
  const origin = headersList.get("origin");

  if (origin) {
    return origin;
  }

  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  const proto = headersList.get("x-forwarded-proto") ?? "https";

  return host ? `${proto}://${host}` : "http://localhost:3000";
}

export async function login(formData: FormData) {
  const email = normalizeEmail(readCredential(formData, "email"));
  const password = readCredential(formData, "password");

  if (!email || !password) {
    redirect(
      buildRedirect("/login", {
        error: "Email and password are required.",
        mode: "signin",
      }),
    );
  }

  const supabase = await createSupabaseRouteClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(
      buildRedirect("/login", {
        error: error.message,
        mode: "signin",
      }),
    );
  }

  revalidatePath("/", "layout");
  redirect("/canvas");
}

export async function signup(formData: FormData) {
  const email = normalizeEmail(readCredential(formData, "email"));
  const password = readCredential(formData, "password");

  if (!email || !password) {
    redirect(
      buildRedirect("/login", {
        error: "Email and password are required.",
        mode: "signup",
      }),
    );
  }

  const supabase = await createSupabaseRouteClient();

  try {
    const admin = getSupabaseAdmin();
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        source: "papertree-alpha",
      },
    });

    if (createError && !isDuplicateUserError(createError)) {
      redirect(
        buildRedirect("/login", {
          error: createError.message,
          mode: "signup",
        }),
      );
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!signInError) {
      revalidatePath("/", "layout");
      redirect("/canvas");
    }

    redirect(
      buildRedirect("/login", {
        error: isDuplicateUserError(createError)
          ? "This email already has an account. Sign in with the original password, or use a different email for alpha testing."
          : signInError.message,
        mode: isDuplicateUserError(createError) ? "signin" : "signup",
      }),
    );
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("Missing SUPABASE_URL")) {
      throw error;
    }
  }

  const origin = await getRequestOrigin();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=/canvas`,
    },
  });

  if (error) {
    redirect(
      buildRedirect("/login", {
        error: error.message,
        mode: "signup",
      }),
    );
  }

  revalidatePath("/", "layout");

  if (data.session) {
    redirect("/canvas");
  }

  redirect(
    buildRedirect("/login", {
      message:
        "Account created. If a confirmation email arrives, open that link first, then sign in.",
      mode: "signin",
    }),
  );
}
