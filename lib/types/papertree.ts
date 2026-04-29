export type NodeType = "article" | "section" | "topic";

export type PaperTreeStatus =
  | "unread"
  | "deep"
  | "replicated"
  | "disputed"
  | "pending_review";
export type PaperAnalysisStatus = "uploaded" | "analyzing" | "ready" | "error";
export type LlmMode = "mock" | "ollama" | "remote" | "auto";

export type RelationType =
  | "cites"
  | "supports"
  | "contradicts"
  | "semantic"
  | "custom";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export interface JsonObject {
  [key: string]: JsonValue | undefined;
}

export interface ExperimentalParam extends JsonObject {
  key: string;
  label: string;
  value: number;
  unit?: string | null;
  raw_text: string;
}

export interface PaperMetadata extends JsonObject {
  authors?: string[];
  year?: number | null;
  publication_year_source?: string | null;
  publication_year_confidence?: number | null;
  academic_confidence?: number | null;
  academic_signals?: string[];
  venue?: string | null;
  tech_route_tags?: string[];
  experimental_params?: ExperimentalParam[];
  page_count?: number | null;
  pdf_url?: string | null;
  cover_url?: string | null;
  original_file_name?: string | null;
  analysis?: {
    key_points?: string[];
    mode?: Exclude<LlmMode, "auto">;
    model?: string;
    provider?: string;
    topics?: string[];
    venue?: string | null;
    tech_route_tags?: string[];
    experimental_params?: ExperimentalParam[];
  } | null;
  document?: {
    extracted_excerpt_length?: number | null;
    page_count?: number | null;
  } | null;
}

export interface PaperNodeRecord {
  id: string;
  project_id: string;
  title: string;
  type: NodeType;
  metadata: PaperMetadata;
  preview_file_url?: string | null;
  status: PaperTreeStatus;
  analysis_status: PaperAnalysisStatus;
  is_academic: boolean;
  publication_year?: number | null;
  position_x?: number | null;
  position_y?: number | null;
  summary?: string | null;
  analysis_error?: string | null;
  source_file_name?: string | null;
  source_file_path?: string | null;
  source_mime_type?: string | null;
  file_size_bytes?: number | null;
  page_count?: number | null;
  source_excerpt?: string | null;
  analysis_started_at?: string | null;
  analysis_completed_at?: string | null;
  analysis_attempt_count: number;
  created_at: string;
  updated_at: string;
}

export interface PaperNodeDetailRecord extends PaperNodeRecord {
  signed_file_url?: string | null;
}

export interface PaperEdgeRecord {
  project_id: string;
  source_id: string;
  target_id: string;
  relation_type: RelationType;
  weight: number;
  is_locked: boolean;
  created_at: string;
}

export interface ProjectRecord {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface SynthesisCitation {
  bibKey: string;
  label: string;
  nodeId: string;
  title: string;
  venue?: string | null;
  year?: number | null;
}

export interface SynthesisReview {
  markdown: string;
  plainText: string;
  latex: string;
  bibtex: string;
  citations: SynthesisCitation[];
  nodeIds: string[];
  targetNodeId: string;
  generatedAt: string;
}

export interface ChainMetricPoint {
  nodeId: string;
  title: string;
  publicationYear: number | null;
  value: number;
  unit: string | null;
  rawText: string;
  venue?: string | null;
}

export interface ChainMetricSeries {
  key: string;
  label: string;
  unit: string | null;
  points: ChainMetricPoint[];
}

export interface SelectionBBox {
  x: number;
  y: number;
  w: number;
  h: number;
  pageHeight: number;
  scale: number;
}

export interface SelectionLogEntry {
  nodeId: string;
  page: number;
  text: string;
  bbox: SelectionBBox;
  timestamp: string;
}

export interface PaperAnalysisResult {
  title: string;
  summary: string;
  keyPoints: string[];
  topics: string[];
  isAcademic: boolean;
  publicationYear: number | null;
  publicationYearSource: string | null;
  academicConfidence: number | null;
  academicSignals: string[];
  venue: string | null;
  techRouteTags: string[];
  experimentalParams: ExperimentalParam[];
}
