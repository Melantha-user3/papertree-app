import type { PaperEdgeRecord, PaperNodeRecord } from "@/lib/types/papertree";

function compareNodes(left: PaperNodeRecord, right: PaperNodeRecord) {
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

export function getLockedSynthesisChainNodeIds(edges: PaperEdgeRecord[], targetNodeId: string) {
  const reverseAdjacency = new Map<string, string[]>();
  const lockedEdges = edges.filter((edge) => edge.is_locked && edge.relation_type === "semantic");

  for (const edge of lockedEdges) {
    const parents = reverseAdjacency.get(edge.target_id) ?? [];
    parents.push(edge.source_id);
    reverseAdjacency.set(edge.target_id, parents);
  }

  const visited = new Set<string>();
  const stack = [targetNodeId];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || visited.has(current)) {
      continue;
    }

    visited.add(current);

    for (const parentId of reverseAdjacency.get(current) ?? []) {
      if (!visited.has(parentId)) {
        stack.push(parentId);
      }
    }
  }

  return [...visited];
}

export function getLockedSynthesisChain(
  nodes: PaperNodeRecord[],
  edges: PaperEdgeRecord[],
  targetNodeId: string,
) {
  const nodeIds = getLockedSynthesisChainNodeIds(edges, targetNodeId);
  const chainNodes = nodes
    .filter((node) => nodeIds.includes(node.id))
    .toSorted(compareNodes);
  const chainNodeIds = new Set(chainNodes.map((node) => node.id));
  const chainEdges = edges.filter(
    (edge) =>
      edge.is_locked &&
      edge.relation_type === "semantic" &&
      chainNodeIds.has(edge.source_id) &&
      chainNodeIds.has(edge.target_id),
  );

  return {
    nodeIds: chainNodes.map((node) => node.id),
    nodes: chainNodes,
    edges: chainEdges,
  };
}
