"use client";

import { useEffect } from "react";
import type { SelectionLogEntry } from "@/lib/types/papertree";

interface UsePdfTextSelectionOptions {
  container: HTMLDivElement | null;
  nodeId: string | null;
  scale: number;
  onCapture: (entry: SelectionLogEntry) => void;
}

export function usePdfTextSelection({ container, nodeId, scale, onCapture }: UsePdfTextSelectionOptions) {
  useEffect(() => {
    if (!container || !nodeId) return;

    const onMouseUp = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim() ?? "";
      if (!selection || !text || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const anchor = selection.anchorNode?.parentElement;
      const pageLayer = anchor?.closest(".rpv-core__page-layer") as HTMLElement | null;
      if (!pageLayer) return;

      const allPages = Array.from(container.querySelectorAll(".rpv-core__page-layer"));
      const page = allPages.indexOf(pageLayer) + 1;
      if (page <= 0) return;

      const pageRect = pageLayer.getBoundingClientRect();
      const x = (rect.left - pageRect.left) / scale;
      const w = rect.width / scale;
      const h = rect.height / scale;
      const domYTop = (rect.top - pageRect.top) / scale;
      const pageHeight = pageRect.height / scale;
      const y = pageHeight - (domYTop + h);

      const entry: SelectionLogEntry = {
        nodeId,
        page,
        text,
        bbox: { x, y, w, h, pageHeight, scale },
        timestamp: new Date().toISOString(),
      };

      onCapture(entry);
      console.log("[PaperTree selection]", entry);
    };

    container.addEventListener("mouseup", onMouseUp);
    return () => container.removeEventListener("mouseup", onMouseUp);
  }, [container, nodeId, scale, onCapture]);
}
