import type { NodeProps } from "@xyflow/react";

interface RouteLaneLabelData {
  label: string;
  count: number;
}

export function RouteLaneLabel({ data }: NodeProps) {
  const payload = data as unknown as RouteLaneLabelData;

  return (
    <div className="pointer-events-none rounded-full border border-slate-300/80 bg-white/85 px-3 py-1.5 shadow-sm backdrop-blur-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {payload.label}
      </p>
      <p className="mt-0.5 text-[11px] text-slate-400">{payload.count} papers</p>
    </div>
  );
}
