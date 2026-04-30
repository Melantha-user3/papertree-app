"use client";

import type { ChangeEvent } from "react";
import { useMemo, useRef } from "react";
import { FilePlus2, FileText, FolderTree, RefreshCw } from "lucide-react";
import { CoverPreviewPopover } from "@/components/ui/cover-preview-popover";
import { ProjectSwitcher } from "@/components/sidebar/project-switcher";
import { usePaperTreeStore } from "@/lib/store/use-papertree-store";
import type { PaperAnalysisStatus, PaperNodeRecord, ProjectRecord } from "@/lib/types/papertree";

interface TreeViewProps {
  isGuest?: boolean;
  onRefresh: () => Promise<void>;
  onUpload: (file: File) => Promise<void>;
  onCreateProject: (name: string) => Promise<void>;
  onChangeProject: (projectId: string) => void;
  onRelayout: () => Promise<void>;
  projects: ProjectRecord[];
  currentProjectId: string | null;
}

const analysisStatusLabelMap: Record<PaperAnalysisStatus, string> = {
  uploaded: "uploaded",
  analyzing: "analyzing",
  ready: "ready",
  error: "error",
};

const analysisStatusClassMap: Record<PaperAnalysisStatus, string> = {
  uploaded: "text-amber-600",
  analyzing: "text-sky-600",
  ready: "text-emerald-600",
  error: "text-rose-600",
};

function TreeNode({
  isSelected,
  item,
  onSelect,
}: {
  isSelected: boolean;
  item: PaperNodeRecord;
  onSelect: (nodeId: string) => void;
}) {
  const summary = item.summary || item.source_excerpt;
  return (
    <li className="select-none">
      <button
        type="button"
        className={`w-full rounded-xl border px-3 py-2 text-left transition ${
          isSelected
            ? "border-teal-300 bg-teal-50"
            : item.is_academic
              ? "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              : "border-slate-200 bg-slate-100/80 hover:border-slate-300 hover:bg-slate-100"
        }`}
        onClick={() => onSelect(item.id)}
      >
        <div className="flex items-start gap-2">
          <FileText
            className={`mt-0.5 h-4 w-4 shrink-0 ${item.is_academic ? "text-teal-600" : "text-slate-400"}`}
          />
          <div className="min-w-0 flex-1">
            <CoverPreviewPopover
              title={item.title}
              coverUrl={item.metadata.cover_url ?? null}
              pdfUrl={item.metadata.pdf_url ?? null}
              summary={summary}
              metaLabel={item.metadata.analysis?.mode ? `${item.metadata.analysis.mode} mode` : item.analysis_status}
            >
              <span
                className={`block truncate text-sm font-medium ${item.is_academic ? "text-slate-900" : "text-slate-500"}`}
              >
                {item.title}
              </span>
            </CoverPreviewPopover>
            <div className="mt-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em]">
              <span className={analysisStatusClassMap[item.analysis_status]}>
                {analysisStatusLabelMap[item.analysis_status]}
              </span>
              {item.metadata.analysis?.mode ? (
                <span className="text-slate-400">{item.metadata.analysis.mode}</span>
              ) : null}
              <span className={item.is_academic ? "text-slate-500" : "text-slate-400"}>
                {item.is_academic ? item.publication_year ?? "year ?" : "non-academic"}
              </span>
              <span className="text-slate-500">{item.status}</span>
            </div>
            {summary ? (
              <p className="mt-2 line-clamp-2 text-xs text-slate-500">{summary}</p>
            ) : (
              <p className="mt-2 text-xs text-slate-400">
                {item.analysis_status === "error"
                  ? item.analysis_error || "Analysis failed."
                  : "Waiting for analysis output."}
              </p>
            )}
          </div>
        </div>
      </button>
    </li>
  );
}

export function TreeView({
  isGuest = false,
  onRefresh,
  onUpload,
  onCreateProject,
  onChangeProject,
  onRelayout,
  projects,
  currentProjectId,
}: TreeViewProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const errorMessage = usePaperTreeStore((state) => state.errorMessage);
  const isLoadingNodes = usePaperTreeStore((state) => state.isLoadingNodes);
  const isUploading = usePaperTreeStore((state) => state.isUploading);
  const nodes = usePaperTreeStore((state) => state.nodes);
  const selectedNodeId = usePaperTreeStore((state) => state.selectedNodeId);
  const selectNode = usePaperTreeStore((state) => state.selectNode);
  const uploadProgress = usePaperTreeStore((state) => state.uploadProgress);
  const showNonAcademicFiles = usePaperTreeStore((state) => state.showNonAcademicFiles);
  const setShowNonAcademicFiles = usePaperTreeStore((state) => state.setShowNonAcademicFiles);

  const sortedNodes = useMemo(
    () =>
      [...nodes]
        .filter((node) => showNonAcademicFiles || node.is_academic)
        .sort(
        (left, right) =>
          new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
      ),
    [nodes, showNonAcademicFiles],
  );

  async function handleRefresh() {
    await onRefresh();
  }

  async function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    await onUpload(file);
    event.target.value = "";
  }

  return (
    <div className="h-full space-y-3 overflow-y-auto p-3">
      <div className="space-y-2 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <FolderTree className="h-4 w-4 text-teal-600" />
          <p className="text-sm font-semibold text-slate-800">PaperTree</p>
        </div>
        <p className="text-xs text-slate-500">
          Upload PDFs, store them per user in Supabase, and analyze them through the configured LLM
          provider.
        </p>
        <ProjectSwitcher
          readOnly={isGuest}
          projects={projects}
          currentProjectId={currentProjectId}
          onChangeProject={onChangeProject}
          onCreateProject={onCreateProject}
          onRelayout={onRelayout}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isGuest || isUploading || !currentProjectId}
            onClick={() => inputRef.current?.click()}
          >
            <FilePlus2 className="h-4 w-4" />
            {isGuest ? "Sign in to upload" : isUploading ? "Uploading..." : "Upload PDF"}
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoadingNodes}
            onClick={handleRefresh}
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingNodes ? "animate-spin" : ""}`} />
          </button>
          <input
            ref={inputRef}
            hidden
            accept="application/pdf"
            type="file"
            onChange={handleFileSelection}
          />
        </div>
        {isGuest ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Demo mode is read-only. Sign in to create projects, upload PDFs, and persist analysis.
          </p>
        ) : null}
        {uploadProgress > 0 ? (
          <progress
            className="h-1 w-full overflow-hidden rounded [&::-webkit-progress-value]:bg-teal-500"
            value={uploadProgress}
            max={100}
          />
        ) : null}
        <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
          <span>Show Non-Academic Files</span>
          <input
            type="checkbox"
            checked={showNonAcademicFiles}
            onChange={(event) => setShowNonAcademicFiles(event.target.checked)}
          />
        </label>
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {sortedNodes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
          {currentProjectId
            ? "No papers yet. Upload a PDF to create the first node."
            : "Create a project to start building a literature tree."}
        </div>
      ) : (
        <ul className="space-y-2">
          {sortedNodes.map((item) => (
            <TreeNode
              key={item.id}
              isSelected={item.id === selectedNodeId}
              item={item}
              onSelect={selectNode}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
