"use client";

import type { MouseEvent } from "react";
import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PaperNode } from "@/components/canvas/paper-node";
import { RouteLaneLabel } from "@/components/canvas/route-lane-label";
import { deriveTechRouteLanes } from "@/lib/flow/apply-timeline-layout";
import { getLockedSynthesisChain } from "@/lib/flow/synthesis-chain";
import { usePaperTreeStore } from "@/lib/store/use-papertree-store";
import type { PaperAnalysisStatus, PaperTreeStatus, SynthesisReview } from "@/lib/types/papertree";

interface PaperNodeData extends Record<string, unknown> {
  title: string;
  status: PaperTreeStatus;
  analysisStatus: PaperAnalysisStatus;
  parentCount: number;
  coverUrl: string | null;
  pdfUrl: string | null;
  analysisMode: string | null;
  summary: string | null;
}

const nodeTypes: NodeTypes = {
  paperNode: PaperNode,
  routeLaneLabel: RouteLaneLabel,
};
const LABEL_X = -980;

export function CanvasWorkspace() {
  const {
    nodes,
    edges,
    selectedNodeId,
    selectNode,
    setViewport,
    currentProjectId,
    isSynthesisMode,
    synthesisTargetNodeId,
    synthesisChainNodeIds,
    setIsSynthesisMode,
    setSynthesisTargetNodeId,
    setSynthesisChainNodeIds,
    setSynthesisReview,
    isGeneratingSynthesis,
    setIsGeneratingSynthesis,
    setErrorMessage,
  } = usePaperTreeStore();
  const academicNodes = useMemo(() => nodes.filter((node) => node.is_academic), [nodes]);
  const laneLabels = useMemo(() => deriveTechRouteLanes(nodes), [nodes]);
  const chainNodeIdSet = useMemo(() => new Set(synthesisChainNodeIds), [synthesisChainNodeIds]);

  const parentCount = useMemo(() => {
    return edges.reduce<Record<string, number>>((acc, edge) => {
      acc[edge.target_id] = (acc[edge.target_id] ?? 0) + 1;
      return acc;
    }, {});
  }, [edges]);

  const synthesisChain = useMemo(() => {
    if (!synthesisTargetNodeId) {
      return null;
    }

    return getLockedSynthesisChain(academicNodes, edges, synthesisTargetNodeId);
  }, [academicNodes, edges, synthesisTargetNodeId]);

  const flowNodes = useMemo<Node[]>(() => {
    const paperNodes = academicNodes.map((node) => ({
      id: node.id,
      type: "paperNode",
      selected: selectedNodeId === node.id,
      position: {
        x: node.position_x ?? 120,
        y: node.position_y ?? 100,
      },
      data: {
        title: node.title,
        status: node.status,
        analysisStatus: node.analysis_status,
        parentCount: parentCount[node.id] ?? 0,
        coverUrl: node.metadata.cover_url ?? null,
        pdfUrl: node.metadata.pdf_url ?? null,
        analysisMode: node.metadata.analysis?.mode ?? null,
        summary: node.summary ?? node.source_excerpt ?? null,
        isDimmed:
          isSynthesisMode && chainNodeIdSet.size > 0 ? !chainNodeIdSet.has(node.id) : false,
        isSynthesisFocused: chainNodeIdSet.has(node.id),
      } satisfies PaperNodeData,
    }));
    const labelNodes = laneLabels.map((lane) => ({
      id: `lane:${lane.key}`,
      type: "routeLaneLabel",
      position: {
        x: LABEL_X,
        y: lane.centerY,
      },
      draggable: false,
      selectable: false,
      data: {
        label: lane.label,
        count: lane.count,
      },
    }));

    return [...labelNodes, ...paperNodes];
  }, [academicNodes, chainNodeIdSet, isSynthesisMode, laneLabels, parentCount, selectedNodeId]);

  const flowEdges = useMemo<Edge[]>(() => {
    const visibleNodeIds = new Set(academicNodes.map((node) => node.id));

    return edges
      .filter((edge) => visibleNodeIds.has(edge.source_id) && visibleNodeIds.has(edge.target_id))
      .map((edge, index) => ({
      id: `${edge.source_id}-${edge.target_id}-${index}`,
      source: edge.source_id,
      target: edge.target_id,
      animated: edge.relation_type === "semantic" && !edge.is_locked,
      type: "smoothstep",
      label: edge.relation_type === "semantic" ? (edge.is_locked ? "confirmed" : "suggested") : undefined,
      data: {
        relation_type: edge.relation_type,
        is_locked: edge.is_locked,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color:
          edge.relation_type === "semantic"
            ? edge.is_locked
              ? "#0f766e"
              : "#14b8a6"
            : "#94a3b8",
      },
      style:
        edge.relation_type === "semantic"
          ? {
              stroke: edge.is_locked ? "#0f766e" : "#14b8a6",
              strokeWidth:
                isSynthesisMode &&
                chainNodeIdSet.has(edge.source_id) &&
                chainNodeIdSet.has(edge.target_id)
                  ? 3
                  : edge.is_locked
                    ? 2.5
                    : 2,
              strokeDasharray: edge.is_locked ? undefined : "6 6",
              opacity:
                isSynthesisMode && chainNodeIdSet.size > 0
                  ? chainNodeIdSet.has(edge.source_id) && chainNodeIdSet.has(edge.target_id)
                    ? 1
                    : 0.15
                  : 1,
            }
          : {
              stroke: "#94a3b8",
              strokeWidth: 1.5,
              opacity:
                isSynthesisMode && chainNodeIdSet.size > 0
                  ? chainNodeIdSet.has(edge.source_id) && chainNodeIdSet.has(edge.target_id)
                    ? 0.5
                    : 0.12
                  : 1,
            },
    }));
  }, [academicNodes, chainNodeIdSet, edges, isSynthesisMode]);

  async function handleGenerateReview() {
    if (!currentProjectId || !synthesisTargetNodeId) {
      return;
    }

    setIsGeneratingSynthesis(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/synthesis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: currentProjectId,
          targetNodeId: synthesisTargetNodeId,
        }),
      });
      const payload = (await response.json()) as {
        review?: SynthesisReview;
        error?: string;
      };

      if (!response.ok || !payload.review) {
        throw new Error(payload.error || "Failed to generate synthesis review.");
      }

      setSynthesisReview(payload.review);
      setSynthesisChainNodeIds(payload.review.nodeIds);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to generate synthesis review.");
    } finally {
      setIsGeneratingSynthesis(false);
    }
  }

  async function handleEdgeClick(_: MouseEvent, edge: Edge) {
    if (!currentProjectId || edge.data?.relation_type !== "semantic") {
      return;
    }

    const nextLocked = !Boolean(edge.data?.is_locked);
    const shouldContinue = window.confirm(
      nextLocked
        ? "Confirm this semantic link and lock it?"
        : "Unlock this semantic link so AI can update it again?",
    );

    if (!shouldContinue) {
      return;
    }

    const response = await fetch("/api/edges", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId: currentProjectId,
        sourceId: edge.source,
        targetId: edge.target,
        relationType: edge.data?.relation_type,
        isLocked: nextLocked,
      }),
    });

    if (!response.ok) {
      return;
    }

    window.dispatchEvent(new Event("papertree:refresh"));
  }

  return (
    <div
      className={`relative h-full w-full ${
        isSynthesisMode
          ? "bg-[radial-gradient(circle_at_top,#ecfeff_0%,#f8fafc_42%,#eff6ff_100%)]"
          : ""
      }`}
    >
      <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
        <button
          type="button"
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition ${
            isSynthesisMode
              ? "border-cyan-300 bg-cyan-50 text-cyan-800"
              : "border-slate-200 bg-white/90 text-slate-700 hover:bg-slate-50"
          }`}
          onClick={() => {
            const next = !isSynthesisMode;
            setIsSynthesisMode(next);
            if (!next) {
              setSynthesisTargetNodeId(null);
              setSynthesisChainNodeIds([]);
              setSynthesisReview(null);
            }
          }}
        >
          <Sparkles className="h-4 w-4" />
          {isSynthesisMode ? "Synthesis Mode On" : "Synthesis Mode"}
        </button>
        {isSynthesisMode && synthesisChain && synthesisChain.nodes.length > 1 ? (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            onClick={handleGenerateReview}
            disabled={isGeneratingSynthesis}
          >
            {isGeneratingSynthesis ? "Generating..." : "Generate Review"}
          </button>
        ) : null}
      </div>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => {
          if (node.type === "paperNode") {
            selectNode(node.id);
            if (isSynthesisMode) {
              const nextChain = getLockedSynthesisChain(academicNodes, edges, node.id);
              setSynthesisTargetNodeId(node.id);
              setSynthesisChainNodeIds(nextChain.nodeIds);
              setSynthesisReview(null);
            }
          }
        }}
        onEdgeClick={handleEdgeClick}
        onMoveEnd={(_, viewport) => setViewport(viewport)}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <MiniMap pannable zoomable className="!bg-white" />
        <Controls className="!border-slate-200 !bg-white" />
        <Background gap={24} size={1} color="#e2e8f0" />
      </ReactFlow>
      {flowNodes.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/95 px-6 py-5 text-center shadow-sm">
            <p className="text-sm font-medium text-slate-900">Canvas is waiting for academic papers</p>
            <p className="mt-2 max-w-sm text-xs text-slate-500">
              Upload PDFs from the left sidebar. Research papers will land on the timeline after
              analysis. Non-academic files stay in the sidebar only.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
