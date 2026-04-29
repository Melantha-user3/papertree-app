import { NextResponse } from "next/server";
import { getPaperNodeDetail } from "@/lib/server/papers";
import {
  isAuthenticationError,
  requireAuthenticatedUser,
} from "@/lib/supabase/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ paperId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { paperId } = await context.params;
    const projectId = new URL(request.url).searchParams.get("projectId")?.trim();

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId." }, { status: 400 });
    }

    const node = await getPaperNodeDetail(user.id, projectId, paperId);

    return NextResponse.json({ node });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to load paper.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
