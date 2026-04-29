"use client";

import { type MouseEvent, useEffect, useRef, useState } from "react";

export interface CoverPreviewPosition {
  top: number;
  left: number;
  side: "left" | "right";
}

const PREVIEW_WIDTH = 220;
const PREVIEW_HEIGHT = 300;
const VIEWPORT_PADDING = 16;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function useHoverCoverPreview(delayMs = 300) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<CoverPreviewPosition>({
    top: VIEWPORT_PADDING,
    left: VIEWPORT_PADDING,
    side: "right",
  });
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const updatePosition = (target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    const canRenderRight = rect.right + PREVIEW_WIDTH + VIEWPORT_PADDING <= window.innerWidth;
    const side: CoverPreviewPosition["side"] = canRenderRight ? "right" : "left";
    const left = canRenderRight ? rect.right + 12 : rect.left - PREVIEW_WIDTH - 12;
    const rawTop = rect.top + rect.height / 2 - PREVIEW_HEIGHT / 2;
    const maxTop = window.innerHeight - PREVIEW_HEIGHT - VIEWPORT_PADDING;

    setPosition({
      top: clamp(rawTop, VIEWPORT_PADDING, Math.max(maxTop, VIEWPORT_PADDING)),
      left: clamp(left, VIEWPORT_PADDING, window.innerWidth - PREVIEW_WIDTH - VIEWPORT_PADDING),
      side,
    });
  };

  const onMouseEnter = (event: MouseEvent<HTMLElement>) => {
    updatePosition(event.currentTarget);
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      setIsOpen(true);
    }, delayMs);
  };

  const onMouseMove = (event: MouseEvent<HTMLElement>) => {
    if (!isOpen) return;
    updatePosition(event.currentTarget);
  };

  const onMouseLeave = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    setIsOpen(false);
  };

  return {
    isOpen,
    position,
    onMouseEnter,
    onMouseMove,
    onMouseLeave,
  };
}
