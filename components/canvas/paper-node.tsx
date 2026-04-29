import { Handle, Position, type NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import { CoverPreviewPopover } from "@/components/ui/cover-preview-popover";
import type { LlmMode, PaperAnalysisStatus, PaperTreeStatus } from "@/lib/types/papertree";

interface PaperNodeData {
  title: string;
  status: PaperTreeStatus;
  analysisStatus: PaperAnalysisStatus;
  parentCount: number;
  coverUrl?: string | null;
  pdfUrl?: string | null;
  analysisMode?: Exclude<LlmMode, "auto"> | null;
  summary?: string | null;
  isDimmed?: boolean;
  isSynthesisFocused?: boolean;
}

const statusText: Record<PaperTreeStatus, string> = {
  unread: "Unread",
  deep: "Deep",
  replicated: "Replicated",
  disputed: "Disputed",
  pending_review: "Pending",
};

const analysisToneMap: Record<PaperAnalysisStatus, string> = {
  uploaded: "border-amber-200 bg-amber-50",
  analyzing: "border-sky-200 bg-sky-50",
  ready: "border-teal-200 bg-white",
  error: "border-rose-200 bg-rose-50",
};

export function PaperNode({ data, selected }: NodeProps) {
  const payload = data as unknown as PaperNodeData;
  const summary =
    payload.summary || (payload.parentCount > 1 ? "Multi-parent paper node." : "Awaiting analysis summary.");

  return (
    <motion.div
      className={`w-64 rounded-[24px] border p-3 shadow-[0_18px_48px_-28px_rgba(15,23,42,0.38)] backdrop-blur-md ${
        analysisToneMap[payload.analysisStatus]
      } ${payload.isSynthesisFocused ? "ring-2 ring-cyan-400/70" : ""}`}
      style={{ opacity: payload.isDimmed ? 0.28 : 1 }}
      whileHover={{ y: -4, scale: 1.015 }}
      animate={selected ? { scale: [1, 1.025, 1], y: [0, -2, 0] } : { scale: 1, y: 0 }}
      transition={{ duration: selected ? 2.2 : 0.18, repeat: selected ? Infinity : 0 }}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !bg-teal-500" />
      <CoverPreviewPopover
        title={payload.title}
        coverUrl={payload.coverUrl}
        pdfUrl={payload.pdfUrl}
        summary={summary}
        metaLabel={payload.analysisMode ? `${payload.analysisMode} mode` : payload.analysisStatus}
      >
        <div className="w-full min-w-0">
          <p className="line-clamp-2 text-sm font-semibold text-slate-900">{payload.title}</p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>{statusText[payload.status]}</span>
            <span>{payload.analysisMode ? `${payload.analysisStatus} · ${payload.analysisMode}` : payload.analysisStatus}</span>
          </div>
          <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-600">{summary}</p>
        </div>
      </CoverPreviewPopover>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !bg-cyan-500" />
    </motion.div>
  );
}
