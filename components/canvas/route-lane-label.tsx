import type { NodeProps } from "@xyflow/react";

interface RouteLaneLabelData {
  label: string;
  count: number;
}

export function RouteLaneLabel({ data }: NodeProps) {
  const payload = data as unknown as RouteLaneLabelData;

  return (
    <div className="pointer-events-none border-l-2 border-blue-200 px-3 py-1">
      <p className="text-[10px] font-medium uppercase text-slate-600">
        {payload.label}
      </p>
      <p className="mt-0.5 text-[10px] text-slate-400">{payload.count} papers</p>
    </div>
  );
}
