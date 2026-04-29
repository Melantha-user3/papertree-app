import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

const packageJson = readJson("package.json");
const lockfile = readJson("package-lock.json");
const findings = [];

const recordBlankStrings = (value, path) => {
  if (value === "") {
    findings.push(path);
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    recordBlankStrings(nestedValue, `${path}.${key}`);
  }
};

recordBlankStrings(packageJson, "package.json");
recordBlankStrings(lockfile, "package-lock.json");

console.log("install diagnostics:");
console.log(`node=${process.version}`);
console.log(`npm=${execFileSync("npm", ["--version"], { encoding: "utf8" }).trim()}`);
console.log(`npm_user_agent=${process.env.npm_config_user_agent ?? "unset"}`);
console.log(`packageManager=${packageJson.packageManager ?? "unset"}`);
console.log(`engines=${JSON.stringify(packageJson.engines ?? {})}`);
console.log(`lockfileVersion=${lockfile.lockfileVersion}`);
console.log(`blankStringFields=${findings.length ? findings.join(",") : "none"}`);

if (findings.length > 0) {
  process.exitCode = 1;
}
