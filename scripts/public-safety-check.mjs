import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function fail(message) {
  console.error(`public-safety-check: ${message}`);
  process.exitCode = 1;
}

function listTrackedFiles() {
  return git(["ls-files"]).split("\n").filter(Boolean);
}

function requireGitIdentity() {
  const name = git(["config", "--local", "--get", "user.name"]);
  const email = git(["config", "--local", "--get", "user.email"]);

  if (name !== "Melantha-user3" || email !== "Melantha-user3@users.noreply.github.com") {
    fail(
      "local Git identity must be Melantha-user3 <Melantha-user3@users.noreply.github.com> for Vercel deployment attribution.",
    );
  }
}

function checkTrackedSecretFiles(files) {
  const forbidden = files.filter((file) => {
    if (file === ".env.example") {
      return false;
    }

    return (
      file === ".env" ||
      file.startsWith(".env.") ||
      file === ".vercel/.env.production.local" ||
      file.startsWith(".vercel/")
    );
  });

  if (forbidden.length > 0) {
    fail(`tracked secret/deployment files found: ${forbidden.join(", ")}`);
  }
}

function checkSecretLikeContent(files) {
  const envAssignmentPattern =
    /^[^\S\r\n]*(SUPABASE_SERVICE_ROLE_KEY|(?:OPENAI|DEEPSEEK|QWEN|DASHSCOPE|LLM)_API_KEY)[^\S\r\n]*=[^\S\r\n]*(.*?)[^\S\r\n]*$/gm;
  const riskyTokenPatterns = [
    /sk-[A-Za-z0-9_-]{20,}/,
    /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/,
  ];
  const placeholderValues = new Set([
    "",
    "your-api-key",
    "your-supabase-service-role-key",
    "your-key",
    "replace-me",
    "changeme",
    "<your-api-key>",
  ]);

  const hits = [];

  for (const file of files) {
    if (file.endsWith("package-lock.json")) {
      continue;
    }

    const content = readFileSync(file, "utf8");
    const hasRiskyToken = riskyTokenPatterns.some((pattern) => pattern.test(content));
    const hasRiskyEnvValue = [...content.matchAll(envAssignmentPattern)].some((match) => {
      const value = match[2].replace(/^["']|["']$/g, "").trim();
      return !placeholderValues.has(value.toLowerCase());
    });

    if (hasRiskyToken || hasRiskyEnvValue) {
      hits.push(file);
    }
  }

  if (hits.length > 0) {
    fail(`secret-like content found in tracked files: ${hits.join(", ")}`);
  }
}

function checkSensitiveHistory() {
  const history = git([
    "log",
    "--all",
    "--format=%H",
    "--",
    ".env",
    ".env.local",
    ".env.production",
    ".vercel/.env.production.local",
  ]);

  if (history) {
    fail("sensitive env files appear in git history; rotate secrets before making the repo public.");
  }
}

try {
  const files = listTrackedFiles();
  requireGitIdentity();
  checkTrackedSecretFiles(files);
  checkSecretLikeContent(files);
  checkSensitiveHistory();

  if (!process.exitCode) {
    console.log("public-safety-check: ok");
  }
} catch (error) {
  fail(error instanceof Error ? error.message : "unexpected failure");
}
