import { NextResponse } from "next/server";
import { updateEdgeLock } from "@/lib/server/papers";
import {
  isAuthenticationError,
  requireAuthenticatedUser,
} from "@/lib/supabase/auth";
import type { PaperEdgeRecord } from "@/lib/types/papertree";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const body = (await request.json()) as {
      projectId?: string;
      sourceId?: string;
      targetId?: string;
      relationType?: PaperEdgeRecord["relation_type"];
      isLocked?: boolean;
    };

    if (!body.projectId || !body.sourceId || !body.targetId || !body.relationType) {
      return NextResponse.json({ error: "Missing edge identity." }, { status: 400 });
    }

    const edge = await updateEdgeLock(user.id, body.projectId, {
      sourceId: body.sourceId,
      targetId: body.targetId,
      relationType: body.relationType,
      isLocked: Boolean(body.isLocked),
    });

    return NextResponse.json({ edge }, { status: 200 });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to update edge.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
