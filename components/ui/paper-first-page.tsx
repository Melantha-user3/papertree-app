"use client";

import Image, { type ImageLoader } from "next/image";
import { FileX2 } from "lucide-react";
import { PdfFirstPageThumbnail } from "@/components/ui/pdf-first-page-thumbnail";

interface PaperFirstPageProps {
  className?: string;
  coverUrl?: string | null;
  pdfUrl?: string | null;
  targetWidth?: number;
  title: string;
}

const passthroughImageLoader: ImageLoader = ({ src }) => src;

export function PaperFirstPage({
  className = "",
  coverUrl,
  pdfUrl,
  targetWidth = 520,
  title,
}: PaperFirstPageProps) {
  if (coverUrl) {
    return (
      <div className={`relative overflow-hidden bg-white ${className}`}>
        <Image
          loader={passthroughImageLoader}
          src={coverUrl}
          alt={`${title} first page`}
          fill
          sizes={`${targetWidth}px`}
          className="pointer-events-none object-contain"
          draggable={false}
          unoptimized
        />
      </div>
    );
  }

  if (pdfUrl) {
    return (
      <PdfFirstPageThumbnail
        src={pdfUrl}
        title={title}
        targetWidth={targetWidth}
        className={className}
      />
    );
  }

  return (
    <div
      className={`grid place-items-center bg-white text-slate-300 ${className}`}
      role="img"
      aria-label={`${title} PDF unavailable`}
    >
      <FileX2 className="h-5 w-5" strokeWidth={1.5} />
    </div>
  );
}
