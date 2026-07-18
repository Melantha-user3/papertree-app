import { Handle, Position, type NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import { PaperFirstPage } from "@/components/ui/paper-first-page";
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
  filterOpacity?: number; // From Parameter Lens MVP
}

const statusText: Record<PaperTreeStatus, string> = {
  unread: "Unread",
  deep: "Deep",
  replicated: "Replicated",
  disputed: "Disputed",
  pending_review: "Pending",
};

const analysisToneMap: Record<PaperAnalysisStatus, string> = {
  uploaded: "bg-white border-slate-200",
  analyzing: "bg-blue-50 border-blue-200",
  ready: "bg-white border-slate-200",
  error: "bg-rose-50 border-rose-200",
};

export function PaperNode({ data, selected }: NodeProps) {
  const payload = data as unknown as PaperNodeData;
  const summary =
    payload.summary || (payload.parentCount > 1 ? "Multi-parent paper node." : "Awaiting analysis summary.");

  const baseOpacity = payload.isDimmed ? 0.28 : 1;
  const finalOpacity = payload.filterOpacity !== undefined ? payload.filterOpacity : baseOpacity;

  return (
    <motion.div
      className={`w-56 overflow-hidden rounded-lg border p-2 shadow-[0_14px_36px_rgba(15,23,42,0.12)] ${
        analysisToneMap[payload.analysisStatus]
      } ${
        payload.isSynthesisFocused || selected
          ? "border-blue-500 ring-2 ring-blue-100"
          : ""
      }`}
      style={{ opacity: finalOpacity }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.18 }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-white !bg-blue-500"
      />
      <PaperFirstPage
        title={payload.title}
        coverUrl={payload.coverUrl}
        pdfUrl={payload.pdfUrl}
        targetWidth={420}
        className="aspect-[5/7] w-full rounded-md border border-slate-200 bg-white"
      />
      <div className="min-w-0 px-1 pb-1 pt-3">
        <p className="line-clamp-3 text-[13px] font-semibold leading-[1.35rem] text-slate-800">
          {payload.title}
        </p>
        <div className="mt-2.5 flex items-center justify-between gap-2 text-[10px] text-slate-400">
          <span>{statusText[payload.status]}</span>
          <span className="truncate text-right">
            {payload.analysisMode
              ? `${payload.analysisStatus} · ${payload.analysisMode}`
              : payload.analysisStatus}
          </span>
        </div>
        <p className="mt-2 line-clamp-3 text-[11px] leading-[1.05rem] text-slate-500">
          {summary}
        </p>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-white !bg-blue-500"
      />
    </motion.div>
  );
}
