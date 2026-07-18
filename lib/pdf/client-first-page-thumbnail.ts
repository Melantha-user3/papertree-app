"use client";

interface PdfViewportLike {
  height: number;
  width: number;
}

interface PdfPageLike {
  getViewport: (options: { scale: number }) => PdfViewportLike;
  render: (options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfViewportLike;
  }) => { promise: Promise<void> };
}

interface PdfDocumentLike {
  destroy: () => Promise<void>;
  getPage: (pageNumber: number) => Promise<PdfPageLike>;
}

interface PdfJsModuleLike {
  GlobalWorkerOptions: {
    workerSrc: string;
  };
  getDocument: (
    source: { data: Uint8Array } | { url: string },
  ) => { promise: Promise<PdfDocumentLike> };
}

let pdfJsPromise: Promise<PdfJsModuleLike> | null = null;

async function loadPdfJs() {
  if (!pdfJsPromise) {
    pdfJsPromise = import("pdfjs-dist/legacy/build/pdf").then((module) => {
      const pdfjs = module as unknown as PdfJsModuleLike;
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
      return pdfjs;
    });
  }

  return pdfJsPromise;
}

export async function renderPdfFirstPageToCanvas(
  source: File | string,
  canvas: HTMLCanvasElement,
  targetWidth = 720,
) {
  const pdfjs = await loadPdfJs();
  const loadingSource =
    typeof source === "string"
      ? { url: source }
      : { data: new Uint8Array(await source.arrayBuffer()) };
  const documentProxy = await pdfjs.getDocument(loadingSource).promise;

  try {
    const page = await documentProxy.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const outputScale =
      typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    const scale = (targetWidth / baseViewport.width) * outputScale;
    const viewport = page.getViewport({ scale });
    const context = canvas.getContext("2d", { alpha: false });

    if (!context) {
      throw new Error("Canvas rendering is unavailable.");
    }

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    canvas.style.aspectRatio = `${viewport.width} / ${viewport.height}`;
    context.save();
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();

    await page.render({
      canvasContext: context,
      viewport,
    }).promise;

    return {
      height: viewport.height / outputScale,
      width: viewport.width / outputScale,
    };
  } finally {
    await documentProxy.destroy();
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to encode the PDF thumbnail."));
        }
      },
      type,
      quality,
    );
  });
}

export async function createPdfFirstPageThumbnail(file: File) {
  const canvas = document.createElement("canvas");
  await renderPdfFirstPageToCanvas(file, canvas, 960);
  return canvasToBlob(canvas, "image/webp", 0.88);
}
