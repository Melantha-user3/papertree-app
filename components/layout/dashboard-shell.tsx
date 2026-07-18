"use client";

import { useState, useSyncExternalStore } from "react";
import {
  FolderTree,
  LogIn,
  LogOut,
  PanelLeftOpen,
  PanelRightOpen,
  UsersRound,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Group, Panel, Separator } from "react-resizable-panels";
import { PaperTreeMark } from "@/components/brand/papertree-mark";
import { TreeView } from "@/components/sidebar/tree-view";
import { usePaperTreeRuntime } from "@/lib/hooks/use-papertree-runtime";
import { usePaperTreeStore } from "@/lib/store/use-papertree-store";

interface DashboardShellProps {
  children: React.ReactNode;
  userEmail: string | null;
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

function subscribeToDesktopMediaQuery(onStoreChange: () => void) {
  const query = window.matchMedia("(min-width: 1024px)");
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
}

function useIsDesktop() {
  return useSyncExternalStore(
    subscribeToDesktopMediaQuery,
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => false,
  );
}

export function DashboardShell({ children, userEmail }: DashboardShellProps) {
  const {
    refreshNodes,
    retryAnalysis,
    uploadPaper,
    createNewProject,
    createGroup,
    joinGroup,
    changeProject,
    relayoutProject,
  } = usePaperTreeRuntime();
  const [mobilePanel, setMobilePanel] = useState<"library" | "reader" | null>(null);
  const [isDesktopLibraryOpen, setIsDesktopLibraryOpen] = useState(true);
  const isDesktop = useIsDesktop();
  const projects = usePaperTreeStore((state) => state.projects);
  const currentProjectId = usePaperTreeStore((state) => state.currentProjectId);
  const nodes = usePaperTreeStore((state) => state.nodes);
  const isGuest = !userEmail;

  const libraryPanel = (
    <TreeView
      isGuest={isGuest}
      onRefresh={refreshNodes}
      onUpload={uploadPaper}
      onCreateProject={createNewProject}
      onCreateGroup={createGroup}
      onChangeProject={changeProject}
      onJoinGroup={joinGroup}
      onRelayout={relayoutProject}
      projects={projects}
      currentProjectId={currentProjectId}
    />
  );

  const desktopLibraryPanel = (
    <TreeView
      isGuest={isGuest}
      onCollapse={() => setIsDesktopLibraryOpen(false)}
      onRefresh={refreshNodes}
      onUpload={uploadPaper}
      onCreateProject={createNewProject}
      onCreateGroup={createGroup}
      onChangeProject={changeProject}
      onJoinGroup={joinGroup}
      onRelayout={relayoutProject}
      projects={projects}
      currentProjectId={currentProjectId}
    />
  );

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-50 text-slate-900">
      <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            aria-label="Open library"
            onClick={() => setMobilePanel("library")}
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2.5">
            <PaperTreeMark className="h-7 w-7" />
            <div className="leading-none">
              <p className="text-[12px] font-semibold tracking-[0.14em] text-slate-900">
                PAPERTREE
              </p>
              <p className="mt-1 hidden text-[8px] font-medium text-slate-400 sm:block">
                by MIMIRtech
              </p>
            </div>
          </div>
          <span className="hidden h-3 w-px bg-slate-200 sm:block" />
          <p className="hidden truncate text-xs text-slate-400 sm:block">
            {isGuest ? "Research workspace · demo" : "Private research workspace"}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <span className="mr-2 hidden items-center gap-2 text-[11px] text-slate-400 md:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            {isGuest ? "Demo" : "Protected"}
          </span>
          {isGuest ? (
            <Link
              href="/login"
              className="inline-flex h-8 items-center gap-2 rounded-lg px-2.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign in
            </Link>
          ) : (
            <>
              <p className="hidden max-w-[200px] truncate px-2 text-xs text-slate-500 md:block">
                {userEmail}
              </p>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                  aria-label="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </form>
            </>
          )}
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            aria-label="Open reader"
            onClick={() => setMobilePanel("reader")}
          >
            <PanelRightOpen className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        {isDesktop ? (
          <>
            <aside
              className={`absolute bottom-3 left-3 top-3 z-40 overflow-hidden rounded-lg border border-slate-200/90 bg-white/95 shadow-[0_18px_50px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-[width] duration-200 ${
                isDesktopLibraryOpen ? "w-[280px]" : "w-12"
              }`}
            >
              {isDesktopLibraryOpen ? (
                desktopLibraryPanel
              ) : (
                <nav
                  className="flex h-full flex-col items-center gap-1 py-2"
                  aria-label="Collapsed workspace navigation"
                >
                  <button
                    type="button"
                    className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                    aria-label="Open library"
                    title="Open library"
                    onClick={() => setIsDesktopLibraryOpen(true)}
                  >
                    <PanelLeftOpen className="h-4 w-4" />
                  </button>
                  <span className="my-1 h-px w-6 bg-slate-200" />
                  <button
                    type="button"
                    className="relative grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                    aria-label="Show papers"
                    title="Papers"
                    onClick={() => setIsDesktopLibraryOpen(true)}
                  >
                    <FolderTree className="h-4 w-4" />
                    {nodes.length > 0 ? (
                      <span className="absolute right-0.5 top-0.5 grid min-h-3.5 min-w-3.5 place-items-center rounded-full bg-blue-600 px-1 text-[8px] font-semibold text-white">
                        {nodes.length}
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                    aria-label="Show groups"
                    title="Groups"
                    onClick={() => setIsDesktopLibraryOpen(true)}
                  >
                    <UsersRound className="h-4 w-4" />
                  </button>
                </nav>
              )}
            </aside>

            <Group
              id="dashboard-panels"
              orientation="horizontal"
              className="h-full min-h-0 w-full"
            >
              <Panel
                id="dashboard-canvas"
                defaultSize="76%"
                minSize="48%"
                className="min-w-0 flex-1"
              >
                <main
                  className={`h-full min-h-0 overflow-hidden transition-[padding] duration-200 ${
                    isDesktopLibraryOpen ? "pl-[292px]" : "pl-[60px]"
                  }`}
                >
                  {children}
                </main>
              </Panel>

              <Separator className="panel-resize-handle relative z-50" />

              <Panel id="dashboard-reader" defaultSize="24%" minSize="18%" maxSize="42%">
                <aside className="h-full w-full overflow-hidden border-l border-slate-200 bg-white">
                  <div className="h-full min-w-[250px]">
                    <PdfViewer onRetryAnalysis={retryAnalysis} />
                  </div>
                </aside>
              </Panel>
            </Group>
          </>
        ) : (
          <main className="h-full min-h-0 overflow-hidden">{children}</main>
        )}

        {mobilePanel ? (
          <>
            <button
              type="button"
              className="absolute inset-0 z-40 bg-slate-900/20 backdrop-blur-[2px] lg:hidden"
              aria-label="Close panel"
              onClick={() => setMobilePanel(null)}
            />
            <aside
              className={`absolute inset-y-0 z-50 w-[min(90vw,360px)] overflow-hidden border-slate-200 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.18)] lg:hidden ${
                mobilePanel === "library" ? "left-0 border-r" : "right-0 border-l"
              }`}
            >
              <button
                type="button"
                className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-500 transition hover:text-slate-900"
                aria-label="Close panel"
                onClick={() => setMobilePanel(null)}
              >
                <X className="h-4 w-4" />
              </button>
              <div className="h-full pt-10">
                {mobilePanel === "library" ? (
                  libraryPanel
                ) : (
                  <PdfViewer onRetryAnalysis={retryAnalysis} />
                )}
              </div>
            </aside>
          </>
        ) : null}
      </div>
    </div>
  );
}
