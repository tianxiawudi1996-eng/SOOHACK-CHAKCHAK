import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const EVIDENCE_PATH = path.join(
  ROOT,
  "docs/stage8/evidence/gate6/GATE6_STATIC_QUALITY_v1.0.json",
);
const SOURCE_ROOTS = [
  "agent",
  "assets/stage8",
  "client",
  "developer",
  "scripts/harness",
  "scripts/productization",
  "scripts/quality",
  "tests",
];
const SCRIPT_EXTENSIONS = new Set([".js", ".mjs", ".cjs"]);
const JSON_EXTENSIONS = new Set([".json"]);
const TEXT_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".sql",
  ".yaml",
  ".yml",
]);
const IGNORED_DIRECTORY_NAMES = new Set([
  ".git",
  "node_modules",
  "artifacts",
  "coverage",
]);

function relative(filePath) {
  return path.relative(ROOT, filePath).replaceAll(path.sep, "/");
}

async function walk(targetPath, files = []) {
  const stat = await fs.stat(targetPath);
  if (stat.isFile()) {
    files.push(targetPath);
    return files;
  }

  const entries = await fs.readdir(targetPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && IGNORED_DIRECTORY_NAMES.has(entry.name)) continue;
    const childPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) await walk(childPath, files);
    if (entry.isFile()) files.push(childPath);
  }
  return files;
}

async function readEvidence() {
  try {
    return JSON.parse(await fs.readFile(EVIDENCE_PATH, "utf8"));
  } catch {
    return {
      schema_version: "1.0.0",
      project: "MathChakChak",
      stage: 8,
      gate: 6,
      scope: "LOCAL_SOURCE_STATIC_QUALITY",
      checks: {},
    };
  }
}

async function writeEvidence(result) {
  const evidence = await readEvidence();
  evidence.generated_at = new Date().toISOString();
  evidence.checks.lint = result;
  const statuses = [evidence.checks.lint?.status, evidence.checks.runtime_type_contract?.status];
  evidence.status = statuses.includes("FAIL")
    ? "FAIL"
    : statuses.every((status) => status === "PASS")
      ? "PASS"
      : "PARTIAL";
  await fs.mkdir(path.dirname(EVIDENCE_PATH), { recursive: true });
  await fs.writeFile(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
}

const failures = [];
const files = [];
for (const sourceRoot of SOURCE_ROOTS) {
  const absoluteRoot = path.join(ROOT, sourceRoot);
  try {
    await walk(absoluteRoot, files);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

const scopedFiles = [...new Set(files)]
  .filter((filePath) => TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase()))
  .sort((left, right) => relative(left).localeCompare(relative(right)));
const scriptFiles = scopedFiles.filter((filePath) =>
  SCRIPT_EXTENSIONS.has(path.extname(filePath).toLowerCase()),
);
const jsonFiles = scopedFiles.filter((filePath) =>
  JSON_EXTENSIONS.has(path.extname(filePath).toLowerCase()),
);

for (const filePath of scriptFiles) {
  const syntax = spawnSync(process.execPath, ["--check", filePath], {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
  });
  if (syntax.status !== 0) {
    failures.push({
      check: "NODE_SYNTAX",
      path: relative(filePath),
      detail: (syntax.stderr || syntax.stdout || "syntax check failed").trim(),
    });
  }
}

for (const filePath of jsonFiles) {
  try {
    JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    failures.push({
      check: "JSON_PARSE",
      path: relative(filePath),
      detail: error.message,
    });
  }
}

for (const filePath of scopedFiles) {
  const content = await fs.readFile(filePath, "utf8");
  if (/^(<{7}|={7}|>{7})(?: .*)?$/m.test(content)) {
    failures.push({
      check: "MERGE_MARKER",
      path: relative(filePath),
      detail: "unresolved merge marker",
    });
  }
  if (content.includes("\u0000")) {
    failures.push({
      check: "NUL_BYTE",
      path: relative(filePath),
      detail: "unexpected NUL byte in source text",
    });
  }
}

const landingPath = path.join(ROOT, "client/mock/index.html");
const landing = await fs.readFile(landingPath, "utf8");
for (const requiredMarker of [
  "/assets/stage8/2d-pet-motion-v1.0.css",
  "/assets/stage8/2d-pet-motion-v1.0.js",
  "/assets/stage8/ai-behavior-v1.0.css",
  "/assets/stage8/ai-behavior-v1.0.js",
  "data-ai-bubble",
]) {
  if (!landing.includes(requiredMarker)) {
    failures.push({
      check: "PRODUCT_INTEGRATION_MARKER",
      path: "client/mock/index.html",
      detail: `missing ${requiredMarker}`,
    });
  }
}

const result = {
  status: failures.length === 0 ? "PASS" : "FAIL",
  checker: "NODE_SYNTAX_JSON_PARSE_SOURCE_INTEGRITY",
  checked_at: new Date().toISOString(),
  source_roots: SOURCE_ROOTS,
  text_file_count: scopedFiles.length,
  script_file_count: scriptFiles.length,
  json_file_count: jsonFiles.length,
  integration_marker_count: 5,
  failures,
};
await writeEvidence(result);

if (failures.length > 0) {
  console.error(`GATE6_LINT_FAIL failures=${failures.length}`);
  for (const failure of failures.slice(0, 20)) {
    console.error(`${failure.check} ${failure.path}: ${failure.detail}`);
  }
  process.exit(1);
}

console.log(
  `GATE6_LINT_PASS text=${scopedFiles.length} scripts=${scriptFiles.length} json=${jsonFiles.length}`,
);
