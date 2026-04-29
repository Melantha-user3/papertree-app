"use client";

import { startTransition, useEffect, useEffectEvent, useMemo, useRef } from "react";
import { toast } from "sonner";
import { usePaperTreeStore } from "@/lib/store/use-papertree-store";
import type {
  PaperEdgeRecord,
  PaperNodeDetailRecord,
  PaperNodeRecord,
  ProjectRecord,
} from "@/lib/types/papertree";

const PROJECT_STORAGE_KEY = "papertree.currentProjectId";

interface PapersListResponse {
  nodes?: PaperNodeRecord[];
  edges?: PaperEdgeRecord[];
  error?: string;
}

interface PaperDetailResponse {
  node?: PaperNodeDetailRecord;
  error?: string;
}

interface ProjectsResponse {
  projects?: ProjectRecord[];
  error?: string;
}

class RequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new RequestError(payload.error || "Request failed.", response.status);
  }

  return payload;
}

function readStoredProjectId() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(PROJECT_STORAGE_KEY);
}

function storeProjectId(projectId: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (projectId) {
    window.localStorage.setItem(PROJECT_STORAGE_KEY, projectId);
  } else {
    window.localStorage.removeItem(PROJECT_STORAGE_KEY);
  }
}

export function usePaperTreeRuntime() {
  const {
    projects,
    currentProjectId,
    nodes,
    selectedNodeId,
    setProjects,
    setCurrentProjectId,
    setNodes,
    setEdges,
    selectNode,
    setSelectedNode,
    setLoadingNodes,
    setLoadingSelectedNode,
    setUploading,
    setErrorMessage,
    setUploadProgress,
    setIsSyncing,
  } = usePaperTreeStore();
  const pollingRef = useRef<number | null>(null);

  const hasPendingAnalysis = useMemo(
    () =>
      nodes.some(
        (node) => node.analysis_status === "uploaded" || node.analysis_status === "analyzing",
      ),
    [nodes],
  );

  async function refreshProjects() {
    const payload = await readJson<ProjectsResponse>(
      await fetch("/api/projects", {
        cache: "no-store",
      }),
    );

    startTransition(() => {
      const nextProjects = payload.projects || [];
      setProjects(nextProjects);

      if (nextProjects.length === 0) {
        setCurrentProjectId(null);
        return;
      }

      const storedProjectId = readStoredProjectId();
      const preferredProjectId =
        nextProjects.some((project) => project.id === currentProjectId)
          ? currentProjectId
          : nextProjects.some((project) => project.id === storedProjectId)
            ? storedProjectId
            : nextProjects[0]?.id;

      if (preferredProjectId && preferredProjectId !== currentProjectId) {
        setCurrentProjectId(preferredProjectId);
        storeProjectId(preferredProjectId);
      } else if (!currentProjectId && preferredProjectId) {
        setCurrentProjectId(preferredProjectId);
        storeProjectId(preferredProjectId);
      }
    });
  }

  async function refreshNodes() {
    if (!currentProjectId) {
      startTransition(() => {
        setNodes([]);
        setEdges([]);
        selectNode(null);
        setSelectedNode(null);
      });
      return;
    }

    setLoadingNodes(true);

    try {
      const payload = await readJson<PapersListResponse>(
        await fetch(`/api/papers?projectId=${encodeURIComponent(currentProjectId)}`, {
          cache: "no-store",
        }),
      );

      startTransition(() => {
        setNodes(payload.nodes || []);
        setEdges(payload.edges || []);
        setErrorMessage(null);

        if (!selectedNodeId && payload.nodes?.[0]?.id) {
          selectNode(payload.nodes[0].id);
        }

        if (
          selectedNodeId &&
          payload.nodes &&
          !payload.nodes.some((node) => node.id === selectedNodeId)
        ) {
          selectNode(payload.nodes[0]?.id || null);
          setSelectedNode(null);
        }
      });
    } catch (error) {
      if (error instanceof RequestError && error.status === 401) {
        startTransition(() => {
          setNodes([]);
          setEdges([]);
          selectNode(null);
          setSelectedNode(null);
        });
      }

      setErrorMessage(error instanceof Error ? error.message : "Failed to load papers.");
    } finally {
      setLoadingNodes(false);
    }
  }

  async function refreshSelectedNode(nodeId: string) {
    if (!currentProjectId) {
      return;
    }

    setLoadingSelectedNode(true);

    try {
      const payload = await readJson<PaperDetailResponse>(
        await fetch(
          `/api/papers/${nodeId}?projectId=${encodeURIComponent(currentProjectId)}`,
          {
            cache: "no-store",
          },
        ),
      );

      startTransition(() => {
        setSelectedNode(payload.node || null);
        setIsSyncing(payload.node?.analysis_status === "analyzing");
        setErrorMessage(null);
      });
    } catch (error) {
      if (error instanceof RequestError && error.status === 401) {
        startTransition(() => {
          selectNode(null);
          setSelectedNode(null);
        });
      }

      setErrorMessage(error instanceof Error ? error.message : "Failed to load paper detail.");
    } finally {
      setLoadingSelectedNode(false);
    }
  }

  async function queueAnalysis(nodeId: string) {
    if (!currentProjectId) {
      throw new Error("Select a project before starting analysis.");
    }

    await readJson<{ analysis_status: string }>(
      await fetch("/api/papers/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nodeId, projectId: currentProjectId }),
      }),
    );
  }

  async function uploadPaper(file: File) {
    if (!currentProjectId) {
      toast.error("Create or select a project first.");
      return;
    }

    setUploading(true);
    setErrorMessage(null);
    setUploadProgress(10);
    setIsSyncing(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", currentProjectId);

      setUploadProgress(45);
      const payload = await readJson<{ node: PaperNodeRecord }>(
        await fetch("/api/papers/upload", {
          method: "POST",
          body: formData,
        }),
      );

      startTransition(() => {
        selectNode(payload.node.id);
      });

      setUploadProgress(70);
      await refreshNodes();
      await queueAnalysis(payload.node.id);
      await refreshNodes();
      await refreshSelectedNode(payload.node.id);
      setUploadProgress(100);
      toast.success("PDF uploaded. Analysis started.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed.";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setUploading(false);
      setIsSyncing(false);
      window.setTimeout(() => setUploadProgress(0), 600);
    }
  }

  async function retryAnalysis(nodeId?: string | null) {
    if (!nodeId) {
      return;
    }

    setErrorMessage(null);
    setIsSyncing(true);

    try {
      await queueAnalysis(nodeId);
      await refreshNodes();
      await refreshSelectedNode(nodeId);
      toast.success("Analysis retried.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to re-run analysis.";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSyncing(false);
    }
  }

  async function createNewProject(name: string) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    try {
      const payload = await readJson<{ project: ProjectRecord }>(
        await fetch("/api/projects", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: trimmedName }),
        }),
      );

      const nextProjects = [...projects, payload.project];
      startTransition(() => {
        setProjects(nextProjects);
        setCurrentProjectId(payload.project.id);
        setErrorMessage(null);
      });
      storeProjectId(payload.project.id);
      toast.success("Project created.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create project.";
      setErrorMessage(message);
      toast.error(message);
    }
  }

  function changeProject(projectId: string) {
    startTransition(() => {
      setCurrentProjectId(projectId);
      setErrorMessage(null);
    });
    storeProjectId(projectId);
  }

  async function relayoutProject() {
    if (!currentProjectId) {
      return;
    }

    try {
      await readJson<{ ok: boolean }>(
        await fetch("/api/papers/layout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ projectId: currentProjectId }),
        }),
      );
      await refreshNodes();
      if (selectedNodeId) {
        await refreshSelectedNode(selectedNodeId);
      }
      toast.success("Timeline layout updated.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to relayout project.";
      setErrorMessage(message);
      toast.error(message);
    }
  }

  const runRefreshProjects = useEffectEvent(() => {
    void refreshProjects();
  });

  const runRefreshNodes = useEffectEvent(() => {
    void refreshNodes();
  });

  const runRefreshSelectedNode = useEffectEvent((nodeId: string) => {
    void refreshSelectedNode(nodeId);
  });

  useEffect(() => {
    runRefreshProjects();
  }, []);

  useEffect(() => {
    if (!currentProjectId) {
      return;
    }

    runRefreshNodes();
  }, [currentProjectId]);

  useEffect(() => {
    if (!selectedNodeId) {
      setSelectedNode(null);
      setIsSyncing(false);
      return;
    }

    runRefreshSelectedNode(selectedNodeId);
  }, [currentProjectId, selectedNodeId, setIsSyncing, setSelectedNode]);

  useEffect(() => {
    if (!hasPendingAnalysis) {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    if (!pollingRef.current) {
      pollingRef.current = window.setInterval(() => {
        runRefreshNodes();
        if (selectedNodeId) {
          runRefreshSelectedNode(selectedNodeId);
        }
      }, 3000);
    }

    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [hasPendingAnalysis, selectedNodeId, currentProjectId]);

  useEffect(() => {
    function handleRefreshRequest() {
      runRefreshNodes();
      if (selectedNodeId) {
        runRefreshSelectedNode(selectedNodeId);
      }
    }

    window.addEventListener("papertree:refresh", handleRefreshRequest);
    return () => {
      window.removeEventListener("papertree:refresh", handleRefreshRequest);
    };
  }, [selectedNodeId, currentProjectId]);

  return {
    refreshNodes,
    refreshProjects,
    retryAnalysis,
    uploadPaper,
    createNewProject,
    changeProject,
    relayoutProject,
  };
}
