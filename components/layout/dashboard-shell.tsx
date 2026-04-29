"use client";

import { motion } from "framer-motion";
import { LogOut, ShieldCheck } from "lucide-react";
import dynamic from "next/dynamic";
import { Group, Panel, Separator } from "react-resizable-panels";
import { TreeView } from "@/components/sidebar/tree-view";
import { usePaperTreeRuntime } from "@/lib/hooks/use-papertree-runtime";
import { usePaperTreeStore } from "@/lib/store/use-papertree-store";

interface DashboardShellProps {
  children: React.ReactNode;
  userEmail: string;
}

const PdfViewer = dynamic(
  () => import("@/components/reader/pdf-viewer").then((module) => module.PdfViewer),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full w-full place-items-center text-sm text-slate-500">
        Loading PDF viewer...
      </div>
    ),
  },
);

export function DashboardShell({ children, userEmail }: DashboardShellProps) {
  const { refreshNodes, retryAnalysis, uploadPaper, createNewProject, changeProject, relayoutProject } =
    usePaperTreeRuntime();
  const projects = usePaperTreeStore((state) => state.projects);
  const currentProjectId = usePaperTreeStore((state) => state.currentProjectId);

  return (
    <div className="flex h-screen w-screen overflow-hidden p-3 lg:p-4">
      <motion.div
        className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-slate-900">PAPERTREE</p>
            <p className="mt-1 text-xs text-slate-500">
              Auth-protected paper analysis with user-scoped storage and signed PDF access.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700 md:inline-flex">
              <ShieldCheck className="h-3.5 w-3.5" />
              Auth protected
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Signed in</p>
              <p className="max-w-[220px] truncate text-sm text-slate-900">{userEmail}</p>
            </div>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </form>
          </div>
        </header>

        <Group
          id="dashboard-panels"
          orientation="horizontal"
          className="relative isolate min-h-0 flex-1 w-full"
        >
          <Panel
            id="dashboard-sidebar"
            defaultSize="20%"
            minSize="12%"
            maxSize="30%"
          >
            <aside className="h-full overflow-hidden">
              <div className="h-full min-w-[250px]">
                <TreeView
                  onRefresh={refreshNodes}
                  onUpload={uploadPaper}
                  onCreateProject={createNewProject}
                  onChangeProject={changeProject}
                  onRelayout={relayoutProject}
                  projects={projects}
                  currentProjectId={currentProjectId}
                />
              </div>
            </aside>
          </Panel>

          <Separator className="panel-resize-handle relative z-50" />

          <Panel
            id="dashboard-canvas"
            defaultSize="60%"
            minSize="30%"
            className="flex-1 min-w-0"
          >
            <main className="h-full min-h-0 overflow-hidden">
              {children}
            </main>
          </Panel>

          <Separator className="panel-resize-handle relative z-50" />

          <Panel
            id="dashboard-reader"
            defaultSize="20%"
            minSize="15%"
            maxSize="40%"
          >
            <aside className="h-full w-full overflow-hidden">
              <div className="h-full min-w-[250px]">
                <PdfViewer onRetryAnalysis={retryAnalysis} />
              </div>
            </aside>
          </Panel>
        </Group>
      </motion.div>
    </div>
  );
}
