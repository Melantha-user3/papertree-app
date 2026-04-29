import { randomUUID } from "node:crypto";
import { applyTimelineLayout } from "@/lib/flow/apply-timeline-layout";
import { getLockedSynthesisChain } from "@/lib/flow/synthesis-chain";
import { analyzePaperText } from "@/lib/ai/llm-client";
import { synthesizeLockedReview } from "@/lib/ai/llm-client";
import { normalizeExperimentalParams } from "@/lib/metrics/experimental-params";
import { extractPdfMetadata } from "@/lib/pdf/extract-metadata";
import { extractTextFromPdf } from "@/lib/pdf/extract-text";
import { getSupabaseConfig } from "@/lib/server/env";
import { getSupabaseAdmin } from "@/lib/supabase/admin-client";
import type {
  PaperEdgeRecord,
  ChainMetricSeries,
  PaperMetadata,
  PaperNodeDetailRecord,
  PaperNodeRecord,
  ProjectRecord,
  SynthesisCitation,
  SynthesisReview,
} from "@/lib/types/papertree";

const SAMPLE_PROJECT_NAME = "Sample Project - Quantum Dots";
const COMPARABLE_CHAIN_METRIC_KEYS = new Set([
  "efficiency",
  "plqy",
  "responsivity",
  "current_density",
]);

const PAPER_NODE_COLUMNS = [
  "id",
  "project_id",
  "title",
  "type",
  "metadata",
  "status",
  "analysis_status",
  "is_academic",
  "publication_year",
  "position_x",
  "position_y",
  "summary",
  "analysis_error",
  "source_file_name",
  "source_file_path",
  "source_mime_type",
  "file_size_bytes",
  "page_count",
  "source_excerpt",
  "analysis_started_at",
  "analysis_completed_at",
  "analysis_attempt_count",
  "created_at",
  "updated_at",
].join(", ");
const PAPER_EDGE_COLUMNS = [
  "project_id",
  "source_id",
  "target_id",
  "relation_type",
  "weight",
  "is_locked",
  "created_at",
].join(", ");
const PROJECT_COLUMNS = ["id", "name", "user_id", "created_at", "updated_at"].join(", ");

const samplePaperSeeds = [
  {
    key: "surface-passivation-2019",
    title: "Surface Passivation Routes for Colloidal Quantum Dot Films",
    year: 2019,
    venue: "Advanced Functional Materials",
    x: -640,
    y: -220,
    summary:
      "Maps early ligand and surface passivation strategies for stabilizing colloidal quantum dot films while preserving carrier transport.",
    topics: ["Quantum Dots", "Surface Passivation", "Ligand Exchange"],
    routeTags: ["Passivation", "Surface Engineering"],
    params: [
      {
        key: "plqy",
        label: "PLQY",
        value: 42,
        unit: "%",
        raw_text: "Reported PLQY reached 42% after ligand exchange.",
      },
      {
        key: "responsivity",
        label: "Responsivity",
        value: 0.31,
        unit: "A/W",
        raw_text: "Device responsivity reached 0.31 A/W.",
      },
    ],
  },
  {
    key: "annealing-2020",
    title: "Low-Temperature Annealing for Efficient Quantum Dot Devices",
    year: 2020,
    venue: "ACS Applied Materials & Interfaces",
    x: -280,
    y: -120,
    summary:
      "Shows how controlled low-temperature annealing improves film ordering and reduces trap-mediated loss in quantum dot devices.",
    topics: ["Quantum Dots", "Annealing Optimization", "Device Integration"],
    routeTags: ["Annealing", "Device Integration"],
    params: [
      {
        key: "plqy",
        label: "PLQY",
        value: 53,
        unit: "%",
        raw_text: "Optimized annealing improved PLQY to 53%.",
      },
      {
        key: "efficiency",
        label: "Efficiency",
        value: 12.8,
        unit: "%",
        raw_text: "Power conversion efficiency reached 12.8%.",
      },
    ],
  },
  {
    key: "charge-transport-2021",
    title: "Charge Transport Engineering in Quantum Dot Photodetectors",
    year: 2021,
    venue: "Nature Electronics",
    x: 80,
    y: -30,
    summary:
      "Connects passivated interfaces to transport-layer design and demonstrates higher responsivity in quantum dot photodetectors.",
    topics: ["Quantum Dots", "Charge Transport", "Photodetectors"],
    routeTags: ["Charge Transport", "Device Integration"],
    params: [
      {
        key: "responsivity",
        label: "Responsivity",
        value: 0.76,
        unit: "A/W",
        raw_text: "Responsivity increased to 0.76 A/W with transport-layer engineering.",
      },
      {
        key: "current_density",
        label: "Current Density",
        value: 18.4,
        unit: "mA/cm2",
        raw_text: "Current density was measured at 18.4 mA/cm2.",
      },
    ],
  },
  {
    key: "plqy-2022",
    title: "Photoluminescence Yield Optimization with Hybrid Ligands",
    year: 2022,
    venue: "Science Advances",
    x: 440,
    y: -145,
    summary:
      "Introduces hybrid ligand strategies that raise photoluminescence yield while keeping films compatible with device fabrication.",
    topics: ["Quantum Dots", "Photoluminescence", "Hybrid Ligands"],
    routeTags: ["Photoluminescence", "Passivation"],
    params: [
      {
        key: "plqy",
        label: "PLQY",
        value: 68,
        unit: "%",
        raw_text: "Hybrid ligands raised PLQY to 68%.",
      },
      {
        key: "efficiency",
        label: "Efficiency",
        value: 15.9,
        unit: "%",
        raw_text: "Device efficiency reached 15.9%.",
      },
    ],
  },
  {
    key: "integrated-stack-2024",
    title: "Integrated Quantum Dot Stacks for Stable High-Responsivity Devices",
    year: 2024,
    venue: "Nature Photonics",
    x: 810,
    y: -40,
    summary:
      "Combines passivation, annealing, and transport stack design into a stable high-responsivity quantum dot device route.",
    topics: ["Quantum Dots", "Device Integration", "Stability"],
    routeTags: ["Device Integration", "Charge Transport"],
    params: [
      {
        key: "responsivity",
        label: "Responsivity",
        value: 1.24,
        unit: "A/W",
        raw_text: "Integrated stacks produced responsivity of 1.24 A/W.",
      },
      {
        key: "efficiency",
        label: "Efficiency",
        value: 18.7,
        unit: "%",
        raw_text: "Integrated device efficiency reached 18.7%.",
      },
      {
        key: "current_density",
        label: "Current Density",
        value: 24.1,
        unit: "mA/cm2",
        raw_text: "Current density reached 24.1 mA/cm2.",
      },
    ],
  },
] as const;

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
}

function stripPdfExtension(fileName: string) {
  return fileName.replace(/\.pdf$/i, "");
}

async function createSignedFileUrl(storagePath?: string | null) {
  if (!storagePath) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { bucket } = getSupabaseConfig();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 60 * 15);

  if (error) {
    return null;
  }

  return data.signedUrl;
}

function normalizePaperMetadata(metadata: PaperMetadata | null | undefined): PaperMetadata {
  const value = metadata ?? {};
  const experimentalParams = normalizeExperimentalParams(value.experimental_params ?? []);

  return {
    ...value,
    experimental_params: experimentalParams,
    ...(value.analysis !== undefined
      ? {
          analysis: value.analysis
            ? {
                ...value.analysis,
                experimental_params: normalizeExperimentalParams(
                  value.analysis.experimental_params ?? value.experimental_params ?? [],
                ),
              }
            : null,
        }
      : {}),
  };
}

function normalizeNode(node: Record<string, unknown>): PaperNodeRecord {
  return {
    id: String(node.id),
    project_id: String(node.project_id),
    title: String(node.title),
    type: node.type as PaperNodeRecord["type"],
    metadata: normalizePaperMetadata((node.metadata as PaperMetadata | null) ?? {}),
    preview_file_url: (node.preview_file_url as string | null | undefined) || null,
    status: node.status as PaperNodeRecord["status"],
    analysis_status: node.analysis_status as PaperNodeRecord["analysis_status"],
    is_academic: Boolean(node.is_academic),
    publication_year:
      typeof node.publication_year === "number"
        ? node.publication_year
        : node.publication_year == null
          ? null
          : Number(node.publication_year),
    position_x:
      typeof node.position_x === "number"
        ? node.position_x
        : node.position_x == null
          ? null
          : Number(node.position_x),
    position_y:
      typeof node.position_y === "number"
        ? node.position_y
        : node.position_y == null
          ? null
          : Number(node.position_y),
    summary: (node.summary as string | null | undefined) || null,
    analysis_error: (node.analysis_error as string | null | undefined) || null,
    source_file_name: (node.source_file_name as string | null | undefined) || null,
    source_file_path: (node.source_file_path as string | null | undefined) || null,
    source_mime_type: (node.source_mime_type as string | null | undefined) || null,
    file_size_bytes:
      typeof node.file_size_bytes === "number"
        ? node.file_size_bytes
        : node.file_size_bytes == null
          ? null
          : Number(node.file_size_bytes),
    page_count:
      typeof node.page_count === "number"
        ? node.page_count
        : node.page_count == null
          ? null
          : Number(node.page_count),
    source_excerpt: (node.source_excerpt as string | null | undefined) || null,
    analysis_started_at: (node.analysis_started_at as string | null | undefined) || null,
    analysis_completed_at: (node.analysis_completed_at as string | null | undefined) || null,
    analysis_attempt_count:
      typeof node.analysis_attempt_count === "number"
        ? node.analysis_attempt_count
        : Number(node.analysis_attempt_count || 0),
    created_at: String(node.created_at),
    updated_at: String(node.updated_at),
  };
}

function normalizeProject(project: Record<string, unknown>): ProjectRecord {
  return {
    id: String(project.id),
    name: String(project.name),
    user_id: String(project.user_id),
    created_at: String(project.created_at),
    updated_at: String(project.updated_at),
  };
}

async function attachPreviewUrl(node: PaperNodeRecord): Promise<PaperNodeRecord> {
  const previewFileUrl = await createSignedFileUrl(node.source_file_path);

  return {
    ...node,
    preview_file_url: previewFileUrl,
    metadata: {
      ...node.metadata,
      pdf_url: previewFileUrl,
      cover_url: node.metadata.cover_url ?? null,
    },
  };
}

function normalizeEdge(edge: Record<string, unknown>): PaperEdgeRecord {
  return {
    project_id: String(edge.project_id),
    source_id: String(edge.source_id),
    target_id: String(edge.target_id),
    relation_type: edge.relation_type as PaperEdgeRecord["relation_type"],
    weight: typeof edge.weight === "number" ? edge.weight : Number(edge.weight || 0),
    is_locked: Boolean(edge.is_locked),
    created_at: String(edge.created_at),
  };
}

function slugifyCitationPart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function citationSurname(node: PaperNodeRecord) {
  const firstAuthor = node.metadata.authors?.[0];
  if (!firstAuthor) {
    return "Unknown";
  }

  const parts = firstAuthor.trim().split(/\s+/);
  return parts[parts.length - 1] || "Unknown";
}

function buildSynthesisCitation(node: PaperNodeRecord): SynthesisCitation {
  const surname = citationSurname(node);
  const year = node.publication_year ?? node.metadata.year ?? null;
  const extraAuthorCount = Math.max((node.metadata.authors?.length ?? 0) - 1, 0);
  const label = `[${surname}${extraAuthorCount > 0 ? " et al." : ""}, ${year ?? "n.d."}]`;
  const bibKey = `${slugifyCitationPart(surname)}${year ?? "nd"}${slugifyCitationPart(node.title).slice(0, 18)}`;

  return {
    bibKey,
    label,
    nodeId: node.id,
    title: node.title,
    venue: node.metadata.analysis?.venue ?? node.metadata.venue ?? null,
    year,
  };
}

function markdownToPlainText(markdown: string) {
  return markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeLatex(value: string) {
  return value.replace(/[&%$#_{}~^\\]/g, (token) => {
    const map: Record<string, string> = {
      "&": "\\&",
      "%": "\\%",
      "$": "\\$",
      "#": "\\#",
      "_": "\\_",
      "{": "\\{",
      "}": "\\}",
      "~": "\\textasciitilde{}",
      "^": "\\textasciicircum{}",
      "\\": "\\textbackslash{}",
    };
    return map[token] || token;
  });
}

function markdownToLatex(markdown: string, citations: SynthesisCitation[]) {
  const lines = markdown.split("\n");
  const converted: string[] = [];

  for (const line of lines) {
    if (line.startsWith("# ")) {
      converted.push(`\\section*{${escapeLatex(line.slice(2).trim())}}`);
      continue;
    }

    if (line.startsWith("## ")) {
      converted.push(`\\subsection*{${escapeLatex(line.slice(3).trim())}}`);
      continue;
    }

    if (line.startsWith("- ")) {
      converted.push(`\\begin{itemize}\n\\item ${escapeLatex(line.slice(2).trim())}\n\\end{itemize}`);
      continue;
    }

    if (!line.trim()) {
      converted.push("");
      continue;
    }

    const boldConverted = line.replace(/\*\*(.*?)\*\*/g, "\\textbf{$1}");
    converted.push(escapeLatex(boldConverted).replace(/\\textbackslash\{\}textbf\\\{(.*?)\\\}/g, "\\textbf{$1}"));
  }

  const references = citations
    .map(
      (citation) =>
        `\\item[${escapeLatex(citation.label)}] ${escapeLatex(citation.title)}${
          citation.venue ? `, ${escapeLatex(citation.venue)}` : ""
        }${citation.year ? `, ${citation.year}` : ""}. \\texttt{\\cite{${citation.bibKey}}}`,
    )
    .join("\n");

  return [
    converted.join("\n"),
    "",
    "\\subsection*{References}",
    "\\begin{description}",
    references,
    "\\end{description}",
  ]
    .join("\n")
    .trim();
}

function compareMetricPoints(
  left: { publicationYear: number | null; title: string },
  right: { publicationYear: number | null; title: string },
) {
  const yearDelta =
    (left.publicationYear ?? Number.MAX_SAFE_INTEGER) -
    (right.publicationYear ?? Number.MAX_SAFE_INTEGER);
  if (yearDelta !== 0) {
    return yearDelta;
  }

  return left.title.localeCompare(right.title);
}

function formatBibtexAuthorName(author: string) {
  const parts = author.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return author.trim();
  }

  const family = parts[parts.length - 1];
  const given = parts.slice(0, -1).join(" ");
  return `${family}, ${given}`;
}

function inferBibtexEntryType(venue: string | null | undefined) {
  const normalizedVenue = venue?.toLowerCase() ?? "";

  if (
    /\b(conference|proceedings|symposium|workshop|meeting|congress)\b/.test(normalizedVenue)
  ) {
    return "inproceedings";
  }

  if (venue) {
    return "article";
  }

  return "misc";
}

function buildBibtexEntry(node: PaperNodeRecord, citation: SynthesisCitation) {
  const entryType = inferBibtexEntryType(citation.venue);
  const authors = (node.metadata.authors ?? []).map(formatBibtexAuthorName).filter(Boolean);
  const fields = [
    [`title`, node.title],
    [`author`, authors.length > 0 ? authors.join(" and ") : null],
    [
      entryType === "inproceedings"
        ? "booktitle"
        : entryType === "article"
          ? "journal"
          : "howpublished",
      citation.venue ?? null,
    ],
    [`year`, citation.year ? String(citation.year) : null],
    [`note`, node.summary ?? null],
  ].filter((field): field is [string, string] => Boolean(field[1]));

  return [
    `@${entryType}{${citation.bibKey},`,
    ...fields.map(([key, value]) => `  ${key} = {${value}},`),
    `}`,
  ].join("\n");
}

function collectAnalysisTerms(node: Pick<PaperNodeRecord, "id" | "title" | "summary" | "metadata">) {
  const phrases = new Set<string>();
  const tokens = new Set<string>();
  const values = [
    ...(node.metadata.analysis?.topics ?? []),
    ...(node.metadata.analysis?.tech_route_tags ?? []),
    ...(node.metadata.tech_route_tags ?? []),
    node.metadata.venue ?? "",
    node.title,
  ];

  for (const value of values) {
    const normalizedPhrase = value.toLowerCase().replace(/\s+/g, " ").trim();
    if (!normalizedPhrase) {
      continue;
    }

    phrases.add(normalizedPhrase);

    for (const match of normalizedPhrase.matchAll(/[\p{L}\p{N}][\p{L}\p{N}-]{2,}/gu)) {
      tokens.add(match[0]);
    }
  }

  return { phrases, tokens };
}

function scoreSemanticSimilarity(
  left: Pick<PaperNodeRecord, "id" | "title" | "summary" | "metadata">,
  right: Pick<PaperNodeRecord, "id" | "title" | "summary" | "metadata">,
) {
  const leftTerms = collectAnalysisTerms(left);
  const rightTerms = collectAnalysisTerms(right);
  const sharedPhrases = [...leftTerms.phrases].filter((term) => rightTerms.phrases.has(term));
  const sharedTokens = [...leftTerms.tokens].filter((term) => rightTerms.tokens.has(term));
  const score = Math.min(0.98, sharedPhrases.length * 0.34 + sharedTokens.length * 0.08);

  return {
    score,
    sharedPhrases,
    sharedTokens,
  };
}

function compareNodeOrder(
  left: Pick<PaperNodeRecord, "id" | "created_at">,
  right: Pick<PaperNodeRecord, "id" | "created_at">,
) {
  const timeDelta = new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
  if (timeDelta !== 0) {
    return timeDelta;
  }

  return left.id.localeCompare(right.id);
}

function hasPath(adjacency: Map<string, Set<string>>, sourceId: string, targetId: string) {
  if (sourceId === targetId) {
    return true;
  }

  const queue = [sourceId];
  const visited = new Set<string>(queue);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    for (const next of adjacency.get(current) ?? []) {
      if (next === targetId) {
        return true;
      }

      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }

  return false;
}

function buildAdjacency(edges: PaperEdgeRecord[]) {
  const adjacency = new Map<string, Set<string>>();

  for (const edge of edges) {
    const targets = adjacency.get(edge.source_id) ?? new Set<string>();
    targets.add(edge.target_id);
    adjacency.set(edge.source_id, targets);
  }

  return adjacency;
}

async function getProjectForUserOrThrow(userId: string, projectId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_COLUMNS)
    .eq("user_id", userId)
    .eq("id", projectId)
    .single();

  if (error || !data) {
    throw new Error(error?.message || `Project ${projectId} was not found.`);
  }

  return normalizeProject(data as unknown as Record<string, unknown>);
}

async function getNodeForUserOrThrow(userId: string, projectId: string, nodeId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("nodes")
    .select(PAPER_NODE_COLUMNS)
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .eq("id", nodeId)
    .single();

  if (error || !data) {
    throw new Error(error?.message || `Paper node ${nodeId} was not found.`);
  }

  return normalizeNode(data as unknown as Record<string, unknown>);
}

async function ensureSampleProject(userId: string) {
  const supabase = getSupabaseAdmin();
  const { data: projectData, error: projectError } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      name: SAMPLE_PROJECT_NAME,
    })
    .select(PROJECT_COLUMNS)
    .single();

  if (projectError || !projectData) {
    throw new Error(projectError?.message || "Failed to create the sample project.");
  }

  const project = normalizeProject(projectData as unknown as Record<string, unknown>);
  const now = new Date().toISOString();
  const nodeIdByKey = new Map(samplePaperSeeds.map((seed) => [seed.key, randomUUID()]));
  const nodeRows = samplePaperSeeds.map((seed, index) => {
    const metadata: PaperMetadata = {
      authors: index % 2 === 0 ? ["A. Chen", "M. Rivera"] : ["J. Patel", "K. Lin"],
      year: seed.year,
      publication_year_source: "sample_project",
      publication_year_confidence: 0.98,
      academic_confidence: 0.95,
      academic_signals: ["abstract", "methods", "results", "references"],
      venue: seed.venue,
      tech_route_tags: [...seed.routeTags],
      experimental_params: [...seed.params],
      page_count: 12 + index,
      original_file_name: `${seed.key}.pdf`,
      pdf_url: null,
      cover_url: null,
      analysis: {
        key_points: [
          `Positions ${seed.routeTags[0]} as a core technical route.`,
          `Reports comparable ${seed.params.map((param) => param.label).join(" and ")} values.`,
          "Included in the sample project to demonstrate locked-chain synthesis.",
        ],
        mode: "mock",
        topics: [...seed.topics],
        venue: seed.venue,
        tech_route_tags: [...seed.routeTags],
        experimental_params: [...seed.params],
        provider: "mock",
        model: "sample-seed",
      },
      document: {
        page_count: 12 + index,
        extracted_excerpt_length: 420,
      },
    };

    return {
      id: nodeIdByKey.get(seed.key),
      user_id: userId,
      project_id: project.id,
      title: seed.title,
      type: "article",
      metadata,
      status: index >= 3 ? "deep" : "unread",
      analysis_status: "ready",
      is_academic: true,
      publication_year: seed.year,
      position_x: seed.x,
      position_y: seed.y,
      summary: seed.summary,
      source_file_name: `${seed.key}.pdf`,
      source_file_path: null,
      source_mime_type: "application/pdf",
      file_size_bytes: 1800000 + index * 120000,
      page_count: 12 + index,
      source_excerpt:
        "Sample project excerpt: quantum dot methods, parameter extraction, semantic route tagging, and locked chain synthesis are preloaded for onboarding.",
      analysis_error: null,
      analysis_started_at: now,
      analysis_completed_at: now,
      analysis_attempt_count: 1,
    };
  });

  const { error: nodeError } = await supabase.from("nodes").insert(nodeRows);
  if (nodeError) {
    throw new Error(nodeError.message);
  }

  const edgePairs = [
    ["surface-passivation-2019", "annealing-2020", 0.71],
    ["annealing-2020", "charge-transport-2021", 0.68],
    ["charge-transport-2021", "plqy-2022", 0.64],
    ["plqy-2022", "integrated-stack-2024", 0.78],
  ] as const;
  const { error: edgeError } = await supabase.from("edges").insert(
    edgePairs.map(([sourceKey, targetKey, weight]) => ({
      project_id: project.id,
      source_id: nodeIdByKey.get(sourceKey),
      target_id: nodeIdByKey.get(targetKey),
      relation_type: "semantic",
      weight,
      is_locked: true,
    })),
  );

  if (edgeError) {
    throw new Error(edgeError.message);
  }

  return project;
}

export async function listProjects(userId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  if ((data || []).length > 0) {
    return (data || []).map((project) => normalizeProject(project as unknown as Record<string, unknown>));
  }

  return [await ensureSampleProject(userId)];
}

export async function createProject(userId: string, name: string) {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Project name is required.");
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      name: trimmedName,
    })
    .select(PROJECT_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to create project.");
  }

  return normalizeProject(data as unknown as Record<string, unknown>);
}

export async function listPaperNodes(userId: string, projectId: string) {
  await getProjectForUserOrThrow(userId, projectId);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("nodes")
    .select(PAPER_NODE_COLUMNS)
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return Promise.all(
    (data || [])
      .map((node) => normalizeNode(node as unknown as Record<string, unknown>))
      .map((node) => attachPreviewUrl(node)),
  );
}

export async function listPaperEdges(userId: string, projectId: string) {
  await getProjectForUserOrThrow(userId, projectId);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("edges")
    .select(PAPER_EDGE_COLUMNS)
    .eq("project_id", projectId);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((edge) => normalizeEdge(edge as unknown as Record<string, unknown>));
}

export async function listPaperGraph(userId: string, projectId: string) {
  const [nodes, edges] = await Promise.all([
    listPaperNodes(userId, projectId),
    listPaperEdges(userId, projectId),
  ]);

  return { nodes, edges };
}

export async function getPaperNodeDetail(
  userId: string,
  projectId: string,
  nodeId: string,
): Promise<PaperNodeDetailRecord> {
  const node = await attachPreviewUrl(await getNodeForUserOrThrow(userId, projectId, nodeId));
  const signed_file_url = node.preview_file_url ?? null;

  return {
    ...node,
    metadata: {
      ...node.metadata,
      pdf_url: signed_file_url,
    },
    signed_file_url,
  };
}

export async function createPaperNodeFromUpload(
  userId: string,
  projectId: string,
  file: File,
  title?: string,
) {
  await getProjectForUserOrThrow(userId, projectId);

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Only PDF uploads are supported.");
  }

  const supabase = getSupabaseAdmin();
  const { bucket } = getSupabaseConfig();
  const fileBytes = new Uint8Array(await file.arrayBuffer());
  const fallbackTitle = title?.trim() || stripPdfExtension(file.name);
  const parsedMeta = await extractPdfMetadata(fileBytes, fallbackTitle);
  const storagePath = `${userId}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${sanitizeFileName(file.name)}`;

  const uploadResult = await supabase.storage.from(bucket).upload(storagePath, fileBytes, {
    contentType: file.type || "application/pdf",
    upsert: false,
  });

  if (uploadResult.error) {
    throw new Error(uploadResult.error.message);
  }

  const metadata: PaperMetadata = {
    authors: parsedMeta.authors,
    year: parsedMeta.year,
    publication_year_source: parsedMeta.year ? "pdf_metadata" : null,
    publication_year_confidence: parsedMeta.year ? 0.45 : null,
    academic_confidence: null,
    academic_signals: [],
    venue: null,
    tech_route_tags: [],
    experimental_params: [],
    page_count: parsedMeta.pageCount,
    original_file_name: file.name,
    pdf_url: null,
    cover_url: null,
  };

  const { data, error } = await supabase
    .from("nodes")
    .insert({
      user_id: userId,
      project_id: projectId,
      title: parsedMeta.title,
      type: "article",
      status: "unread",
      analysis_status: "uploaded",
      is_academic: true,
      publication_year: parsedMeta.year,
      source_file_name: file.name,
      source_file_path: storagePath,
      source_mime_type: file.type || "application/pdf",
      file_size_bytes: file.size,
      page_count: parsedMeta.pageCount,
      metadata,
    })
    .select(PAPER_NODE_COLUMNS)
    .single();

  if (error || !data) {
    await supabase.storage.from(bucket).remove([storagePath]);
    throw new Error(error?.message || "Failed to create paper node.");
  }

  return attachPreviewUrl(normalizeNode(data as unknown as Record<string, unknown>));
}

async function persistTimelineLayout(userId: string, projectId: string, forceReflow = false) {
  const supabase = getSupabaseAdmin();
  const { nodes, edges } = await listPaperGraph(userId, projectId);
  const positions = applyTimelineLayout(nodes, edges, { forceReflow });
  const updates = Object.entries(positions).filter(([nodeId, position]) => {
    const existing = nodes.find((node) => node.id === nodeId);
    return existing && (existing.position_x !== position.x || existing.position_y !== position.y);
  });

  if (updates.length === 0) {
    return;
  }

  await Promise.all(
    updates.map(([nodeId, position]) =>
      supabase
        .from("nodes")
        .update({
          position_x: position.x,
          position_y: position.y,
        })
        .eq("user_id", userId)
        .eq("project_id", projectId)
        .eq("id", nodeId),
    ),
  );
}

async function syncSemanticEdges(userId: string, projectId: string, currentNode: PaperNodeRecord) {
  const supabase = getSupabaseAdmin();
  const { nodes, edges } = await listPaperGraph(userId, projectId);
  const lockedEdges = edges.filter(
    (edge) =>
      edge.relation_type === "semantic" &&
      edge.is_locked &&
      (edge.source_id === currentNode.id || edge.target_id === currentNode.id),
  );
  const baseEdges = edges.filter(
    (edge) =>
      edge.relation_type !== "semantic" ||
      edge.is_locked ||
      (edge.source_id !== currentNode.id && edge.target_id !== currentNode.id),
  );
  const adjacency = buildAdjacency(baseEdges);

  const deleteResult = await supabase
    .from("edges")
    .delete()
    .eq("project_id", projectId)
    .eq("relation_type", "semantic")
    .eq("is_locked", false)
    .or(`source_id.eq.${currentNode.id},target_id.eq.${currentNode.id}`);

  if (deleteResult.error) {
    throw new Error(deleteResult.error.message);
  }

  if (!currentNode.is_academic) {
    return;
  }

  const readyNodes = nodes.filter(
    (node) =>
      node.analysis_status === "ready" &&
      node.is_academic &&
      node.id !== currentNode.id &&
      (node.metadata.analysis?.topics?.length || node.metadata.analysis?.key_points?.length),
  );

  if (
    !(currentNode.metadata.analysis?.topics?.length || currentNode.metadata.analysis?.key_points?.length)
  ) {
    return;
  }

  const candidates = readyNodes
    .map((node) => {
      const similarity = scoreSemanticSimilarity(currentNode, node);
      const [source, target] =
        compareNodeOrder(currentNode, node) <= 0 ? [currentNode, node] : [node, currentNode];

      return {
        source_id: source.id,
        target_id: target.id,
        relation_type: "semantic" as const,
        weight: Number(similarity.score.toFixed(2)),
        similarity,
      };
    })
    .filter(
      (edge) =>
        edge.weight >= 0.28 &&
        (edge.similarity.sharedPhrases.length > 0 || edge.similarity.sharedTokens.length >= 2),
    )
    .filter(
      (edge) =>
        !lockedEdges.some(
          (locked) =>
            locked.source_id === edge.source_id && locked.target_id === edge.target_id,
        ),
    )
    .sort((left, right) => right.weight - left.weight)
    .slice(0, 5);

  const accepted = candidates.flatMap((candidate) => {
    if (candidate.source_id === candidate.target_id) {
      return [];
    }

    if (hasPath(adjacency, candidate.target_id, candidate.source_id)) {
      return [];
    }

    const nextTargets = adjacency.get(candidate.source_id) ?? new Set<string>();
    nextTargets.add(candidate.target_id);
    adjacency.set(candidate.source_id, nextTargets);

    return [
      {
        project_id: projectId,
        source_id: candidate.source_id,
        target_id: candidate.target_id,
        relation_type: "semantic",
        weight: candidate.weight,
        is_locked: false,
      },
    ];
  });

  if (accepted.length === 0) {
    return;
  }

  const insertResult = await supabase.from("edges").insert(accepted);
  if (insertResult.error) {
    throw new Error(insertResult.error.message);
  }
}

export async function startPaperAnalysis(userId: string, projectId: string, nodeId: string) {
  const supabase = getSupabaseAdmin();
  const existing = await getNodeForUserOrThrow(userId, projectId, nodeId);

  if (existing.analysis_status === "analyzing") {
    return existing;
  }

  const { data, error } = await supabase
    .from("nodes")
    .update({
      analysis_status: "analyzing",
      analysis_error: null,
      analysis_started_at: new Date().toISOString(),
      analysis_completed_at: null,
      analysis_attempt_count: existing.analysis_attempt_count + 1,
    })
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .eq("id", nodeId)
    .select(PAPER_NODE_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to mark paper as analyzing.");
  }

  return normalizeNode(data as unknown as Record<string, unknown>);
}

async function markPaperAnalysisFailed(userId: string, projectId: string, nodeId: string, reason: string) {
  const supabase = getSupabaseAdmin();

  await supabase
    .from("nodes")
    .update({
      analysis_status: "error",
      analysis_error: reason.slice(0, 1000),
      analysis_completed_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .eq("id", nodeId);
}

export async function runPaperAnalysis(userId: string, projectId: string, nodeId: string) {
  const supabase = getSupabaseAdmin();
  const { bucket } = getSupabaseConfig();

  try {
    const node = await getNodeForUserOrThrow(userId, projectId, nodeId);

    if (!node.source_file_path || !node.source_file_name) {
      throw new Error("Paper node is missing its source file reference.");
    }

    if (node.analysis_status !== "analyzing") {
      return;
    }

    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(node.source_file_path);

    if (downloadError || !fileBlob) {
      throw new Error(downloadError?.message || "Failed to download PDF from storage.");
    }

    const fileBytes = new Uint8Array(await fileBlob.arrayBuffer());
    const extracted = await extractTextFromPdf(fileBytes);
    if (!extracted.text) {
      throw new Error("PDF text extraction produced an empty result.");
    }

    const { analysis, mode, provider, model } = await analyzePaperText({
      title: node.title,
      fileName: node.source_file_name,
      text: extracted.text,
      fallbackYear: node.publication_year ?? node.metadata.year ?? null,
    });

    const resolvedPublicationYear =
      analysis.publicationYear ?? node.publication_year ?? node.metadata.year ?? null;
    const mergedMetadata: PaperMetadata = {
      ...node.metadata,
      authors: node.metadata.authors ?? [],
      year: node.metadata.year ?? null,
      publication_year_source: analysis.publicationYearSource,
      publication_year_confidence: analysis.publicationYearSource ? analysis.academicConfidence : null,
      academic_confidence: analysis.academicConfidence,
      academic_signals: analysis.academicSignals,
      venue: analysis.venue,
      tech_route_tags: analysis.techRouteTags,
      experimental_params: analysis.experimentalParams,
      page_count: extracted.pageCount,
      pdf_url: null,
      cover_url: node.metadata.cover_url ?? null,
      original_file_name: node.source_file_name,
      analysis: {
        key_points: analysis.keyPoints,
        mode,
        topics: analysis.topics,
        venue: analysis.venue,
        tech_route_tags: analysis.techRouteTags,
        experimental_params: analysis.experimentalParams,
        provider,
        model,
      },
      document: {
        page_count: extracted.pageCount,
        extracted_excerpt_length: extracted.excerpt.length,
      },
    };

    const updatedNode: PaperNodeRecord = {
      ...node,
      title: analysis.title || node.title,
      metadata: mergedMetadata,
      summary: analysis.summary,
      page_count: extracted.pageCount,
      source_excerpt: extracted.excerpt,
      analysis_status: "ready",
      is_academic: analysis.isAcademic,
      publication_year: resolvedPublicationYear,
    };

    const { error } = await supabase
      .from("nodes")
      .update({
        title: updatedNode.title,
        metadata: mergedMetadata,
        summary: analysis.summary,
        page_count: extracted.pageCount,
        source_excerpt: extracted.excerpt,
        analysis_status: "ready",
        analysis_error: null,
        analysis_completed_at: new Date().toISOString(),
        is_academic: analysis.isAcademic,
        publication_year: resolvedPublicationYear,
      })
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .eq("id", nodeId);

    if (error) {
      throw new Error(error.message);
    }

    try {
      await syncSemanticEdges(userId, projectId, updatedNode);
      if (updatedNode.is_academic && (updatedNode.position_x == null || updatedNode.position_y == null)) {
        await persistTimelineLayout(userId, projectId, false);
      }
    } catch (semanticError) {
      console.error("Failed to sync semantic edges", semanticError);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Paper analysis failed for an unknown reason.";

    await markPaperAnalysisFailed(userId, projectId, nodeId, message);
    throw error;
  }
}

export async function relayoutProject(userId: string, projectId: string) {
  await getProjectForUserOrThrow(userId, projectId);
  await persistTimelineLayout(userId, projectId, true);
}

export async function updateEdgeLock(
  userId: string,
  projectId: string,
  input: {
    sourceId: string;
    targetId: string;
    relationType: PaperEdgeRecord["relation_type"];
    isLocked: boolean;
  },
) {
  await getProjectForUserOrThrow(userId, projectId);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("edges")
    .update({
      is_locked: input.isLocked,
    })
    .eq("project_id", projectId)
    .eq("source_id", input.sourceId)
    .eq("target_id", input.targetId)
    .eq("relation_type", input.relationType)
    .select(PAPER_EDGE_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to update edge lock state.");
  }

  return normalizeEdge(data as unknown as Record<string, unknown>);
}

export async function getChainMetrics(
  userId: string,
  projectId: string,
  targetNodeId: string,
): Promise<ChainMetricSeries[]> {
  await getProjectForUserOrThrow(userId, projectId);
  const { nodes, edges } = await listPaperGraph(userId, projectId);
  const chain = getLockedSynthesisChain(nodes, edges, targetNodeId);

  if (chain.nodes.length < 2) {
    return [];
  }

  const grouped = new Map<string, ChainMetricSeries>();

  for (const node of chain.nodes) {
    const params = normalizeExperimentalParams(
      node.metadata.analysis?.experimental_params ?? node.metadata.experimental_params ?? [],
    );

    for (const param of params) {
      if (!COMPARABLE_CHAIN_METRIC_KEYS.has(param.key) || node.publication_year == null) {
        continue;
      }

      const existing = grouped.get(param.key) ?? {
        key: param.key,
        label: param.label,
        unit: param.unit ?? null,
        points: [],
      };

      existing.points.push({
        nodeId: node.id,
        title: node.title,
        publicationYear: node.publication_year,
        value: param.value,
        unit: param.unit ?? null,
        rawText: param.raw_text,
        venue: node.metadata.analysis?.venue ?? node.metadata.venue ?? null,
      });
      grouped.set(param.key, existing);
    }
  }

  return [...grouped.values()]
    .map((series) => ({
      ...series,
      points: series.points.toSorted(compareMetricPoints),
    }))
    .filter((series) => series.points.length >= 2)
    .sort((left, right) => right.points.length - left.points.length || left.label.localeCompare(right.label));
}

export async function generateSynthesisReview(
  userId: string,
  projectId: string,
  targetNodeId: string,
): Promise<SynthesisReview> {
  const project = await getProjectForUserOrThrow(userId, projectId);
  const { nodes, edges } = await listPaperGraph(userId, projectId);
  const chain = getLockedSynthesisChain(nodes, edges, targetNodeId);

  if (chain.nodes.length < 2) {
    throw new Error("Select a node that belongs to a locked semantic chain with at least two papers.");
  }

  const citations = chain.nodes.map((node) => buildSynthesisCitation(node));

  const synthesis = await synthesizeLockedReview({
    title: project.name,
    chain: chain.nodes.map((node) => ({
      title: node.title,
      publicationYear: node.publication_year ?? null,
      summary: node.summary ?? null,
      venue: node.metadata.analysis?.venue ?? node.metadata.venue ?? null,
      techRouteTags:
        node.metadata.analysis?.tech_route_tags ?? node.metadata.tech_route_tags ?? [],
      experimentalParams:
        node.metadata.analysis?.experimental_params ?? node.metadata.experimental_params ?? [],
      keyPoints: node.metadata.analysis?.key_points ?? [],
    })),
  });

  const markdownWithReferences = [
    synthesis.markdown.trim(),
    "",
    "## References",
    ...citations.map(
      (citation) =>
        `- ${citation.label} ${citation.title}${citation.venue ? `, ${citation.venue}` : ""}${
          citation.year ? `, ${citation.year}` : ""
        }. \\cite{${citation.bibKey}}`,
    ),
  ].join("\n");
  const bibtex = chain.nodes
    .map((node, index) => buildBibtexEntry(node, citations[index]))
    .join("\n\n");

  return {
    markdown: markdownWithReferences,
    plainText: markdownToPlainText(markdownWithReferences),
    latex: markdownToLatex(markdownWithReferences, citations),
    bibtex,
    citations,
    nodeIds: chain.nodeIds,
    targetNodeId,
    generatedAt: new Date().toISOString(),
  };
}
