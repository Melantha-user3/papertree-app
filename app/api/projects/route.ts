import { NextResponse } from "next/server";
import { createProject, listDemoProjects, listProjects } from "@/lib/server/papers";
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
      return NextResponse.json({ projects: listDemoProjects(), mode: "demo" });
    }

    const projects = await listProjects(user.id);
    return NextResponse.json({ projects });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to load projects.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const body = (await request.json()) as { groupId?: string | null; name?: string };
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ error: "Missing project name." }, { status: 400 });
    }

    const project = await createProject(user.id, name, body.groupId);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to create project.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
