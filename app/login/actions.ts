"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

export async function login(formData: FormData) {
  const email = readCredential(formData, "email");
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
  const email = readCredential(formData, "email");
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
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
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
      message: "Account created. Check your email if confirmation is enabled, then sign in.",
      mode: "signin",
    }),
  );
}
