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
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FolderGit2 className="h-3.5 w-3.5 text-blue-500" />
          <p className="text-[11px] font-medium text-slate-500">Project</p>
        </div>
        <div className="flex items-center">
          <button
            type="button"
            className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
            disabled={readOnly}
            onClick={handleCreateProject}
            aria-label="Create project"
            title="Create project"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
            disabled={readOnly}
            onClick={onRelayout}
            aria-label="Relayout project"
            title="Relayout project"
          >
            <WandSparkles className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <select
        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        value={currentProjectId ?? ""}
        onChange={(event) => onChangeProject(event.target.value)}
      >
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
    </section>
  );
}
