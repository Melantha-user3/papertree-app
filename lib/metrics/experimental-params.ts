import type { ExperimentalParam } from "@/lib/types/papertree";

const PARAM_KEY_ALIASES: Array<{ key: string; label: string; patterns: RegExp[] }> = [
  {
    key: "efficiency",
    label: "Efficiency",
    patterns: [/\befficiency\b/i, /\bpce\b/i, /\bpower conversion efficiency\b/i],
  },
  {
    key: "plqy",
    label: "PLQY",
    patterns: [/\bplqy\b/i, /\bphotoluminescence quantum yield\b/i],
  },
  {
    key: "responsivity",
    label: "Responsivity",
    patterns: [/\bresponsivity\b/i],
  },
  {
    key: "current_density",
    label: "Current Density",
    patterns: [/\bcurrent density\b/i],
  },
  {
    key: "luminance",
    label: "Luminance",
    patterns: [/\bluminance\b/i, /\bbrightness\b/i],
  },
];

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = compactWhitespace(value);
  return normalized || null;
}

function normalizeNumericValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/,/g, ""));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

export function inferExperimentalParamIdentity(label: string) {
  const normalizedLabel = compactWhitespace(label);

  for (const alias of PARAM_KEY_ALIASES) {
    if (alias.patterns.some((pattern) => pattern.test(normalizedLabel))) {
      return {
        key: alias.key,
        label: alias.label,
      };
    }
  }

  const fallbackKey = normalizedLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return {
    key: fallbackKey || "metric",
    label: normalizedLabel,
  };
}

export function normalizeExperimentalParamEntry(entry: unknown): ExperimentalParam | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const record = entry as Record<string, unknown>;
  const sourceLabel = normalizeOptionalString(record.label) ?? normalizeOptionalString(record.key);
  if (!sourceLabel) {
    return null;
  }

  const identity = inferExperimentalParamIdentity(sourceLabel);
  const unit = normalizeOptionalString(record.unit);
  const rawText =
    normalizeOptionalString(record.raw_text) ??
    normalizeOptionalString(record.rawText) ??
    `${sourceLabel}${record.value != null ? `: ${String(record.value)}` : ""}${unit ? ` ${unit}` : ""}`;
  const value = normalizeNumericValue(record.value);

  if (value == null) {
    return null;
  }

  return {
    key: normalizeOptionalString(record.key) ?? identity.key,
    label: identity.label,
    value,
    unit,
    raw_text: rawText,
  } satisfies ExperimentalParam;
}

export function normalizeExperimentalParams(value: unknown): ExperimentalParam[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => normalizeExperimentalParamEntry(entry))
    .filter((entry): entry is ExperimentalParam => Boolean(entry))
    .slice(0, 12);
}
