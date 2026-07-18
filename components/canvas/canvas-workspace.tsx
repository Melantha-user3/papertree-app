"use client";

import type { MouseEvent } from "react";
import { useMemo, useState } from "react";
import { Layers, Network, Sparkles } from "lucide-react";
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
import { PaperCardCollection } from "@/components/canvas/paper-card-collection";
import { RouteLaneLabel } from "@/components/canvas/route-lane-label";
import { deriveTechRouteLanes } from "@/lib/flow/apply-timeline-layout";
import { getLockedSynthesisChain } from "@/lib/flow/synthesis-chain";
import { usePaperTreeStore } from "@/lib/store/use-papertree-store";
import type {
  ExperimentalParam,
  PaperAnalysisStatus,
  PaperTreeStatus,
  SynthesisReview,
} from "@/lib/types/papertree";

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
  const [isCollectionMode, setIsCollectionMode] = useState(false);
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
    // === Canvas Interaction MVP ===
    efficiencyMin,
    efficiencyMax,
    setEfficiencyRange,
    pulseEdge,
    recentlyPulsedEdgeKey,
  } = usePaperTreeStore();
  const academicNodes = useMemo(() => nodes.filter((node) => node.is_academic), [nodes]);
  const laneLabels = useMemo(() => deriveTechRouteLanes(nodes), [nodes]);
  const chainNodeIdSet = useMemo(() => new Set(synthesisChainNodeIds), [synthesisChainNodeIds]);

  // === Canvas Interaction MVP: Parameter filtering ===
  const nodeEfficiencyMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const node of academicNodes) {
      const params: ExperimentalParam[] = node.metadata.experimental_params ?? [];
      const eff = params.find(
        (param) => param.key === "efficiency" || param.label.toLowerCase() === "efficiency",
      );
      if (eff && typeof eff.value === "number") {
        map.set(node.id, eff.value);
      }
    }
    return map;
  }, [academicNodes]);

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
    const paperNodes = academicNodes.map((node) => {
      const effValue = nodeEfficiencyMap.get(node.id);
      let filterOpacity: number | undefined;

      if (effValue !== undefined) {
        const inRange = effValue >= efficiencyMin && effValue <= efficiencyMax;
        filterOpacity = inRange ? 1 : 0.2;
      }

      return {
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
          filterOpacity,
        } satisfies PaperNodeData,
      };
    });
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
  }, [academicNodes, chainNodeIdSet, isSynthesisMode, laneLabels, parentCount, selectedNodeId, efficiencyMin, efficiencyMax, nodeEfficiencyMap]);

  const flowEdges = useMemo<Edge[]>(() => {
    const visibleNodeIds = new Set(academicNodes.map((node) => node.id));

    return edges
      .filter((edge) => visibleNodeIds.has(edge.source_id) && visibleNodeIds.has(edge.target_id))
      .map((edge, index) => {
        const edgeKey = `${edge.source_id}-${edge.target_id}`;
        const isPulsing = recentlyPulsedEdgeKey === edgeKey;

        return {
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
                  ? "#2563eb"
                  : "#60a5fa"
                : "#94a3b8",
          },
          style:
            edge.relation_type === "semantic"
              ? {
                  stroke: edge.is_locked ? "#2563eb" : "#60a5fa",
                  strokeWidth:
                    isSynthesisMode &&
                    chainNodeIdSet.has(edge.source_id) &&
                    chainNodeIdSet.has(edge.target_id)
                      ? 3
                      : isPulsing
                        ? 4.5 // temporary boost for magnetic snap feel
                        : edge.is_locked
                          ? 2.5
                          : 2,
                  strokeDasharray: edge.is_locked ? undefined : "6 6",
                  transition: isPulsing ? "stroke-width 0.15s ease-out" : "stroke-width 0.1s ease-out",
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
        };
      });
  }, [academicNodes, chainNodeIdSet, edges, isSynthesisMode, recentlyPulsedEdgeKey]);

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

    const currentlyLocked = Boolean(edge.data?.is_locked);
    const nextLocked = !currentlyLocked;

    // === Canvas Interaction MVP: Direct lock, no confirm ===
    if (!nextLocked) {
      // For unlock we keep the confirm for safety in MVP
      const shouldUnlock = window.confirm("Unlock this semantic link?");
      if (!shouldUnlock) return;
    }

    try {
      const response = await fetch("/api/edges", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: currentProjectId,
          sourceId: edge.source,
          targetId: edge.target,
          relationType: edge.data?.relation_type,
          isLocked: nextLocked,
        }),
      });

      if (!response.ok) return;

      // Trigger magnetic pulse animation only when locking
      if (nextLocked) {
        pulseEdge(edge.source, edge.target);
      }

      window.dispatchEvent(new Event("papertree:refresh"));
    } catch {
      // silent fail for MVP
    }
  }

  return (
    <div
      className={`workspace-grid relative h-full w-full overflow-hidden ${
        isSynthesisMode ? "brightness-[1.03]" : ""
      }`}
    >
      {/* === Canvas Interaction MVP: Hard-coded Efficiency Parameter Lens === */}
      {!isCollectionMode ? (
      <div className="absolute bottom-4 left-1/2 z-30 hidden -translate-x-1/2 items-center gap-3 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-[11px] text-slate-500 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-xl md:flex">
        <span className="font-medium text-slate-700">Efficiency</span>
        <input
          type="range"
          min={0}
          max={30}
          step={0.5}
          value={efficiencyMin}
          onChange={(e) => setEfficiencyRange(Number(e.target.value), efficiencyMax)}
          className="w-24 accent-blue-600"
        />
        <span className="w-6 font-mono tabular-nums text-slate-500">{efficiencyMin}</span>
        <span className="text-slate-300">—</span>
        <input
          type="range"
          min={0}
          max={30}
          step={0.5}
          value={efficiencyMax}
          onChange={(e) => setEfficiencyRange(efficiencyMin, Number(e.target.value))}
          className="w-24 accent-blue-600"
        />
        <span className="w-6 font-mono tabular-nums text-slate-500">{efficiencyMax}</span>
        <span className="text-slate-400">%</span>
        <span className="ml-2 font-mono text-[9px] text-blue-600">
          {nodeEfficiencyMap.size} nodes with data
        </span>
      </div>
      ) : null}

      <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
        <button
          type="button"
          aria-label={isSynthesisMode ? "Turn off synthesis mode" : "Turn on synthesis mode"}
          title={isSynthesisMode ? "Turn off synthesis mode" : "Turn on synthesis mode"}
          className={`inline-flex h-8 items-center gap-2 rounded-lg border px-2.5 text-xs font-medium shadow-sm transition ${
            isSynthesisMode
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-slate-200 bg-white/95 text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
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
          <span className="hidden sm:inline">
            {isSynthesisMode ? "Synthesis on" : "Synthesis"}
          </span>
        </button>
        {isSynthesisMode && synthesisChain && synthesisChain.nodes.length > 1 ? (
          <button
            type="button"
            className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white/95 px-2.5 text-xs font-medium text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
            onClick={handleGenerateReview}
            disabled={isGeneratingSynthesis}
          >
            {isGeneratingSynthesis ? "Generating..." : "Generate Review"}
          </button>
        ) : null}
      </div>
      <div className="absolute right-4 top-4 z-20">
        <button
          type="button"
          aria-label={isCollectionMode ? "Show graph" : "Show paper collection"}
          title={isCollectionMode ? "Show graph" : "Show paper collection"}
          className={`inline-flex h-8 items-center gap-2 rounded-lg border px-2.5 text-xs font-medium shadow-sm transition ${
            isCollectionMode
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-slate-200 bg-white/95 text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          }`}
          onClick={() => setIsCollectionMode((value) => !value)}
        >
          {isCollectionMode ? <Network className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
          <span className="hidden sm:inline">
            {isCollectionMode ? "Graph" : "Collection"}
          </span>
        </button>
      </div>
      {isCollectionMode ? (
        <PaperCardCollection
          nodes={academicNodes}
          selectedNodeId={selectedNodeId}
          onSelectNode={selectNode}
        />
      ) : (
        <ReactFlow
          key={`paper-flow-${flowNodes.length}`}
          className="bg-transparent"
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
          defaultViewport={{ x: 480, y: 300, zoom: 0.68 }}
        >
          <MiniMap className="hidden md:block" pannable zoomable />
          <Controls />
          <Background gap={28} size={1} color="#dbe4ef" />
        </ReactFlow>
      )}
      {!isCollectionMode && flowNodes.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="border-l-2 border-blue-200 px-5 py-1 text-left">
            <p className="text-sm font-medium text-slate-700">Canvas is waiting for papers</p>
            <p className="mt-2 max-w-sm text-xs leading-5 text-slate-500">
              Upload PDFs from the left sidebar. Research papers will land on the timeline after
              analysis. Non-academic files stay in the sidebar only.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
