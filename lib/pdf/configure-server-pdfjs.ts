interface PdfWorkerModuleLike {
  WorkerMessageHandler?: unknown;
}

interface PdfJsModuleLike {
  GlobalWorkerOptions?: {
    workerPort?: unknown;
    workerSrc?: string;
  };
}

export function configureServerPdfJs(pdfjs: unknown) {
  const configuredPdfjs = pdfjs as PdfJsModuleLike;
  const globalScope = globalThis as typeof globalThis & {
    pdfjsWorker?: PdfWorkerModuleLike;
  };

  if (!globalScope.pdfjsWorker?.WorkerMessageHandler && typeof require === "function") {
    const workerModule = eval("require")("pdfjs-dist/legacy/build/pdf.worker.js") as PdfWorkerModuleLike;
    globalScope.pdfjsWorker = workerModule;
  }

  if (!configuredPdfjs.GlobalWorkerOptions) {
    return;
  }

  configuredPdfjs.GlobalWorkerOptions.workerPort = null;
  configuredPdfjs.GlobalWorkerOptions.workerSrc = "";
}
