import { after, NextResponse } from "next/server";
import { runPaperAnalysis, startPaperAnalysis } from "@/lib/server/papers";
import {
  isAuthenticationError,
  requireAuthenticatedUser,
} from "@/lib/supabase/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const body = (await request.json()) as { nodeId?: string; projectId?: string };
    const nodeId = body.nodeId?.trim();
    const projectId = body.projectId?.trim();

    if (!nodeId || !projectId) {
      return NextResponse.json({ error: "Missing nodeId or projectId." }, { status: 400 });
    }

    const node = await startPaperAnalysis(user.id, projectId, nodeId);

    after(async () => {
      await runPaperAnalysis(user.id, projectId, nodeId);
    });

    return NextResponse.json(
      {
        nodeId,
        analysis_status: node.analysis_status,
      },
      { status: 202 },
    );
  } catch (error) {
    if (isAuthenticationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to queue paper analysis.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
