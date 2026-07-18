"use client";

import type { ChangeEvent } from "react";
import { useMemo, useRef } from "react";
import { FilePlus2, FileText, FolderTree, PanelLeftClose, RefreshCw } from "lucide-react";
import { GroupPanel } from "@/components/sidebar/group-panel";
import { ProjectSwitcher } from "@/components/sidebar/project-switcher";
import { usePaperTreeStore } from "@/lib/store/use-papertree-store";
import type { PaperAnalysisStatus, PaperNodeRecord, ProjectRecord } from "@/lib/types/papertree";

interface TreeViewProps {
  isGuest?: boolean;
  onCollapse?: () => void;
  onRefresh: () => Promise<void>;
  onUpload: (file: File) => Promise<void>;
  onCreateProject: (name: string) => Promise<void>;
  onCreateGroup: (name: string) => Promise<void>;
  onChangeProject: (projectId: string) => void;
  onJoinGroup: (inviteCode: string) => Promise<void>;
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
  uploaded: "text-slate-400",
  analyzing: "text-blue-600",
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
        className={`relative w-full rounded-md px-2.5 py-2.5 text-left transition ${
          isSelected
            ? "bg-blue-50"
            : item.is_academic
              ? "hover:bg-white"
              : "opacity-70 hover:bg-white"
        }`}
        onClick={() => onSelect(item.id)}
      >
        {isSelected ? (
          <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-blue-600" />
        ) : null}
        <div className="flex items-start gap-2">
          <FileText
            className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
              isSelected ? "text-blue-600" : "text-slate-400"
            }`}
          />
          <div className="min-w-0 flex-1">
            <span
              className={`block truncate text-[13px] font-medium ${
                item.is_academic ? "text-slate-800" : "text-slate-400"
              }`}
            >
              {item.title}
            </span>
            <div className="mt-1.5 flex items-center gap-2 text-[10px]">
              <span className={analysisStatusClassMap[item.analysis_status]}>
                {analysisStatusLabelMap[item.analysis_status]}
              </span>
              {item.metadata.analysis?.mode ? (
                <span className="text-slate-400">{item.metadata.analysis.mode}</span>
              ) : null}
              <span className={item.is_academic ? "text-slate-400" : "text-slate-300"}>
                {item.is_academic ? item.publication_year ?? "year ?" : "non-academic"}
              </span>
              <span className="text-slate-400">{item.status}</span>
            </div>
            {summary ? (
              <p className="mt-1.5 line-clamp-2 text-[11px] leading-4.5 text-slate-500">{summary}</p>
            ) : (
              <p className="mt-1.5 text-[11px] text-slate-500">
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
  onCollapse,
  onRefresh,
  onUpload,
  onCreateProject,
  onCreateGroup,
  onChangeProject,
  onJoinGroup,
  onRelayout,
  projects,
  currentProjectId,
}: TreeViewProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const errorMessage = usePaperTreeStore((state) => state.errorMessage);
  const groups = usePaperTreeStore((state) => state.groups);
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
    <div className="h-full overflow-y-auto px-3 py-2.5">
      <div className="space-y-4">
        <div className="flex h-8 items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderTree className="h-3.5 w-3.5 text-blue-500" />
            <p className="text-xs font-medium text-slate-700">Library</p>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-1 font-mono text-[10px] text-slate-400">{nodes.length}</span>
            {onCollapse ? (
              <button
                type="button"
                className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
                aria-label="Collapse library"
                title="Collapse library"
                onClick={onCollapse}
              >
                <PanelLeftClose className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>
        <ProjectSwitcher
          readOnly={isGuest}
          projects={projects}
          currentProjectId={currentProjectId}
          onChangeProject={onChangeProject}
          onCreateProject={onCreateProject}
          onRelayout={onRelayout}
        />
        <GroupPanel
          currentProjectId={currentProjectId}
          groups={groups}
          isGuest={isGuest}
          onCreateGroup={onCreateGroup}
          onJoinGroup={onJoinGroup}
          projects={projects}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={isGuest || isUploading || !currentProjectId}
            onClick={() => inputRef.current?.click()}
          >
            <FilePlus2 className="h-4 w-4" />
            {isGuest ? "Sign in to upload" : isUploading ? "Uploading..." : "Upload PDF"}
          </button>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
            disabled={isLoadingNodes}
            onClick={handleRefresh}
            aria-label="Refresh papers"
            title="Refresh papers"
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
          <p className="border-l-2 border-blue-200 pl-2.5 text-[11px] leading-4.5 text-slate-500">
            Demo is read-only. Sign in to upload and save your analysis.
          </p>
        ) : null}
        {uploadProgress > 0 ? (
          <progress
            className="h-1 w-full overflow-hidden rounded [&::-webkit-progress-value]:bg-blue-500"
            value={uploadProgress}
            max={100}
          />
        ) : null}
        <label className="flex items-center justify-between py-1 text-[11px] text-slate-500">
          <span>Show Non-Academic Files</span>
          <input
            type="checkbox"
            className="accent-blue-600"
            checked={showNonAcademicFiles}
            onChange={(event) => setShowNonAcademicFiles(event.target.checked)}
          />
        </label>
      </div>

      {errorMessage ? (
        <div className="mt-3 border-l-2 border-rose-300 bg-rose-50 p-3 text-xs text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {sortedNodes.length === 0 ? (
        <div className="mt-4 border-t border-dashed border-slate-200 pt-4 text-xs leading-5 text-slate-500">
          {currentProjectId
            ? "No papers yet. Upload a PDF to create the first node."
            : "Create a project to start building a literature tree."}
        </div>
      ) : (
        <ul className="mt-3 space-y-0.5 border-t border-slate-100 pt-3">
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
