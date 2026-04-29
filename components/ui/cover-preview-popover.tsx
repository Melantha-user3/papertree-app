"use client";

import type { MouseEvent, ReactNode } from "react";
import { CoverPreviewPortal } from "@/components/ui/cover-preview-portal";
import { useHoverCoverPreview } from "@/components/ui/use-hover-cover-preview";

interface CoverPreviewPopoverProps {
  title: string;
  coverUrl?: string | null;
  pdfUrl?: string | null;
  summary?: string | null;
  metaLabel?: string | null;
  delayMs?: number;
  children: ReactNode;
}

export function CoverPreviewPopover({
  title,
  coverUrl,
  pdfUrl,
  summary,
  metaLabel,
  delayMs = 180,
  children,
}: CoverPreviewPopoverProps) {
  const { isOpen, onMouseEnter, onMouseLeave, onMouseMove, position } = useHoverCoverPreview(
    delayMs,
  );

  return (
    <>
      <div
        className="flex min-w-0"
        onMouseEnter={onMouseEnter as (event: MouseEvent<HTMLElement>) => void}
        onMouseMove={onMouseMove as (event: MouseEvent<HTMLElement>) => void}
        onMouseLeave={onMouseLeave}
      >
        {children}
      </div>
      <CoverPreviewPortal
        open={isOpen}
        title={title}
        coverUrl={coverUrl}
        pdfUrl={pdfUrl}
        summary={summary}
        metaLabel={metaLabel}
        position={position}
      />
    </>
  );
}
