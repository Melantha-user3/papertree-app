import { NextResponse } from "next/server";
import { generateSynthesisReview } from "@/lib/server/papers";
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
    const body = (await request.json()) as { projectId?: string; targetNodeId?: string };
    const projectId = body.projectId?.trim();
    const targetNodeId = body.targetNodeId?.trim();

    if (!projectId || !targetNodeId) {
      return NextResponse.json(
        { error: "Missing projectId or targetNodeId." },
        { status: 400 },
      );
    }

    const review = await generateSynthesisReview(user.id, projectId, targetNodeId);
    return NextResponse.json({ review }, { status: 200 });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to generate synthesis review.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
