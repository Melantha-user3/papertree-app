import { NextResponse } from "next/server";
import { getDemoPaperNodeDetail, getPaperNodeDetail } from "@/lib/server/papers";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/supabase/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ paperId: string }> },
) {
  try {
    const user = await getAuthenticatedUser();
    const { paperId } = await context.params;
    const projectId = new URL(request.url).searchParams.get("projectId")?.trim();

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId." }, { status: 400 });
    }

    if (!user) {
      return NextResponse.json({ node: getDemoPaperNodeDetail(projectId, paperId), mode: "demo" });
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
