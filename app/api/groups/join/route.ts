import { NextResponse } from "next/server";
import { joinGroupByInviteCode } from "@/lib/server/groups";
import {
  isAuthenticationError,
  requireAuthenticatedUser,
} from "@/lib/supabase/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const body = (await request.json()) as { inviteCode?: string };
    const inviteCode = body.inviteCode?.trim();

    if (!inviteCode) {
      return NextResponse.json({ error: "Missing invite code." }, { status: 400 });
    }

    const group = await joinGroupByInviteCode(user.id, inviteCode);
    return NextResponse.json({ group }, { status: 200 });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to join group.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
