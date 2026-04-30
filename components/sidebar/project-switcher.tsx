"use client";

import { FolderGit2, Plus, WandSparkles } from "lucide-react";
import type { ProjectRecord } from "@/lib/types/papertree";

interface ProjectSwitcherProps {
  readOnly?: boolean;
  projects: ProjectRecord[];
  currentProjectId: string | null;
  onChangeProject: (projectId: string) => void;
  onCreateProject: (name: string) => Promise<void>;
  onRelayout: () => Promise<void>;
}

export function ProjectSwitcher({
  readOnly = false,
  projects,
  currentProjectId,
  onChangeProject,
  onCreateProject,
  onRelayout,
}: ProjectSwitcherProps) {
  async function handleCreateProject() {
    const name = window.prompt("New project name");
    if (!name) {
      return;
    }

    await onCreateProject(name);
  }

  return (
    <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-2">
        <FolderGit2 className="h-4 w-4 text-teal-600" />
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Project</p>
      </div>
      <select
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-300"
        value={currentProjectId ?? ""}
        onChange={(event) => onChangeProject(event.target.value)}
      >
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
          disabled={readOnly}
          onClick={handleCreateProject}
        >
          <Plus className="h-4 w-4" />
          New
        </button>
        <button
          type="button"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
          disabled={readOnly}
          onClick={onRelayout}
        >
          <WandSparkles className="h-4 w-4" />
          Relayout
        </button>
      </div>
    </div>
  );
}
