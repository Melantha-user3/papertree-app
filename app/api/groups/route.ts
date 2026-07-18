import { NextResponse } from "next/server";
import { createGroup, listGroups } from "@/lib/server/groups";
import {
  getAuthenticatedUser,
  isAuthenticationError,
  requireAuthenticatedUser,
} from "@/lib/supabase/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ groups: [], mode: "demo" });
    }

    const groups = await listGroups(user.id);

    return NextResponse.json({ groups });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to load groups.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const body = (await request.json()) as { name?: string };
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ error: "Missing group name." }, { status: 400 });
    }

    const payload = await createGroup(user.id, name);
    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to create group.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
