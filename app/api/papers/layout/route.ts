import { NextResponse } from "next/server";
import { relayoutProject } from "@/lib/server/papers";
import {
  isAuthenticationError,
  requireAuthenticatedUser,
} from "@/lib/supabase/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const body = (await request.json()) as { projectId?: string };
    const projectId = body.projectId?.trim();

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId." }, { status: 400 });
    }

    await relayoutProject(user.id, projectId);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to relayout project.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
