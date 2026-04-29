import { randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin-client";
import { extractPdfMetadata } from "@/lib/pdf/extract-metadata";
import type { PaperNodeRecord } from "@/lib/types/papertree";

function coverSvg(title: string, pages: number) {
  return `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='840'>
<rect width='100%' height='100%' fill='#f8fafc'/>
<rect x='36' y='36' width='528' height='768' fill='white' stroke='#cbd5e1'/>
<text x='70' y='130' fill='#0f172a' font-size='28' font-family='Arial'>${title.slice(0, 56)}</text>
<text x='70' y='180' fill='#475569' font-size='20' font-family='Arial'>${pages} pages</text>
</svg>`;
}

export async function uploadPaperFile(file: File): Promise<PaperNodeRecord> {
  const id = randomUUID();
  const fallback = file.name.replace(/\.pdf$/i, "").trim() || "Untitled paper";
  const bytes = new Uint8Array(await file.arrayBuffer());
  const meta = await extractPdfMetadata(bytes, fallback);
  const supabase = getSupabaseAdmin();

  const pdfPath = `${id}.pdf`;
  const coverPath = `${id}.svg`;

  const pdfUpload = await supabase.storage.from("papers").upload(pdfPath, bytes, {
    upsert: false,
    contentType: "application/pdf",
  });
  if (pdfUpload.error) throw new Error(`Upload failed: ${pdfUpload.error.message}`);

  const svg = coverSvg(meta.title, meta.pageCount);
  const coverUpload = await supabase.storage.from("covers").upload(coverPath, svg, {
    upsert: true,
    contentType: "image/svg+xml",
  });
  if (coverUpload.error) throw new Error(`Cover failed: ${coverUpload.error.message}`);

  const pdfUrl = supabase.storage.from("papers").getPublicUrl(pdfPath).data.publicUrl;
  const coverUrl = supabase.storage.from("covers").getPublicUrl(coverPath).data.publicUrl;

  const payload = {
    id,
    title: meta.title,
    type: "article",
    status: "pending_review",
    metadata: {
      authors: meta.authors,
      year: meta.year,
      page_count: meta.pageCount,
      pdf_url: pdfUrl,
      cover_url: coverUrl,
    },
  };

  const insert = await supabase.from("nodes").insert(payload).select("*").single();
  if (insert.error) throw new Error(`DB insert failed: ${insert.error.message}`);

  return insert.data as PaperNodeRecord;
}
