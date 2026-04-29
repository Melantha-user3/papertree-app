import { configureServerPdfJs } from "@/lib/pdf/configure-server-pdfjs";

export interface ParsedPdfMetadata {
  title: string;
  authors: string[];
  year: number | null;
  pageCount: number;
}

interface PdfMetadataResult {
  info?: Record<string, string | number | boolean | null>;
}

interface PdfDocumentProxyLike {
  numPages: number;
  getMetadata: () => Promise<PdfMetadataResult>;
  destroy: () => void;
}

interface PdfJsModuleLike {
  getDocument: (source: { data: Uint8Array }) => { promise: Promise<PdfDocumentProxyLike> };
}

function parseYear(raw: string | undefined): number | null {
  if (!raw) return null;
  const match = raw.match(/(19|20)\d{2}/);
  return match ? Number(match[0]) : null;
}

function parseAuthors(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[;,]/)
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}

export async function extractPdfMetadata(bytes: Uint8Array, fallbackTitle: string) {
  const pdfjs = (await import("pdfjs-dist/legacy/build/pdf")) as unknown as PdfJsModuleLike;
  configureServerPdfJs(pdfjs);
  const task = pdfjs.getDocument({ data: bytes });
  const doc = await task.promise;
  const meta = await doc.getMetadata();
  const info = meta.info ?? {};

  const titleRaw = (typeof info.Title === "string" ? info.Title : "").trim();
  const authorRaw = typeof info.Author === "string" ? info.Author : undefined;
  const dateRaw = typeof info.CreationDate === "string" ? info.CreationDate : undefined;

  doc.destroy();

  return {
    title: titleRaw || fallbackTitle,
    authors: parseAuthors(authorRaw),
    year: parseYear(dateRaw),
    pageCount: doc.numPages,
  } satisfies ParsedPdfMetadata;
}
