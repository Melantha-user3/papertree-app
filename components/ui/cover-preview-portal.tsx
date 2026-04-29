"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image, { type ImageLoader } from "next/image";
import { useState } from "react";
import { createPortal } from "react-dom";
import {
  buildFallbackCoverDataUrl,
  buildPdfPreviewUrl,
} from "@/lib/pdf/preview-helpers";
import type { CoverPreviewPosition } from "@/components/ui/use-hover-cover-preview";

interface CoverPreviewPortalProps {
  open: boolean;
  title: string;
  coverUrl?: string | null;
  pdfUrl?: string | null;
  summary?: string | null;
  metaLabel?: string | null;
  position: CoverPreviewPosition;
}

const passthroughImageLoader: ImageLoader = ({ src }) => src;

function PdfPreviewFrame({ src, title }: { src: string; title: string }) {
  const [isPdfLoading, setIsPdfLoading] = useState(true);

  return (
    <>
      <iframe
        src={src}
        title={`${title} first page preview`}
        className="h-full w-full border-0 bg-white"
        onLoad={() => setIsPdfLoading(false)}
      />
      {isPdfLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/88 backdrop-blur-sm">
          <div className="space-y-2 text-center">
            <div className="mx-auto h-10 w-10 animate-pulse rounded-2xl bg-slate-200" />
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-slate-500">
              Loading Preview
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function CoverPreviewPortal({
  open,
  title,
  coverUrl,
  pdfUrl,
  summary,
  metaLabel,
  position,
}: CoverPreviewPortalProps) {
  if (typeof document === "undefined") return null;

  const previewImage = coverUrl || null;
  const previewPdf = !previewImage && pdfUrl ? buildPdfPreviewUrl(pdfUrl) : null;
  const fallbackCover = !previewImage && !previewPdf ? buildFallbackCoverDataUrl(title) : null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key={title}
          initial={{ scale: 0.92, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 4 }}
          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          style={{
            top: position.top,
            left: position.left,
            transformOrigin: position.side === "right" ? "left center" : "right center",
          }}
          className="pointer-events-none fixed z-[9999] w-[220px] max-w-[24vw] overflow-hidden rounded-[24px] border border-white/75 bg-white/68 p-2.5 backdrop-blur-2xl shadow-2xl"
        >
          <div className="relative h-[248px] overflow-hidden rounded-[18px] border border-slate-200/80 bg-slate-100">
            {previewImage ? (
              <Image
                loader={passthroughImageLoader}
                src={previewImage}
                alt={`${title} cover`}
                fill
                sizes="220px"
                className="object-cover"
                decoding="async"
                unoptimized
              />
            ) : previewPdf ? (
              <PdfPreviewFrame key={previewPdf} src={previewPdf} title={title} />
            ) : fallbackCover ? (
              <Image
                loader={passthroughImageLoader}
                src={fallbackCover}
                alt={`${title} placeholder cover`}
                fill
                sizes="220px"
                className="object-cover"
                decoding="async"
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#e2e8f0_0%,#cbd5e1_55%,#94a3b8_100%)] p-6 text-center text-sm text-slate-700">
                Preview unavailable
              </div>
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/20 to-transparent" />
          </div>
          <div className="mt-2.5 space-y-1.5 px-0.5">
            {metaLabel ? (
              <span className="inline-flex rounded-full border border-teal-200/80 bg-teal-50/80 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.18em] text-teal-700">
                {metaLabel}
              </span>
            ) : null}
            <p className="line-clamp-2 text-[13px] font-semibold leading-tight text-slate-950">{title}</p>
            {summary ? (
              <p className="line-clamp-3 text-[11px] leading-4.5 text-slate-600">{summary}</p>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
