import { CanvasWorkspace } from "@/components/canvas/canvas-workspace";

export default function CanvasPage() {
  return (
    <section className="h-full w-full rounded-2xl border border-slate-200 bg-white shadow-sm">
      <CanvasWorkspace />
    </section>
  );
}
