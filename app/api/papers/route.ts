import { NextResponse } from "next/server";
import { listDemoPaperGraph, listPaperGraph } from "@/lib/server/papers";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/supabase/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    const projectId = new URL(request.url).searchParams.get("projectId")?.trim();

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId." }, { status: 400 });
    }

    if (!user) {
      return NextResponse.json({ ...listDemoPaperGraph(projectId), mode: "demo" });
    }

    const graph = await listPaperGraph(user.id, projectId);
    return NextResponse.json(graph);
  } catch (error) {
    if (isAuthenticationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to load papers.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
