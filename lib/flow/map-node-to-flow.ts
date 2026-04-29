import type { Node } from "@xyflow/react";
import type { PaperNodeRecord } from "@/lib/types/papertree";

interface FlowNodeData extends Record<string, unknown> {
  title: string;
  status: PaperNodeRecord["status"];
  parentCount: number;
}

export function mapNodeToFlowNode(
  node: PaperNodeRecord,
  parentCount: number,
  position: { x: number; y: number },
): Node<FlowNodeData> {
  return {
    id: node.id,
    type: "paperNode",
    position,
    data: {
      title: node.title,
      status: node.status,
      parentCount,
    } as FlowNodeData,
  };
}
