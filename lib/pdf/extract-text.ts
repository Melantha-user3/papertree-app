import { configureServerPdfJs } from "@/lib/pdf/configure-server-pdfjs";

export interface ExtractedPdfText {
  text: string;
  pageCount: number;
  excerpt: string;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

interface PdfTextItem {
  str?: string;
}

interface PdfPageProxyLike {
  getTextContent: () => Promise<{ items: PdfTextItem[] }>;
}

interface PdfDocumentProxyLike {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPageProxyLike>;
  destroy: () => void;
}

interface PdfJsModuleLike {
  getDocument: (source: { data: Uint8Array }) => { promise: Promise<PdfDocumentProxyLike> };
}

export async function extractTextFromPdf(buffer: Uint8Array): Promise<ExtractedPdfText> {
  const pdfjs = (await import("pdfjs-dist/legacy/build/pdf")) as unknown as PdfJsModuleLike;
  configureServerPdfJs(pdfjs);

  const loadingTask = pdfjs.getDocument({ data: buffer });
  const document = await loadingTask.promise;

  try {
    const pages: string[] = [];

    for (let pageIndex = 1; pageIndex <= document.numPages; pageIndex += 1) {
      const page = await document.getPage(pageIndex);
      const textContent = await page.getTextContent();
      const pageText = normalizeWhitespace(
        textContent.items.map((item) => item.str ?? "").join(" "),
      );

      if (pageText.length > 0) {
        pages.push(pageText);
      }
    }

    const text = pages.join("\n\n");

    return {
      text,
      pageCount: document.numPages,
      excerpt: text.slice(0, 2400),
    };
  } finally {
    document.destroy();
  }
}
