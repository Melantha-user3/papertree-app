import { create } from "zustand";
import type { Viewport } from "@xyflow/react";
import type {
  PaperEdgeRecord,
  GroupRecord,
  PaperNodeDetailRecord,
  PaperNodeRecord,
  ProjectRecord,
  SelectionLogEntry,
  SynthesisReview,
} from "@/lib/types/papertree";

interface PanelState {
  sidebar: boolean;
  reader: boolean;
}

interface PaperTreeState {
  projects: ProjectRecord[];
  groups: GroupRecord[];
  currentProjectId: string | null;
  nodes: PaperNodeRecord[];
  edges: PaperEdgeRecord[];
  selectedNodeId: string | null;
  selectedNode: PaperNodeDetailRecord | null;
  activePdfUrl: string | null;
  viewport: Viewport;
  panels: PanelState;
  uploadProgress: number;
  isSyncing: boolean;
  isLoadingNodes: boolean;
  isLoadingSelectedNode: boolean;
  isUploading: boolean;
  showNonAcademicFiles: boolean;
  isSynthesisMode: boolean;
  synthesisTargetNodeId: string | null;
  synthesisChainNodeIds: string[];
  synthesisReview: SynthesisReview | null;
  isGeneratingSynthesis: boolean;
  errorMessage: string | null;
  selectionLog: SelectionLogEntry[];

  // === Canvas Interaction MVP additions ===
  efficiencyMin: number;
  efficiencyMax: number;
  recentlyPulsedEdgeKey: string | null; // for magnetic lock animation

  setProjects: (projects: ProjectRecord[]) => void;
  setGroups: (groups: GroupRecord[]) => void;
  setCurrentProjectId: (projectId: string | null) => void;
  setNodes: (nodes: PaperNodeRecord[]) => void;
  setEdges: (edges: PaperEdgeRecord[]) => void;
  selectNode: (nodeId: string | null) => void;
  setSelectedNode: (node: PaperNodeDetailRecord | null) => void;
  setViewport: (viewport: Viewport) => void;
  togglePanel: (panel: keyof PanelState) => void;
  setUploadProgress: (value: number) => void;
  setIsSyncing: (value: boolean) => void;
  setLoadingNodes: (value: boolean) => void;
  setLoadingSelectedNode: (value: boolean) => void;
  setUploading: (value: boolean) => void;
  setShowNonAcademicFiles: (value: boolean) => void;
  setIsSynthesisMode: (value: boolean) => void;
  setSynthesisTargetNodeId: (nodeId: string | null) => void;
  setSynthesisChainNodeIds: (nodeIds: string[]) => void;
  setSynthesisReview: (review: SynthesisReview | null) => void;
  setIsGeneratingSynthesis: (value: boolean) => void;
  setErrorMessage: (message: string | null) => void;
  pushSelectionLog: (entry: SelectionLogEntry) => void;

  // === Canvas Interaction MVP ===
  setEfficiencyRange: (min: number, max: number) => void;
  pulseEdge: (sourceId: string, targetId: string) => void;
}

function findPdfUrl(nodes: PaperNodeRecord[], nodeId: string | null): string | null {
  if (!nodeId) return null;
  const node = nodes.find((item) => item.id === nodeId);
  return node?.metadata.pdf_url ?? null;
}

export const usePaperTreeStore = create<PaperTreeState>((set) => ({
  projects: [],
  groups: [],
  currentProjectId: null,
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedNode: null,
  activePdfUrl: null,
  viewport: { x: 0, y: 0, zoom: 1 },
  panels: { sidebar: true, reader: true },
  uploadProgress: 0,
  isSyncing: false,
  isLoadingNodes: false,
  isLoadingSelectedNode: false,
  isUploading: false,
  showNonAcademicFiles: false,
  isSynthesisMode: false,
  synthesisTargetNodeId: null,
  synthesisChainNodeIds: [],
  synthesisReview: null,
  isGeneratingSynthesis: false,
  errorMessage: null,
  selectionLog: [],

  // === Canvas Interaction MVP ===
  efficiencyMin: 0,
  efficiencyMax: 30,
  recentlyPulsedEdgeKey: null,
  setProjects: (projects) => set({ projects }),
  setGroups: (groups) => set({ groups }),
  setCurrentProjectId: (currentProjectId) =>
    set({
      currentProjectId,
      nodes: [],
      edges: [],
      selectedNodeId: null,
      selectedNode: null,
      activePdfUrl: null,
      isSynthesisMode: false,
      synthesisTargetNodeId: null,
      synthesisChainNodeIds: [],
      synthesisReview: null,
      isGeneratingSynthesis: false,
      viewport: { x: 0, y: 0, zoom: 1 },
    }),
  setNodes: (nodes) =>
    set((state) => ({
      nodes,
      activePdfUrl: state.selectedNode?.signed_file_url ?? findPdfUrl(nodes, state.selectedNodeId),
    })),
  setEdges: (edges) => set({ edges }),
  selectNode: (selectedNodeId) => set({ selectedNodeId }),
  setSelectedNode: (selectedNode) =>
    set((state) => ({
      selectedNode,
      activePdfUrl:
        selectedNode?.signed_file_url ??
        findPdfUrl(state.nodes, selectedNode?.id ?? state.selectedNodeId),
      isSyncing: selectedNode?.analysis_status === "analyzing",
    })),
  setViewport: (viewport) => set({ viewport }),
  togglePanel: (panel) =>
    set((state) => ({ panels: { ...state.panels, [panel]: !state.panels[panel] } })),
  setUploadProgress: (uploadProgress) => set({ uploadProgress }),
  setIsSyncing: (isSyncing) => set({ isSyncing }),
  setLoadingNodes: (isLoadingNodes) => set({ isLoadingNodes }),
  setLoadingSelectedNode: (isLoadingSelectedNode) => set({ isLoadingSelectedNode }),
  setUploading: (isUploading) => set({ isUploading }),
  setShowNonAcademicFiles: (showNonAcademicFiles) => set({ showNonAcademicFiles }),
  setIsSynthesisMode: (isSynthesisMode) =>
    set((state) => ({
      isSynthesisMode,
      synthesisTargetNodeId: isSynthesisMode ? state.synthesisTargetNodeId : null,
      synthesisChainNodeIds: isSynthesisMode ? state.synthesisChainNodeIds : [],
      synthesisReview: isSynthesisMode ? state.synthesisReview : null,
    })),
  setSynthesisTargetNodeId: (synthesisTargetNodeId) => set({ synthesisTargetNodeId }),
  setSynthesisChainNodeIds: (synthesisChainNodeIds) => set({ synthesisChainNodeIds }),
  setSynthesisReview: (synthesisReview) => set({ synthesisReview }),
  setIsGeneratingSynthesis: (isGeneratingSynthesis) => set({ isGeneratingSynthesis }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  pushSelectionLog: (entry) => set((state) => ({ selectionLog: [...state.selectionLog, entry] })),

  // === Canvas Interaction MVP actions ===
  setEfficiencyRange: (min, max) => set({ efficiencyMin: min, efficiencyMax: max }),
  pulseEdge: (sourceId, targetId) => {
    const key = `${sourceId}-${targetId}`;
    set({ recentlyPulsedEdgeKey: key });
    // Clear the pulse after animation duration
    setTimeout(() => {
      // Only clear if it's still the same pulse (avoid race conditions)
      set((state) => (state.recentlyPulsedEdgeKey === key ? { recentlyPulsedEdgeKey: null } : {}));
    }, 650);
  },
}));
