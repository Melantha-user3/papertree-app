export function PdfPlaceholder() {
  return (
    <div className="flex h-full flex-col p-3">
      <div className="border-b border-white/10 pb-2">
        <p className="text-sm font-semibold text-slate-100">PDF Reader</p>
        <p className="text-xs text-slate-400">Phase 2: PDF.js + annotation overlay</p>
      </div>
      <div className="mt-3 grid flex-1 place-items-center rounded-xl border border-dashed border-white/20 bg-slate-900/40 p-4">
        <div className="max-w-xs space-y-2 text-center">
          <p className="text-sm text-slate-200">PDF canvas placeholder</p>
          <p className="text-xs text-slate-400">
            Next step will mount a text-layer overlay for selection capture and annotation anchors.
          </p>
        </div>
      </div>
      <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
        <p className="text-xs font-medium text-slate-200">Annotation Layer Contract</p>
        <p className="mt-1 text-xs text-slate-400">
          {"{ node_id, pdf_page, text_content, bounding_box }"}
        </p>
      </div>
    </div>
  );
}
