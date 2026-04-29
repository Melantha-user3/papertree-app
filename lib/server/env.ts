import type { LlmMode } from "@/lib/types/papertree";

function getOptionalEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }

  return null;
}

function normalizeMode(value: string | null): LlmMode {
  switch (value?.toLowerCase()) {
    case "mock":
      return "mock";
    case "ollama":
      return "ollama";
    case "remote":
      return "remote";
    default:
      return "auto";
  }
}

function normalizeOpenAiBaseUrl(value: string) {
  return value.endsWith("/v1") || value.endsWith("/v1/") ? value.replace(/\/+$/, "") : `${value.replace(/\/+$/, "")}/v1`;
}

function getRequiredEnv(...names: string[]) {
  const value = getOptionalEnv(...names);
  if (value) {
    return value;
  }

  throw new Error(`Missing required environment variable. Expected one of: ${names.join(", ")}`);
}

export function getSupabasePublicConfig() {
  return {
    url: getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"),
    publishableKey: getRequiredEnv(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    ),
    bucket: process.env.SUPABASE_STORAGE_BUCKET || "papers",
  };
}

export function getSupabaseConfig() {
  return {
    url: getRequiredEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"),
    serviceRoleKey: getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    bucket: process.env.SUPABASE_STORAGE_BUCKET || "papers",
  };
}

export function getLlmConfig() {
  const mode = normalizeMode(getOptionalEnv("LLM_MODE"));

  const remoteApiKey = getOptionalEnv(
    "LLM_API_KEY",
    "DEEPSEEK_API_KEY",
    "QWEN_API_KEY",
    "DASHSCOPE_API_KEY",
    "OPENAI_API_KEY",
  );
  const remoteBaseURL =
    getOptionalEnv(
      "LLM_BASE_URL",
      "DEEPSEEK_BASE_URL",
      "QWEN_BASE_URL",
      "DASHSCOPE_BASE_URL",
      "OPENAI_BASE_URL",
    ) ||
    (process.env.DEEPSEEK_API_KEY
      ? "https://api.deepseek.com"
      : process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY
        ? "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
        : process.env.OPENAI_API_KEY
          ? "https://api.openai.com/v1"
          : null);
  const remoteModel =
    getOptionalEnv(
      "LLM_MODEL",
      "DEEPSEEK_MODEL",
      "QWEN_MODEL",
      "DASHSCOPE_MODEL",
      "OPENAI_MODEL",
    ) ||
    (process.env.DEEPSEEK_API_KEY
      ? "deepseek-chat"
      : process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY
        ? "qwen-plus"
        : process.env.OPENAI_API_KEY
          ? "gpt-4o-mini"
          : null);

  const ollamaBaseURL = normalizeOpenAiBaseUrl(
    getOptionalEnv("LOCAL_OLLAMA_URL", "OLLAMA_BASE_URL") || "http://localhost:11434",
  );
  const ollamaModel = getOptionalEnv("OLLAMA_MODEL") || "llama3";
  const ollamaApiKey = getOptionalEnv("OLLAMA_API_KEY") || "ollama";

  if (mode === "mock") {
    return {
      mode: "mock" as const,
      apiKey: null,
      baseURL: null,
      model: "mock-synth",
    };
  }

  if (mode === "ollama") {
    return {
      mode: "ollama" as const,
      apiKey: ollamaApiKey,
      baseURL: ollamaBaseURL,
      model: ollamaModel,
    };
  }

  if (mode === "remote") {
    return {
      mode: "remote" as const,
      apiKey: getRequiredEnv(
        "LLM_API_KEY",
        "DEEPSEEK_API_KEY",
        "QWEN_API_KEY",
        "DASHSCOPE_API_KEY",
        "OPENAI_API_KEY",
      ),
      baseURL: remoteBaseURL || getRequiredEnv(
        "LLM_BASE_URL",
        "DEEPSEEK_BASE_URL",
        "QWEN_BASE_URL",
        "DASHSCOPE_BASE_URL",
        "OPENAI_BASE_URL",
      ),
      model: remoteModel || getRequiredEnv(
        "LLM_MODEL",
        "DEEPSEEK_MODEL",
        "QWEN_MODEL",
        "DASHSCOPE_MODEL",
        "OPENAI_MODEL",
      ),
    };
  }

  if (remoteApiKey && remoteBaseURL && remoteModel) {
    return {
      mode: "remote" as const,
      apiKey: remoteApiKey,
      baseURL: remoteBaseURL,
      model: remoteModel,
    };
  }

  return {
    mode: "mock" as const,
    apiKey: null,
    baseURL: null,
    model: "mock-synth",
  };
}
