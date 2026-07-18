"use client";

import { useMemo, useRef, useState } from "react";
import { motion, type PanInfo } from "framer-motion";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Layers3,
  LibraryBig,
  Tags,
  X,
} from "lucide-react";
import { PaperFirstPage } from "@/components/ui/paper-first-page";
import type { PaperNodeRecord } from "@/lib/types/papertree";

type StackMode = "deck" | "topic" | "year" | "status";

interface PaperCardCollectionProps {
  nodes: PaperNodeRecord[];
  onSelectNode: (nodeId: string) => void;
  selectedNodeId: string | null;
}

interface PaperStack {
  key: string;
  label: string;
  nodes: PaperNodeRecord[];
}

const stackModes = [
  { icon: Layers3, label: "Deck", value: "deck" },
  { icon: Tags, label: "Topic", value: "topic" },
  { icon: CalendarDays, label: "Year", value: "year" },
  { icon: CircleDot, label: "Status", value: "status" },
] satisfies Array<{
  icon: typeof Layers3;
  label: string;
  value: StackMode;
}>;

const deckTransforms = [
  {
    transform:
      "translate3d(-112px, 20px, -74px) rotateX(3deg) rotateY(16deg) rotateZ(-13deg) scale(0.91)",
    filter: "blur(0.5px)",
    opacity: 0.74,
  },
  {
    transform:
      "translate3d(-66px, 6px, -42px) rotateX(2deg) rotateY(10deg) rotateZ(-8deg) scale(0.95)",
    filter: "blur(0.2px)",
    opacity: 0.84,
  },
  {
    transform:
      "translate3d(-20px, -2px, -14px) rotateX(1deg) rotateY(4deg) rotateZ(-3deg) scale(0.985)",
    filter: "blur(0px)",
    opacity: 0.92,
  },
  {
    transform:
      "translate3d(30px, 0, 0) rotateX(1deg) rotateY(-4deg) rotateZ(4deg) scale(1)",
    filter: "blur(0px)",
    opacity: 0.97,
  },
  {
    transform:
      "translate3d(82px, 14px, 18px) rotateX(2deg) rotateY(-10deg) rotateZ(10deg) scale(1.015)",
    filter: "blur(0px)",
    opacity: 1,
  },
];

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function primaryTopic(node: PaperNodeRecord) {
  return (
    node.metadata.analysis?.tech_route_tags?.[0] ??
    node.metadata.tech_route_tags?.[0] ??
    node.metadata.analysis?.topics?.[0] ??
    "Unsorted"
  );
}

function stackKeyForNode(node: PaperNodeRecord, mode: StackMode) {
  if (mode === "deck") {
    return "All papers";
  }

  if (mode === "year") {
    return node.publication_year ? String(node.publication_year) : "Year unknown";
  }

  if (mode === "status") {
    return titleCase(node.status.replace(/_/g, " "));
  }

  return primaryTopic(node);
}

function comparePaperCards(left: PaperNodeRecord, right: PaperNodeRecord) {
  const yearDelta = (right.publication_year ?? 0) - (left.publication_year ?? 0);
  return yearDelta !== 0 ? yearDelta : left.title.localeCompare(right.title);
}

function buildStacks(nodes: PaperNodeRecord[], mode: StackMode): PaperStack[] {
  const grouped = new Map<string, PaperNodeRecord[]>();

  for (const node of nodes) {
    const key = stackKeyForNode(node, mode);
    grouped.set(key, [...(grouped.get(key) ?? []), node]);
  }

  return [...grouped.entries()]
    .map(([key, stackNodes]) => ({
      key,
      label: key,
      nodes: stackNodes.toSorted(comparePaperCards),
    }))
    .sort((left, right) => {
      const countDelta = right.nodes.length - left.nodes.length;
      return countDelta !== 0 ? countDelta : left.label.localeCompare(right.label);
    });
}

function CardFace({
  isSelected,
  node,
}: {
  isSelected: boolean;
  node: PaperNodeRecord;
}) {
  return (
    <div
      className={`relative aspect-[5/7] w-full overflow-hidden rounded-[14px] border bg-white shadow-[0_20px_48px_rgba(15,23,42,0.16)] ${
        isSelected ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200"
      }`}
    >
      <PaperFirstPage
        title={node.title}
        coverUrl={node.metadata.cover_url ?? null}
        pdfUrl={node.metadata.pdf_url ?? null}
        targetWidth={520}
        className="paper-preview-muted h-full w-full"
      />
      <div className="pointer-events-none absolute inset-0 rounded-[14px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.65)]" />
    </div>
  );
}

function PaperCard({
  isSelected,
  node,
  onSelect,
}: {
  isSelected: boolean;
  node: PaperNodeRecord;
  onSelect: (nodeId: string) => void;
}) {
  return (
    <motion.button
      type="button"
      className="w-[158px] shrink-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:w-[178px] xl:w-[196px]"
      onClick={() => onSelect(node.id)}
      whileHover={{ y: -10, rotateZ: -1 }}
      transition={{ type: "spring", stiffness: 340, damping: 28 }}
      aria-label={`Open ${node.title}`}
    >
      <CardFace isSelected={isSelected} node={node} />
      <p className="mt-2 line-clamp-2 text-[11px] font-medium leading-4 text-slate-600">
        {node.title}
      </p>
    </motion.button>
  );
}

function StackPreviewCard({
  index,
  isFront,
  isSelected,
  node,
  onActivate,
  onSwipe,
  total,
}: {
  index: number;
  isFront: boolean;
  isSelected: boolean;
  node: PaperNodeRecord;
  onActivate: () => void;
  onSwipe: (delta: number) => void;
  total: number;
}) {
  const lastDragAtRef = useRef(0);
  const offset = Math.max(0, Math.floor((deckTransforms.length - total) / 2));
  const transformIndex = Math.min(index + offset, deckTransforms.length - 1);
  const transform = deckTransforms[transformIndex];
  const face = <CardFace isSelected={isSelected} node={node} />;

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    lastDragAtRef.current = Date.now();

    if (info.offset.x < -48 || info.velocity.x < -420) {
      onSwipe(1);
    } else if (info.offset.x > 48 || info.velocity.x > 420) {
      onSwipe(-1);
    }
  }

  return (
    <div
      className="absolute left-1/2 top-1/2 w-[clamp(138px,24vw,192px)]"
      style={{
        filter: transform.filter,
        opacity: transform.opacity,
        transform: `translate(-50%, -50%) ${transform.transform}`,
        transformOrigin: "50% 68%",
        zIndex: transformIndex + 1,
      }}
    >
      {isFront ? (
        <motion.button
          key={node.id}
          type="button"
          className="block w-full cursor-grab touch-pan-y select-none rounded-[14px] text-left outline-none focus-visible:ring-2 focus-visible:ring-blue-400 active:cursor-grabbing"
          drag={total > 1 ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.82}
          dragSnapToOrigin
          onDragEnd={handleDragEnd}
          onClick={() => {
            if (Date.now() - lastDragAtRef.current > 260) {
              onActivate();
            }
          }}
          whileDrag={{ rotateZ: 3, scale: 1.035 }}
          whileHover={{ y: -5 }}
          transition={{ type: "spring", stiffness: 360, damping: 28 }}
          aria-label={`Open ${node.title}. Drag horizontally to browse papers.`}
        >
          {face}
        </motion.button>
      ) : (
        face
      )}
    </div>
  );
}

function StackPile({
  onOpen,
  selectedNodeId,
  stack,
}: {
  onOpen: () => void;
  selectedNodeId: string | null;
  stack: PaperStack;
}) {
  const [frontIndex, setFrontIndex] = useState(0);
  const paperCount = stack.nodes.length;
  const previewNodes = useMemo(() => {
    const visibleCount = Math.min(5, paperCount);

    if (visibleCount === 0) {
      return [];
    }

    const front = stack.nodes[frontIndex % paperCount];
    const behind = Array.from(
      { length: visibleCount - 1 },
      (_, index) => stack.nodes[(frontIndex + index + 1) % paperCount],
    );

    return [...behind.reverse(), front];
  }, [frontIndex, paperCount, stack.nodes]);

  function cycleStack(delta: number) {
    if (paperCount < 2) {
      return;
    }

    setFrontIndex((current) => (current + delta + paperCount) % paperCount);
  }

  return (
    <motion.div
      className="group relative min-h-[410px] w-full overflow-hidden text-left"
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="absolute inset-x-2 top-1 z-20 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-800">{stack.label}</p>
          <p className="mt-1 font-mono text-[9px] uppercase text-slate-400">
            {stack.nodes.length} paper{stack.nodes.length === 1 ? "" : "s"}
          </p>
        </div>
        <button
          type="button"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 transition group-hover:bg-blue-50 group-hover:text-blue-600"
          onClick={onOpen}
          aria-label={`Open ${stack.label} collection`}
          title="Open collection"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-9 top-11 [perspective:1200px]">
        <div className="absolute bottom-2 left-1/2 h-12 w-[56%] -translate-x-1/2 rounded-full bg-slate-400/20 blur-2xl" />
        {previewNodes.map((node, index) => (
          <StackPreviewCard
            key={node.id}
            index={index}
            isFront={index === previewNodes.length - 1}
            isSelected={node.id === selectedNodeId}
            node={node}
            onActivate={onOpen}
            onSwipe={cycleStack}
            total={previewNodes.length}
          />
        ))}
      </div>

      <div className="absolute inset-x-0 bottom-0 z-30 flex items-center justify-center gap-2">
        <button
          type="button"
          className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30"
          onClick={() => cycleStack(-1)}
          disabled={paperCount < 2}
          aria-label="Previous paper"
          title="Previous paper"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="min-w-12 text-center font-mono text-[9px] tabular-nums text-slate-400">
          {String((frontIndex % paperCount) + 1).padStart(2, "0")} /{" "}
          {String(paperCount).padStart(2, "0")}
        </span>
        <button
          type="button"
          className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30"
          onClick={() => cycleStack(1)}
          disabled={paperCount < 2}
          aria-label="Next paper"
          title="Next paper"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

export function PaperCardCollection({
  nodes,
  onSelectNode,
  selectedNodeId,
}: PaperCardCollectionProps) {
  const [stackMode, setStackMode] = useState<StackMode>("deck");
  const [expandedStackKey, setExpandedStackKey] = useState<string | null>(null);
  const stacks = useMemo(() => buildStacks(nodes, stackMode), [nodes, stackMode]);
  const expandedStack = stacks.find((stack) => stack.key === expandedStackKey) ?? null;

  return (
    <div className="workspace-grid relative h-full overflow-hidden pt-14">
      <div className="flex h-full min-h-0 flex-col px-4 pb-4 sm:px-5">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 pb-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800">Paper collection</p>
            <p className="mt-1 text-[11px] text-slate-400">
              {nodes.length} papers · first-page cards
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5 rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
            {stackModes.map((mode) => {
              const Icon = mode.icon;
              const active = stackMode === mode.value;

              return (
                <button
                  key={mode.value}
                  type="button"
                  className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[10px] font-medium transition ${
                    active
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                  }`}
                  onClick={() => {
                    setStackMode(mode.value);
                    setExpandedStackKey(null);
                  }}
                  aria-label={`Group collection by ${mode.label.toLowerCase()}`}
                  aria-pressed={active}
                  title={`Group by ${mode.label.toLowerCase()}`}
                >
                  <Icon className="h-3 w-3" />
                  <span className="hidden sm:inline">{mode.label}</span>
                </button>
              );
            })}
          </div>
        </header>

        {expandedStack ? (
          <section className="min-h-0 flex-1 overflow-hidden pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-800">{expandedStack.label}</p>
                <p className="mt-1 font-mono text-[9px] uppercase text-slate-400">
                  {expandedStack.nodes.length} papers in hand
                </p>
              </div>
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                onClick={() => setExpandedStackKey(null)}
                aria-label="Collect papers back into stack"
                title="Collect papers"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid h-[calc(100%-3.25rem)] min-h-0 place-items-center overflow-x-auto pb-4">
              <div className="flex min-w-max items-center gap-3 px-5 py-8 sm:gap-4">
                {expandedStack.nodes.map((node) => (
                  <PaperCard
                    key={node.id}
                    isSelected={node.id === selectedNodeId}
                    node={node}
                    onSelect={onSelectNode}
                  />
                ))}
              </div>
            </div>
          </section>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto pt-3">
            {stacks.length === 0 ? (
              <div className="grid h-full place-items-center text-center">
                <div>
                  <LibraryBig className="mx-auto h-6 w-6 text-blue-300" />
                  <p className="mt-3 text-sm font-medium text-slate-700">No paper cards yet</p>
                  <p className="mt-1.5 max-w-xs text-xs leading-5 text-slate-400">
                    Upload academic PDFs to start a collection.
                  </p>
                </div>
              </div>
            ) : (
              <div
                className={`grid gap-x-6 gap-y-4 ${
                  stackMode === "deck"
                    ? "h-full grid-cols-[minmax(280px,720px)] place-content-center"
                    : "grid-cols-[repeat(auto-fit,minmax(280px,1fr))]"
                }`}
              >
                {stacks.map((stack) => (
                  <StackPile
                    key={stack.key}
                    selectedNodeId={selectedNodeId}
                    stack={stack}
                    onOpen={() => setExpandedStackKey(stack.key)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
