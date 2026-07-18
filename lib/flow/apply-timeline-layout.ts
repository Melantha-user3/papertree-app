import type { PaperEdgeRecord, PaperNodeRecord } from "@/lib/types/papertree";

const YEAR_SPACING = 500;
const LANE_SPACING = 520;
const LANE_CLUSTER_OFFSET = 210;
const BRANCH_OFFSET = 430;
const UNKNOWN_YEAR_X = -440;
const DEFAULT_Y = 120;

export interface TimelineLayoutResult {
  [nodeId: string]: {
    x: number;
    y: number;
  };
}

export interface TechRouteLane {
  centerY: number;
  count: number;
  key: string;
  label: string;
}

interface ApplyTimelineLayoutOptions {
  forceReflow?: boolean;
}

function compareAcademicNodes(left: PaperNodeRecord, right: PaperNodeRecord) {
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

function buildParentMap(edges: PaperEdgeRecord[]) {
  const parents = new Map<string, string[]>();

  for (const edge of edges) {
    if (edge.relation_type !== "semantic") {
      continue;
    }

    const targetParents = parents.get(edge.target_id) ?? [];
    targetParents.push(edge.source_id);
    parents.set(edge.target_id, targetParents);
  }

  return parents;
}

function nextAvailableY(preferredY: number, occupied: Map<number, Set<number>>, x: number) {
  const slots = occupied.get(x) ?? new Set<number>();

  if (!slots.has(preferredY)) {
    slots.add(preferredY);
    occupied.set(x, slots);
    return preferredY;
  }

  for (let step = 1; step < 20; step += 1) {
    const up = preferredY - step * BRANCH_OFFSET;
    if (!slots.has(up)) {
      slots.add(up);
      occupied.set(x, slots);
      return up;
    }

    const down = preferredY + step * BRANCH_OFFSET;
    if (!slots.has(down)) {
      slots.add(down);
      occupied.set(x, slots);
      return down;
    }
  }

  const fallback = preferredY + slots.size * BRANCH_OFFSET;
  slots.add(fallback);
  occupied.set(x, slots);
  return fallback;
}

function getNodeTechRouteTags(node: PaperNodeRecord) {
  return [
    ...(node.metadata.analysis?.tech_route_tags ?? []),
    ...(node.metadata.tech_route_tags ?? []),
  ]
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function centeredOffset(index: number) {
  if (index === 0) {
    return 0;
  }

  const magnitude = Math.ceil(index / 2) * LANE_CLUSTER_OFFSET;
  return index % 2 === 1 ? -magnitude : magnitude;
}

export function deriveTechRouteLanes(nodes: PaperNodeRecord[]): TechRouteLane[] {
  const academicNodes = nodes.filter((node) => node.is_academic);
  const laneCounts = new Map<string, number>();
  let generalCount = 0;

  for (const node of academicNodes) {
    const tags = [...new Set(getNodeTechRouteTags(node))];
    if (tags.length === 0) {
      generalCount += 1;
      continue;
    }

    for (const tag of tags) {
      laneCounts.set(tag, (laneCounts.get(tag) ?? 0) + 1);
    }
  }

  const ordered = [...laneCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([key, count]) => ({
      key,
      label: `${key} Branch`,
      count,
    }));

  if (generalCount > 0 || ordered.length === 0) {
    ordered.push({
      key: "__general__",
      label: "General Branch",
      count: generalCount,
    });
  }

  const mid = (ordered.length - 1) / 2;

  return ordered.map((lane, index) => ({
    ...lane,
    centerY: DEFAULT_Y + (index - mid) * LANE_SPACING,
  }));
}

function chooseLaneForNode(node: PaperNodeRecord, lanes: TechRouteLane[]) {
  const tags = [...new Set(getNodeTechRouteTags(node))];

  if (tags.length === 0) {
    return {
      laneKey: "__general__",
      laneCenterY:
        lanes.find((lane) => lane.key === "__general__")?.centerY ?? DEFAULT_Y,
    };
  }

  const ranked = tags
    .map((tag) => lanes.find((lane) => lane.key === tag))
    .filter((lane): lane is TechRouteLane => Boolean(lane))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key));

  if (ranked.length === 0) {
    return {
      laneKey: "__general__",
      laneCenterY:
        lanes.find((lane) => lane.key === "__general__")?.centerY ?? DEFAULT_Y,
    };
  }

  if (ranked.length > 1 && ranked[0].count === ranked[1].count) {
    return {
      laneKey: `${ranked[0].key}|${ranked[1].key}`,
      laneCenterY: (ranked[0].centerY + ranked[1].centerY) / 2,
    };
  }

  return {
    laneKey: ranked[0].key,
    laneCenterY: ranked[0].centerY,
  };
}

export function applyTimelineLayout(
  nodes: PaperNodeRecord[],
  edges: PaperEdgeRecord[],
  options: ApplyTimelineLayoutOptions = {},
): TimelineLayoutResult {
  const academicNodes = nodes.filter((node) => node.is_academic);
  const sortedNodes = academicNodes.toSorted(compareAcademicNodes);
  const knownYears = sortedNodes
    .map((node) => node.publication_year)
    .filter((year): year is number => typeof year === "number")
    .toSorted((left, right) => left - right);
  const minYear = knownYears[0] ?? null;
  const occupiedByX = new Map<number, Set<number>>();
  const positions: TimelineLayoutResult = {};
  const parentMap = buildParentMap(edges);
  const lanes = deriveTechRouteLanes(nodes);
  const laneYearCounts = new Map<string, number>();

  for (const node of sortedNodes) {
    if (
      !options.forceReflow &&
      typeof node.position_x === "number" &&
      typeof node.position_y === "number"
    ) {
      positions[node.id] = { x: node.position_x, y: node.position_y };
      const slots = occupiedByX.get(node.position_x) ?? new Set<number>();
      slots.add(node.position_y);
      occupiedByX.set(node.position_x, slots);
      continue;
    }

    const yearIndex =
      minYear != null && typeof node.publication_year === "number"
        ? node.publication_year - minYear
        : null;
    const x = yearIndex == null ? UNKNOWN_YEAR_X : yearIndex * YEAR_SPACING;
    const { laneKey, laneCenterY } = chooseLaneForNode(node, lanes);
    const laneYearKey = `${laneKey}:${node.publication_year ?? "unknown"}`;
    const rowIndex = laneYearCounts.get(laneYearKey) ?? 0;
    laneYearCounts.set(laneYearKey, rowIndex + 1);

    const parentIds = parentMap.get(node.id) ?? [];
    const linkedParentPosition = parentIds
      .map((parentId) => positions[parentId])
      .find((value): value is { x: number; y: number } => Boolean(value));

    const laneClusterY = laneCenterY + centeredOffset(rowIndex);
    const preferredY = linkedParentPosition
      ? Math.round((laneClusterY * 0.7 + linkedParentPosition.y * 0.3) / 10) * 10
      : laneClusterY;
    const y = nextAvailableY(preferredY, occupiedByX, x);

    positions[node.id] = { x, y };
  }

  return positions;
}
