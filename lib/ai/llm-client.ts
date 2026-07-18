import OpenAI from "openai";
import { getLlmConfig } from "@/lib/server/env";
import {
  inferExperimentalParamIdentity,
  normalizeExperimentalParams,
} from "@/lib/metrics/experimental-params";
import type { ExperimentalParam, LlmMode, PaperAnalysisResult } from "@/lib/types/papertree";

const MAX_DOCUMENT_CHARS = 48000;
const MAX_MOCK_TOPICS = 5;
const STOP_WORDS = new Set([
  "a",
  "about",
  "all",
  "an",
  "analysis",
  "after",
  "among",
  "any",
  "also",
  "are",
  "as",
  "at",
  "by",
  "been",
  "being",
  "between",
  "both",
  "can",
  "could",
  "each",
  "for",
  "from",
  "in",
  "is",
  "it",
  "its",
  "have",
  "has",
  "had",
  "how",
  "into",
  "may",
  "more",
  "most",
  "not",
  "of",
  "only",
  "on",
  "or",
  "other",
  "over",
  "paper",
  "papers",
  "pdf",
  "please",
  "research",
  "result",
  "results",
  "shows",
  "such",
  "that",
  "the",
  "their",
  "there",
  "these",
  "this",
  "through",
  "was",
  "were",
  "when",
  "which",
  "will",
  "using",
  "with",
  "your",
]);

const MOCK_TOPIC_LIBRARY = [
  {
    label: "Quantum Dots",
    aliases: ["quantum dot", "quantum dots", "pbs quantum dot", "pbs quantum dots"],
  },
  {
    label: "Annealing Optimization",
    aliases: ["annealing optimization", "efficient annealing", "annealing"],
  },
  {
    label: "Search-and-Verification",
    aliases: ["search and verification", "search-and-verification", "verification framework"],
  },
  {
    label: "Photoluminescence",
    aliases: ["photoluminescence", "photoluminescent", "pl intensity", "plqy"],
  },
  {
    label: "Framework Design",
    aliases: ["framework design", "framework", "design strategy"],
  },
  {
    label: "Experimental Validation",
    aliases: ["experimental validation", "experimental", "validation", "benchmark"],
  },
  {
    label: "Surface Passivation",
    aliases: ["surface passivation", "passivation", "ligand exchange", "ligand"],
  },
  {
    label: "Device Integration",
    aliases: ["device integration", "device", "implementation"],
  },
  {
    label: "Materials Characterization",
    aliases: ["characterization", "materials characterization", "spectroscopy"],
  },
];
const MOCK_TOPIC_FALLBACKS = [
  "Framework Design",
  "Experimental Validation",
  "Materials Characterization",
  "Device Integration",
  "Research Framing",
];
const ACADEMIC_SIGNAL_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "doi", pattern: /\bdoi\b|10\.\d{4,9}\/[-._;()/:a-z0-9]+/i },
  { label: "abstract", pattern: /\babstract\b/i },
  { label: "references", pattern: /\breferences\b|\bbibliography\b/i },
  { label: "introduction", pattern: /\bintroduction\b/i },
  { label: "methodology", pattern: /\bmethod(?:s|ology)?\b/i },
  { label: "results", pattern: /\bresults?\b/i },
];
const TECH_ROUTE_LIBRARY = [
  { label: "Annealing", pattern: /\banneal(?:ing|ed)?\b/i },
  { label: "Passivation", pattern: /\bpassivat(?:ion|ed)\b|\bligand\b/i },
  { label: "Surface Engineering", pattern: /\bsurface\b.*\b(modification|engineering|treatment)\b/i },
  { label: "Device Integration", pattern: /\bdevice\b|\bphotodetector\b|\bled\b|\bsolar cell\b/i },
  { label: "Photoluminescence", pattern: /\bphotoluminescence\b|\bplqy\b|\bpl intensity\b/i },
  { label: "Charge Transport", pattern: /\bcharge transport\b|\bhole transport\b|\belectron transport\b/i },
  { label: "Spin Coating", pattern: /\bspin[- ]coating\b/i },
  { label: "Calibration", pattern: /\bcalibration\b|\bprecise aperture\b/i },
];
const VENUE_PATTERNS = [
  /\b(?:journal|letters|transactions|review|proceedings)\b[^\n]{0,80}/i,
  /\b(?:advanced materials|nature [a-z]+|acs [a-z.& ]+|ieee [a-z.& ]+|science advances)\b/i,
];
const EXPERIMENTAL_PARAM_PATTERNS: Array<{ label: string; pattern: RegExp; unit?: string }> = [
  { label: "Efficiency", pattern: /\b(?:efficiency|pce|eqe)\b[^.\n]{0,20}?(\d+(?:\.\d+)?)\s*%/i, unit: "%" },
  { label: "PLQY", pattern: /\bplqy\b[^.\n]{0,20}?(\d+(?:\.\d+)?)\s*%/i, unit: "%" },
  { label: "Luminance", pattern: /\b(?:luminance|brightness)\b[^.\n]{0,20}?(\d+(?:\.\d+)?)\s*(cd\/m2|cd m-2|nit(?:s)?)\b/i },
  { label: "Responsivity", pattern: /\bresponsivity\b[^.\n]{0,20}?(\d+(?:\.\d+)?)\s*(a\/w|ma\/w)\b/i },
  { label: "Current Density", pattern: /\bcurrent density\b[^.\n]{0,20}?(\d+(?:\.\d+)?)\s*(ma\/cm2|a\/cm2)\b/i },
];

export function compactWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function clipDocument(text: string) {
  return text.length > MAX_DOCUMENT_CHARS ? text.slice(0, MAX_DOCUMENT_CHARS) : text;
}

function normalizeForMatching(value: string) {
  return compactWhitespace(value).toLowerCase().replace(/[^a-z0-9]+/g, " ");
}

function extractJsonPayload(content: string) {
  const fencedMatch = content.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");

  if (start >= 0 && end > start) {
    return content.slice(start, end + 1);
  }

  throw new Error("LLM response did not contain a JSON object.");
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => compactWhitespace(item))
    .filter(Boolean)
    .slice(0, 6);
}

function normalizeProbability(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(1, value));
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.min(1, parsed));
    }
  }

  return null;
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = compactWhitespace(value);
  return normalized || null;
}

function normalizeBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }

    if (normalized === "false") {
      return false;
    }
  }

  return null;
}

function normalizePublicationYear(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value >= 1800 && value <= 2100) {
    return value;
  }

  if (typeof value === "string") {
    const match = value.match(/\b(18|19|20)\d{2}\b/);
    if (match) {
      return Number(match[0]);
    }
  }

  return null;
}

function collectFrequentTerms(text: string) {
  const counts = new Map<string, number>();

  for (const match of text.toLowerCase().matchAll(/[\p{L}\p{N}][\p{L}\p{N}-]{2,}/gu)) {
    const token = compactWhitespace(match[0]);
    if (!token || STOP_WORDS.has(token)) {
      continue;
    }

    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([token]) => token);
}

function toDisplayTopic(token: string) {
  return token
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function extractTitlePhrases(title: string) {
  const tokens = title
    .split(/[^a-zA-Z0-9]+/)
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length >= 4 && !STOP_WORDS.has(token));

  const phrases: string[] = [];

  for (let index = 0; index < tokens.length - 1; index += 1) {
    const candidate = `${tokens[index]} ${tokens[index + 1]}`;
    if (!phrases.includes(candidate)) {
      phrases.push(candidate);
    }
  }

  return phrases.map(toDisplayTopic);
}

function buildMockTopics(input: { title: string; fileName: string; text: string }) {
  const corpus = [input.title, input.fileName.replace(/\.pdf$/i, ""), clipDocument(input.text)].join(
    "\n",
  );
  const normalizedCorpus = normalizeForMatching(corpus);
  const matchedTopics = MOCK_TOPIC_LIBRARY.filter((entry) =>
    entry.aliases.some((alias) => normalizedCorpus.includes(normalizeForMatching(alias))),
  ).map((entry) => entry.label);
  const titlePhrases = extractTitlePhrases(input.title).filter(
    (phrase) => !matchedTopics.includes(phrase),
  );
  const seedTerms = collectFrequentTerms(corpus)
    .map(toDisplayTopic)
    .filter((token) => token.length >= 4 && !matchedTopics.includes(token));

  const merged = [...matchedTopics, ...titlePhrases, ...seedTerms];

  for (const fallback of MOCK_TOPIC_FALLBACKS) {
    if (merged.length >= MAX_MOCK_TOPICS) {
      break;
    }

    if (!merged.includes(fallback)) {
      merged.push(fallback);
    }
  }

  return merged.slice(0, MAX_MOCK_TOPICS);
}

function titleFromInput(input: { title: string; fileName: string }) {
  return compactWhitespace(input.title || input.fileName.replace(/\.pdf$/i, "").replace(/[-_]+/g, " "));
}

function collectAcademicSignals(text: string) {
  return ACADEMIC_SIGNAL_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(({ label }) => label);
}

function inferVenue(text: string) {
  for (const pattern of VENUE_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[0]) {
      return compactWhitespace(match[0]);
    }
  }

  return null;
}

function inferTechRouteTags(text: string, topics: string[]) {
  const routeTags = TECH_ROUTE_LIBRARY.filter(({ pattern }) => pattern.test(text)).map(
    ({ label }) => label,
  );
  const topicRoutes = topics.filter((topic) =>
    ["Annealing Optimization", "Photoluminescence", "Device Integration"].includes(topic),
  );

  return [...new Set([...routeTags, ...topicRoutes])].slice(0, 6);
}

function inferExperimentalParams(text: string) {
  const params: ExperimentalParam[] = [];

  for (const descriptor of EXPERIMENTAL_PARAM_PATTERNS) {
    const match = text.match(descriptor.pattern);
    if (!match?.[1]) {
      continue;
    }

    const identity = inferExperimentalParamIdentity(descriptor.label);
    const value = Number.parseFloat(match[1]);
    if (!Number.isFinite(value)) {
      continue;
    }

    params.push({
      key: identity.key,
      label: identity.label,
      value,
      unit: normalizeOptionalString(match[2] || descriptor.unit || null),
      raw_text: match[0],
    });
  }

  return params.slice(0, 6);
}

export function inferPublicationYear(text: string, fallbackYear: number | null) {
  const matches = [...text.matchAll(/\b(19|20)\d{2}\b/g)].map((match) => Number(match[0]));
  const filtered = matches.filter((year) => year >= 1900 && year <= new Date().getFullYear() + 1);

  if (filtered.length === 0) {
    return {
      publicationYear: fallbackYear,
      publicationYearSource: fallbackYear ? "pdf_metadata" : null,
    };
  }

  const frequency = new Map<number, number>();
  for (const year of filtered) {
    frequency.set(year, (frequency.get(year) ?? 0) + 1);
  }

  const mostLikelyYear = [...frequency.entries()].sort(
    (left, right) => right[1] - left[1] || right[0] - left[0],
  )[0]?.[0];

  return {
    publicationYear: mostLikelyYear ?? fallbackYear,
    publicationYearSource: mostLikelyYear ? "document_text" : fallbackYear ? "pdf_metadata" : null,
  };
}

export function buildMockAnalysis(input: {
  title: string;
  fileName: string;
  text: string;
  fallbackYear: number | null;
}): PaperAnalysisResult {
  const fallbackTitle = titleFromInput(input);
  const topics = buildMockTopics(input);
  const leadTopic = topics[0] || "Research Framing";
  const secondaryTopics = topics.slice(1, 3);
  const academicSignals = collectAcademicSignals(input.text);
  const { publicationYear, publicationYearSource } = inferPublicationYear(input.text, input.fallbackYear);
  const isAcademic = academicSignals.length >= 2;
  const venue = inferVenue(input.text);
  const techRouteTags = inferTechRouteTags(input.text, topics);
  const experimentalParams = inferExperimentalParams(input.text);
  const keyPoints = [
    `Highlights ${leadTopic} as a recurring focus area.`,
    secondaryTopics[0]
      ? `Connects the document to ${secondaryTopics[0]} concepts.`
      : "Connects the document to adjacent materials-science concepts.",
    topics[3]
      ? `Surfaces ${topics[3]} as a likely experimental or framing signal.`
      : "Surfaces the paper as a candidate for cross-document semantic linking.",
    "Marks this result as local mock analysis so the UI flow can be demonstrated safely.",
    secondaryTopics[1]
      ? `Suggests this paper may overlap with other ${secondaryTopics[1]} material in the workspace.`
      : "Suggests overlap with related material in the workspace.",
  ].slice(0, 5);

  const summaryParts = [
    `${fallbackTitle} appears to center on ${leadTopic.toLowerCase()}${secondaryTopics.length > 0 ? `, with ${secondaryTopics.map((topic) => topic.toLowerCase()).join(" and ")} as likely method and evaluation axes` : ""}.`,
    "This mock analysis is generated locally to keep the upload, reader, and graph interactions working even when no remote model is configured.",
    topics[3]
      ? `The extracted themes suggest likely semantic overlap with papers discussing ${topics[3].toLowerCase()} or related implementation details.`
      : "The extracted themes are still strong enough to drive demo-only semantic linking in the canvas.",
  ];

  return {
    title: fallbackTitle,
    summary: summaryParts.join(" "),
    keyPoints,
    topics:
      topics.length > 0
        ? topics
        : ["Framework Design", "Experimental Validation", "Research Framing"],
    isAcademic,
    publicationYear,
    publicationYearSource,
    academicConfidence: isAcademic ? 0.68 : 0.22,
    academicSignals,
    venue,
    techRouteTags,
    experimentalParams,
  };
}

function parseAnalysisPayload(
  rawContent: string,
  fallbackTitle: string,
  fallbackYear: number | null,
): PaperAnalysisResult {
  const payload = JSON.parse(extractJsonPayload(rawContent)) as Record<string, unknown>;
  const summary = typeof payload.summary === "string" ? compactWhitespace(payload.summary) : "";
  const title = typeof payload.title === "string" ? compactWhitespace(payload.title) : fallbackTitle;

  if (!summary) {
    throw new Error("LLM response did not include a usable summary.");
  }

  return {
    title: title || fallbackTitle,
    summary,
    keyPoints: normalizeStringArray(payload.key_points),
    topics: normalizeStringArray(payload.topics),
    isAcademic: normalizeBoolean(payload.is_academic) ?? true,
    publicationYear: normalizePublicationYear(payload.publication_year) ?? fallbackYear,
    publicationYearSource:
      typeof payload.publication_year_source === "string"
        ? compactWhitespace(payload.publication_year_source)
        : fallbackYear
          ? "pdf_metadata"
          : null,
    academicConfidence: normalizeProbability(payload.academic_confidence),
    academicSignals: normalizeStringArray(payload.academic_signals),
    venue: normalizeOptionalString(payload.venue),
    techRouteTags: normalizeStringArray(payload.tech_route_tags),
    experimentalParams: normalizeExperimentalParams(payload.experimental_params),
  };
}

function resolveProviderName(baseURL: string) {
  if (baseURL.includes("localhost:11434") || baseURL.includes("127.0.0.1:11434")) {
    return "ollama";
  }

  if (baseURL.includes("deepseek")) {
    return "deepseek";
  }

  if (baseURL.includes("dashscope") || baseURL.includes("alibabacloud")) {
    return "qwen";
  }

  return "custom";
}

async function analyzeWithOpenAiCompatible(input: {
  title: string;
  fileName: string;
  text: string;
  fallbackYear: number | null;
  apiKey: string;
  baseURL: string;
  model: string;
}) {
  const client = new OpenAI({
    apiKey: input.apiKey,
    baseURL: input.baseURL,
    maxRetries: 2,
    timeout: 120000,
  });

  const completion = await client.chat.completions.create({
    model: input.model,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content:
          "You extract practical metadata from uploaded PDFs. Return JSON only with keys title, summary, key_points, topics, is_academic, publication_year, publication_year_source, academic_confidence, academic_signals, venue, tech_route_tags, experimental_params. summary must be 2-4 sentences. key_points, topics, academic_signals, and tech_route_tags must be short arrays of strings. experimental_params must be an array of objects with key, label, value, unit, and raw_text. value must be numeric, not a string. key should be a stable lowercase metric id such as efficiency, plqy, responsivity, current_density, or luminance. is_academic should be false for invoices, visas, forms, slides, or other non-research documents. publication_year must be the actual publication year when you can infer it from the text, not the file creation time. venue should be the journal, conference, or proceedings name when available. tech_route_tags should capture method directions such as Annealing, Passivation, Charge Transport, or Device Integration.",
      },
      {
        role: "user",
        content: [
          `Current title: ${input.title}`,
          `Original file name: ${input.fileName}`,
          `Fallback publication year from PDF metadata: ${input.fallbackYear ?? "unknown"}`,
          "PDF text excerpt:",
          clipDocument(input.text),
        ].join("\n\n"),
      },
    ],
  });

  const rawContent = completion.choices[0]?.message?.content;
  if (!rawContent) {
    throw new Error("LLM returned an empty completion.");
  }

  return parseAnalysisPayload(rawContent, input.title, input.fallbackYear);
}

export async function analyzePaperText(input: {
  title: string;
  fileName: string;
  text: string;
  fallbackYear: number | null;
}) {
  const { apiKey, baseURL, mode, model } = getLlmConfig();
  let analysis: PaperAnalysisResult;
  let provider: string;
  let resolvedMode: Exclude<LlmMode, "auto">;

  if (mode === "mock") {
    analysis = buildMockAnalysis(input);
    provider = "mock";
    resolvedMode = "mock";
  } else {
    analysis = await analyzeWithOpenAiCompatible({
      ...input,
      apiKey: apiKey || "ollama",
      baseURL: baseURL || "http://localhost:11434/v1",
      model,
    });
    provider = mode === "ollama" ? "ollama" : resolveProviderName(baseURL || "");
    resolvedMode = mode;
  }

  return {
    analysis,
    mode: resolvedMode,
    provider,
    model,
  };
}

export function buildMockSynthesisReview(input: {
  title: string;
  chain: Array<{
    title: string;
    publicationYear: number | null;
    summary: string | null;
    venue: string | null;
    techRouteTags: string[];
    experimentalParams: ExperimentalParam[];
  }>;
}) {
  const sorted = input.chain;
  const intro = sorted
    .map((node) => {
      const year = node.publicationYear ?? "Unknown year";
      const route = node.techRouteTags[0] ? ` on ${node.techRouteTags[0].toLowerCase()}` : "";
      return `- ${year}: **${node.title}**${route}${node.venue ? ` (${node.venue})` : ""}`;
    })
    .join("\n");
  const findings = sorted
    .map((node) => {
      const params =
        node.experimentalParams.length > 0
          ? ` Reported parameters include ${node.experimentalParams
              .map((param) => `${param.label} ${param.value}${param.unit ? ` ${param.unit}` : ""}`)
              .join(", ")}.`
          : "";
      return `**${node.title}**. ${node.summary ?? "This node contributes to the locked research trajectory."}${params}`;
    })
    .join("\n\n");

  return [
    `# Literature Review: ${input.title}`,
    "",
    "## Timeline",
    intro,
    "",
    "## Synthesis",
    findings,
  ].join("\n");
}

export async function synthesizeLockedReview(input: {
  title: string;
  chain: Array<{
    title: string;
    publicationYear: number | null;
    summary: string | null;
    venue: string | null;
    techRouteTags: string[];
    experimentalParams: ExperimentalParam[];
    keyPoints: string[];
  }>;
}) {
  const { apiKey, baseURL, mode, model } = getLlmConfig();

  if (mode === "mock") {
    return {
      markdown: buildMockSynthesisReview(input),
      mode: "mock" as const,
      provider: "mock",
      model,
    };
  }

  const client = new OpenAI({
    apiKey: apiKey || "ollama",
    baseURL: baseURL || "http://localhost:11434/v1",
    maxRetries: 2,
    timeout: 120000,
  });

  const reviewContext = input.chain
    .map((node, index) =>
      [
        `Node ${index + 1}`,
        `Title: ${node.title}`,
        `Publication year: ${node.publicationYear ?? "Unknown"}`,
        `Venue: ${node.venue ?? "Unknown"}`,
        `Tech route tags: ${node.techRouteTags.join(", ") || "None"}`,
        `Summary: ${node.summary ?? "None"}`,
        `Key points: ${node.keyPoints.join(" | ") || "None"}`,
        `Experimental params: ${
          node.experimentalParams.length > 0
            ? node.experimentalParams
                .map((param) => `${param.label}=${param.value}${param.unit ? ` ${param.unit}` : ""}`)
                .join("; ")
            : "None"
        }`,
      ].join("\n"),
    )
    .join("\n\n");

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You are a materials science research assistant. Write a concise but technically grounded markdown literature review from a locked chain of papers. Emphasize how the method evolves over time, cite concrete parameter improvements when available, and avoid inventing missing measurements. Structure the result with the markdown headings: Title, Evolution, Parameter Trends, and Takeaway.",
      },
      {
        role: "user",
        content: [
          `Locked chain title: ${input.title}`,
          "Use the following ordered paper nodes as the only source of truth:",
          reviewContext,
        ].join("\n\n"),
      },
    ],
  });

  return {
    markdown:
      completion.choices[0]?.message?.content?.trim() ||
      buildMockSynthesisReview(input),
    mode,
    provider: mode === "ollama" ? "ollama" : resolveProviderName(baseURL || ""),
    model,
  };
}
