import { NextResponse } from "next/server";
import { getChainMetrics } from "@/lib/server/papers";
import {
  isAuthenticationError,
  requireAuthenticatedUser,
} from "@/lib/supabase/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId")?.trim();
    const targetNodeId = url.searchParams.get("targetNodeId")?.trim();

    if (!projectId || !targetNodeId) {
      return NextResponse.json(
        { error: "Missing projectId or targetNodeId." },
        { status: 400 },
      );
    }

    const series = await getChainMetrics(user.id, projectId, targetNodeId);
    return NextResponse.json({ series }, { status: 200 });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to load chain metrics.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
