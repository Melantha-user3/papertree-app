import { NextResponse } from "next/server";
import { createPaperNodeFromUpload } from "@/lib/server/papers";
import {
  isAuthenticationError,
  requireAuthenticatedUser,
} from "@/lib/supabase/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE_BYTES = 50 * 1024 * 1024;
const MAX_THUMBNAIL_SIZE_BYTES = 4 * 1024 * 1024;
const ALLOWED_THUMBNAIL_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const formData = await request.formData();
    const file = formData.get("file");
    const thumbnailEntry = formData.get("thumbnail");
    const thumbnail =
      thumbnailEntry instanceof File && thumbnailEntry.size > 0 ? thumbnailEntry : null;
    const projectId = String(formData.get("projectId") || "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF is allowed" }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "File is larger than 50MB" }, { status: 413 });
    }

    if (
      thumbnail &&
      (!ALLOWED_THUMBNAIL_TYPES.has(thumbnail.type) ||
        thumbnail.size > MAX_THUMBNAIL_SIZE_BYTES)
    ) {
      return NextResponse.json({ error: "Invalid PDF thumbnail" }, { status: 400 });
    }

    const node = await createPaperNodeFromUpload(user.id, projectId, file, {
      thumbnail,
    });
    return NextResponse.json({ node }, { status: 201 });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Upload pipeline failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
