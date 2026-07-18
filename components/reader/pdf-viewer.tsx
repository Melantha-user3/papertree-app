"use client";

import { startTransition, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import {
  BookCopy,
  Copy,
  FileCode2,
  FileText,
  LoaderCircle,
  RotateCcw,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import { ChainMetricsChart } from "@/components/reader/chain-metrics-chart";
import { normalizeExperimentalParams } from "@/lib/metrics/experimental-params";
import { usePaperTreeStore } from "@/lib/store/use-papertree-store";
import { usePdfTextSelection } from "@/hooks/usePdfTextSelection";
import type {
  ChainMetricSeries,
  ExperimentalParam,
  PaperNodeRecord,
} from "@/lib/types/papertree";

const workerUrl = "/pdf.worker.min.js";

interface PdfViewerProps {
  onRetryAnalysis: (nodeId?: string | null) => Promise<void>;
}

function readStringArray(
  value: { key_points?: string[]; topics?: string[]; tech_route_tags?: string[] } | null | undefined,
  key: "key_points" | "topics" | "tech_route_tags",
) {
  const candidate = value?.[key];
  return Array.isArray(candidate) ? candidate : [];
}

function readExperimentalParams(value: ExperimentalParam[] | null | undefined) {
  return normalizeExperimentalParams(value);
}

function compareChainNodes(left: PaperNodeRecord, right: PaperNodeRecord) {
  const yearDelta =
    (left.publication_year ?? Number.MAX_SAFE_INTEGER) -
    (right.publication_year ?? Number.MAX_SAFE_INTEGER);
  if (yearDelta !== 0) {
    return yearDelta;
  }

  const createdDelta = new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
  if (createdDelta !== 0) {
    return createdDelta;
  }

  return left.id.localeCompare(right.id);
}

function buildFallbackMetricSeries(
  nodes: PaperNodeRecord[],
  chainNodeIds: string[],
): ChainMetricSeries[] {
  const chainNodes = chainNodeIds
    .map((nodeId) => nodes.find((node) => node.id === nodeId))
    .filter((node): node is PaperNodeRecord => Boolean(node))
    .toSorted(compareChainNodes);

  if (chainNodes.length < 2) {
    return [];
  }

  const fallbackStartYear =
    chainNodes.find((node) => node.publication_year != null)?.publication_year ??
    new Date().getFullYear() - (chainNodes.length - 1);

  return [
    {
      key: "test_efficiency",
      label: "Efficiency",
      unit: "%",
      points: chainNodes.map((node, index) => ({
        nodeId: node.id,
        title: node.title,
        publicationYear: node.publication_year ?? fallbackStartYear + index,
        value: Number((15 + index * 3.4).toFixed(1)),
        unit: "%",
        rawText: "Fallback mock data for chart preview.",
        venue: node.metadata.analysis?.venue ?? node.metadata.venue ?? null,
      })),
    },
  ];
}

export function PdfViewer({ onRetryAnalysis }: PdfViewerProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [chainMetricSeries, setChainMetricSeries] = useState<ChainMetricSeries[]>([]);
  const [selectedMetricKey, setSelectedMetricKey] = useState<string | null>(null);
  const [isLoadingChainMetrics, setIsLoadingChainMetrics] = useState(false);
  const [chainMetricsError, setChainMetricsError] = useState<string | null>(null);
  const chainMetricsRequestIdRef = useRef(0);
  const {
    currentProjectId,
    activePdfUrl,
    nodes,
    selectedNode,
    selectedNodeId,
    selectNode,
    isLoadingSelectedNode,
    setIsSyncing,
    pushSelectionLog,
    isSynthesisMode,
    synthesisTargetNodeId,
    synthesisChainNodeIds,
    synthesisReview,
    isGeneratingSynthesis,
  } = usePaperTreeStore();
  const plugin = defaultLayoutPlugin();

  usePdfTextSelection({
    container,
    nodeId: selectedNodeId,
    scale,
    onCapture: pushSelectionLog,
  });

  const keyPoints = selectedNode
    ? readStringArray(selectedNode.metadata.analysis ?? null, "key_points")
    : [];
  const topics = selectedNode
    ? readStringArray(selectedNode.metadata.analysis ?? null, "topics")
    : [];
  const techRouteTags = selectedNode
    ? readStringArray(selectedNode.metadata.analysis ?? null, "tech_route_tags")
    : [];
  const analysisMode = selectedNode?.metadata.analysis?.mode;
  const analysisProvider = selectedNode?.metadata.analysis?.provider;
  const analysisModel = selectedNode?.metadata.analysis?.model;
  const venue = selectedNode
    ? selectedNode.metadata.analysis?.venue ?? selectedNode.metadata.venue
    : null;
  const experimentalParams = selectedNode
    ? readExperimentalParams(
        selectedNode.metadata.analysis?.experimental_params ??
          selectedNode.metadata.experimental_params,
      )
    : [];
  const fallbackMetricSeries = useMemo(
    () => buildFallbackMetricSeries(nodes, synthesisChainNodeIds),
    [nodes, synthesisChainNodeIds],
  );
  const displayMetricSeries =
    chainMetricSeries.length > 0 ? chainMetricSeries : fallbackMetricSeries;
  const isUsingFallbackMetricSeries =
    chainMetricSeries.length === 0 && fallbackMetricSeries.length > 0;

  const loadChainMetrics = useEffectEvent(async (projectId: string, targetNodeId: string) => {
    const requestId = chainMetricsRequestIdRef.current + 1;
    chainMetricsRequestIdRef.current = requestId;
    setIsLoadingChainMetrics(true);
    setChainMetricsError(null);

    try {
      const response = await fetch(
        `/api/synthesis/metrics?projectId=${encodeURIComponent(projectId)}&targetNodeId=${encodeURIComponent(targetNodeId)}`,
        {
          cache: "no-store",
        },
      );
      const payload = (await response.json()) as {
        series?: ChainMetricSeries[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to load synthesis metrics.");
      }

      if (requestId !== chainMetricsRequestIdRef.current) {
        return;
      }

      startTransition(() => {
        const nextSeries = payload.series ?? [];
        setChainMetricSeries(nextSeries);
        setSelectedMetricKey((current) =>
          nextSeries.some((item) => item.key === current) ? current : nextSeries[0]?.key ?? null,
        );
        setChainMetricsError(null);
      });
    } catch (error) {
      if (requestId !== chainMetricsRequestIdRef.current) {
        return;
      }

      startTransition(() => {
        setChainMetricSeries([]);
        setSelectedMetricKey(null);
        setChainMetricsError(
          error instanceof Error ? error.message : "Failed to load synthesis metrics.",
        );
      });
    } finally {
      if (requestId === chainMetricsRequestIdRef.current) {
        setIsLoadingChainMetrics(false);
      }
    }
  });

  useEffect(() => {
    if (
      !isSynthesisMode ||
      !currentProjectId ||
      !synthesisTargetNodeId ||
      synthesisChainNodeIds.length < 2
    ) {
      chainMetricsRequestIdRef.current += 1;
      startTransition(() => {
        setChainMetricSeries([]);
        setSelectedMetricKey(null);
        setChainMetricsError(null);
      });
      setIsLoadingChainMetrics(false);
      return;
    }

    void loadChainMetrics(currentProjectId, synthesisTargetNodeId);
  }, [
    currentProjectId,
    isSynthesisMode,
    synthesisChainNodeIds.length,
    synthesisTargetNodeId,
  ]);

  async function handleCopySynthesis(
    format: "markdown" | "plainText" | "latex" | "bibtex",
  ) {
    if (!synthesisReview) {
      return;
    }

    const content =
      format === "bibtex"
        ? synthesisReview.bibtex
        : format === "latex"
          ? synthesisReview.latex
          : format === "plainText"
            ? synthesisReview.plainText
            : synthesisReview.markdown;

    await navigator.clipboard.writeText(content);
  }

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto p-3 text-slate-700">
      {isSynthesisMode ? (
        <section className="mb-4 border-b border-slate-200 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-medium text-slate-800">
                <Sparkles className="h-3.5 w-3.5 text-slate-500" />
                Synthesis
              </p>
              <p className="mt-1 text-[11px] leading-4.5 text-slate-400">
                {synthesisTargetNodeId
                  ? `${synthesisChainNodeIds.length} locked papers in the active chain`
                  : "Select a node on a locked semantic chain, then generate a review."}
              </p>
            </div>
            {synthesisReview ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[10px] text-slate-500 transition hover:bg-blue-50 hover:text-slate-800"
                  onClick={() => handleCopySynthesis("markdown")}
                >
                  <Copy className="h-3.5 w-3.5" />
                  MD
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[10px] text-slate-500 transition hover:bg-blue-50 hover:text-slate-800"
                  onClick={() => handleCopySynthesis("plainText")}
                >
                  <FileText className="h-3.5 w-3.5" />
                  TXT
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[10px] text-slate-500 transition hover:bg-blue-50 hover:text-slate-800"
                  onClick={() => handleCopySynthesis("latex")}
                >
                  <FileCode2 className="h-3.5 w-3.5" />
                  TeX
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[10px] text-slate-500 transition hover:bg-blue-50 hover:text-slate-800"
                  onClick={() => handleCopySynthesis("bibtex")}
                >
                  <BookCopy className="h-3.5 w-3.5" />
                  Bib
                </button>
              </div>
            ) : null}
          </div>

          <div className="mt-3 border-l border-blue-200 pl-3">
            <p className="text-[10px] font-medium uppercase text-slate-400">
              How To See It
            </p>
            <div className="mt-2 space-y-1.5 text-[11px] leading-4.5 text-slate-400">
              <p>1. Lock at least two papers with a semantic link on the canvas.</p>
              <p>2. Turn on Synthesis Mode and click one paper on that locked chain.</p>
              <p>3. The right panel will show a real metric trend, or Test Mode if the papers do not have structured numeric params yet.</p>
            </div>
          </div>

          {isGeneratingSynthesis ? (
            <div className="mt-3 border-l border-blue-200 pl-3 text-xs text-slate-500">
              Generating review from the locked chain...
            </div>
          ) : null}

          {isLoadingChainMetrics ? (
            <div className="mt-3 border-l border-blue-200 pl-3 text-xs text-slate-500">
              Loading chain metrics...
            </div>
          ) : null}

          {!isLoadingChainMetrics && chainMetricsError ? (
            <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {chainMetricsError}
            </div>
          ) : null}

          {!isLoadingChainMetrics && !chainMetricsError && chainMetricSeries.length > 0 ? (
            <div className="mt-3">
              <ChainMetricsChart
                series={displayMetricSeries}
                selectedMetricKey={selectedMetricKey}
                selectedNodeId={selectedNodeId}
                onSelectMetric={setSelectedMetricKey}
                onSelectNode={selectNode}
                helperText="Real extracted numeric metrics from the locked chain."
              />
            </div>
          ) : null}

          {!isLoadingChainMetrics &&
          !chainMetricsError &&
          chainMetricSeries.length === 0 &&
          isUsingFallbackMetricSeries ? (
            <div className="mt-3">
              <ChainMetricsChart
                series={displayMetricSeries}
                selectedMetricKey={selectedMetricKey}
                selectedNodeId={selectedNodeId}
                onSelectMetric={setSelectedMetricKey}
                onSelectNode={selectNode}
                modeLabel="Test Mode"
                helperText="This chain does not have comparable numeric params yet, so the chart is using fallback mock values to preview the UI and node linkage."
              />
            </div>
          ) : null}

          {!isGeneratingSynthesis && synthesisReview ? (
            <div className="mt-3 space-y-3">
              <div className="max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-3">
                <pre className="whitespace-pre-wrap text-xs leading-6 text-slate-600">
                  {synthesisReview.markdown}
                </pre>
              </div>
              {synthesisReview.citations.length > 0 ? (
                <div className="border-t border-slate-200 pt-3">
                  <p className="text-[10px] font-medium uppercase text-slate-400">
                    Citations
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {synthesisReview.citations.map((citation) => (
                      <p key={citation.bibKey} className="text-xs text-slate-500">
                        <span className="font-medium text-slate-700">{citation.label}</span>
                        {" · "}
                        {citation.title}
                        {" · "}
                        <code>{citation.bibKey}</code>
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
              {synthesisReview.bibtex ? (
                <div className="border-t border-slate-200 pt-3">
                  <p className="text-[10px] font-medium uppercase text-slate-400">
                    BibTeX Preview
                  </p>
                  <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap text-[11px] leading-5 text-slate-600">
                    {synthesisReview.bibtex}
                  </pre>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {selectedNode ? (
        <section className="border-b border-slate-200 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[15px] font-medium leading-6 text-slate-900">{selectedNode.title}</p>
            <p className="mt-1 font-mono text-[10px] uppercase text-slate-400">
              {selectedNode.analysis_status}
              {analysisMode ? ` · ${analysisMode} mode` : ""}
              {" · "}
              {selectedNode.page_count || "?"} pages
            </p>
            {analysisProvider || analysisModel ? (
              <p className="mt-1 text-[11px] text-slate-400">
                {[analysisProvider, analysisModel].filter(Boolean).join(" · ")}
              </p>
            ) : null}
            {venue ? (
              <p className="mt-1 text-[11px] text-slate-400">Venue · {venue}</p>
            ) : null}
          </div>
          {selectedNode.analysis_status === "error" ? (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-slate-500 transition hover:bg-blue-50 hover:text-slate-800"
              onClick={() => onRetryAnalysis(selectedNode.id)}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Retry
            </button>
          ) : null}
        </div>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          {selectedNode.summary || selectedNode.source_excerpt || "Analysis output is not ready yet."}
        </p>

        {topics.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {topics.map((topic) => (
              <span
                key={topic}
                className="rounded-md bg-blue-50 px-2 py-1 text-[10px] text-slate-600"
              >
                {topic}
              </span>
            ))}
          </div>
        ) : null}

        {techRouteTags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {techRouteTags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-slate-200 px-2 py-1 text-[10px] text-slate-500"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        {experimentalParams.length > 0 ? (
          <div className="mt-3 border-t border-slate-200 pt-3">
            <p className="text-[10px] font-medium uppercase text-slate-400">
              Experimental Params
            </p>
            <div className="mt-2 space-y-1.5">
              {experimentalParams.map((param) => (
                <p key={`${param.label}-${param.value}`} className="font-mono text-xs text-slate-500">
                  <span className="font-medium text-slate-700">{param.label}</span>
                  {" · "}
                  {param.value}
                  {param.unit ? ` ${param.unit}` : ""}
                </p>
              ))}
            </div>
          </div>
        ) : null}

        {keyPoints.length > 0 ? (
          <div className="mt-3 space-y-2">
            {keyPoints.map((point) => (
              <p key={point} className="text-xs leading-5 text-slate-500">
                • {point}
              </p>
            ))}
          </div>
        ) : null}
        </section>
      ) : (
        <div className="grid min-h-32 place-items-center border-b border-slate-200 text-sm text-slate-400">
          Select a node to load PDF
        </div>
      )}

      {selectedNode?.analysis_status === "analyzing" || isLoadingSelectedNode ? (
        <div className="mt-3 grid place-items-center border-l border-blue-200 p-4 text-center">
          <div className="space-y-2">
            <LoaderCircle className="mx-auto h-5 w-5 animate-spin text-slate-600" />
            <p className="text-sm text-slate-800">Analysis is running</p>
            <p className="text-xs text-slate-400">The app is polling for the completed result.</p>
          </div>
        </div>
      ) : null}

      {selectedNode?.analysis_status === "error" ? (
        <div className="mt-3 grid place-items-center border-l border-rose-300/25 bg-rose-400/[0.04] p-4 text-center">
          <div className="space-y-2">
            <TriangleAlert className="mx-auto h-6 w-6 text-rose-500" />
            <p className="text-sm text-slate-800">Analysis failed</p>
            <p className="text-xs text-slate-500">
              {selectedNode?.analysis_error || "The provider returned an error."}
            </p>
          </div>
        </div>
      ) : null}

      {activePdfUrl ? (
        <div className="mt-3 min-h-[420px] flex-1 overflow-hidden rounded-md border border-slate-200 bg-slate-50 p-1">
          <div
            ref={setContainer}
            className="h-full w-full overflow-hidden rounded-[3px] bg-white"
          >
            <Worker workerUrl={workerUrl}>
              <Viewer
                key={activePdfUrl}
                fileUrl={activePdfUrl}
                plugins={[plugin]}
                onZoom={(event) => setScale(event.scale)}
                renderLoader={() => (
                  <div className="grid h-full place-items-center text-sm text-slate-500">
                    Loading PDF…
                  </div>
                )}
                onDocumentLoad={() => setIsSyncing(false)}
                renderError={(error) => {
                  queueMicrotask(() => setIsSyncing(false));
                  return (
                    <div className="grid h-full place-items-center text-sm text-rose-600">
                      {error.message}
                    </div>
                  );
                }}
              />
            </Worker>
          </div>
        </div>
      ) : null}
    </div>
  );
}
