"use client";

import { useEffect, useRef, useState } from "react";
import { renderPdfFirstPageToCanvas } from "@/lib/pdf/client-first-page-thumbnail";

interface PdfFirstPageThumbnailProps {
  className?: string;
  src: string;
  title: string;
  targetWidth?: number;
}

export function PdfFirstPageThumbnail({
  className = "",
  src,
  title,
  targetWidth = 520,
}: PdfFirstPageThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderKey = `${src}:${targetWidth}`;
  const [renderState, setRenderState] = useState<{
    key: string;
    status: "ready" | "error";
  } | null>(null);
  const status = renderState?.key === renderKey ? renderState.status : "loading";

  useEffect(() => {
    const canvas = canvasRef.current;
    let cancelled = false;

    if (!canvas) {
      return;
    }

    void renderPdfFirstPageToCanvas(src, canvas, targetWidth)
      .then(() => {
        if (!cancelled) {
          setRenderState({ key: renderKey, status: "ready" });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRenderState({ key: renderKey, status: "error" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [renderKey, src, targetWidth]);

  return (
    <div
      className={`relative overflow-hidden bg-white ${className}`}
      role="img"
      aria-label={`${title} first page`}
    >
      <div
        className={`absolute inset-0 grid place-items-center bg-white transition-opacity duration-200 ${
          status === "ready" ? "opacity-0" : "opacity-100"
        }`}
      >
        {status === "loading" ? (
          <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
        ) : (
          <span className="font-mono text-[8px] uppercase text-slate-300">
            PDF unavailable
          </span>
        )}
      </div>
      <canvas
        ref={canvasRef}
        className={`relative h-full w-full object-contain transition-opacity duration-200 ${
          status === "ready" ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden="true"
      />
    </div>
  );
}
