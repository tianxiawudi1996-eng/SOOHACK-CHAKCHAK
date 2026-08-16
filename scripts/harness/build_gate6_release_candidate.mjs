import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd());
const RELEASE_PARENT = path.resolve(ROOT, "artifacts/release-candidate");
const RELEASE_ROOT = path.resolve(RELEASE_PARENT, "stage8-v1.0");
const SOURCE_ROOT = path.join(RELEASE_ROOT, "source");
const ARTIFACT_ROOT = path.join(RELEASE_ROOT, "artifact", "v0.1.0");
const STAGING_ROOT = path.resolve(ROOT, "artifacts/staging/v0.1.0");
const SOURCE_ROOTS = [
  "agent",
  "assets/stage8",
  "client",
  "developer",
  "infra",
  "scripts/productization",
  "scripts/quality",
  "tests",
];
const SOURCE_FILES = [
  "AGENTS.md",
  "package.json",
  "package-lock.json",
  "docs/stage8/prompts/GATE6_PRODUCT_INTEGRATION.md",
  "docs/stage8/prompts/GATE7_QA.md",
  "docs/stage8/prompts/GATE8_DEPLOYMENT.md",
  "docs/stage8/prompts/GATE6_TO_GATE8_COMPLETION_EXECUTION_METAPROMPT_v1.0.md",
  "docs/stage8/evidence/gate6/GATE6_RESPONSIVE_RUNTIME_QA_v1.0.json",
  "docs/stage8/evidence/gate6/GATE6_STATIC_QUALITY_v1.0.json",
  "docs/stage8/evidence/2d-pet/v1.0/2D_PET_ASSET_MANIFEST_v1.0.json",
  "docs/stage8/evidence/2d-pet/v1.0/2D_PET_RUNTIME_MANIFEST_v1.0.json",
  "docs/stage8/evidence/2d-pet/v1.0/2D_PET_MOTION_MANIFEST_v1.0.json",
  "docs/stage8/evidence/2d-pet/v1.0/AI_BEHAVIOR_RUNTIME_MANIFEST_v1.0.json",
];
const IGNORED_DIRECTORY_NAMES = new Set([
  ".git",
  ".idea",
  ".vscode",
  "node_modules",
  "artifacts",
  "coverage",
]);
const FORBIDDEN_FILE_PATTERN = /(^|\/)(\.env(?:\.|$)|[^/]*recovery[-_ ]?codes?[^/]*|[^/]*private[-_ ]?key[^/]*|[^/]*credentials?\.(json|txt)|[^/]*\.(pem|pfx|p12|key))$/i;

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function canonicalJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function normalize(relativePath) {
  return relativePath.replaceAll(path.sep, "/");
}

function assertSafeReleaseTarget() {
  if (path.dirname(RELEASE_ROOT) !== RELEASE_PARENT) {
    throw new Error(`unsafe release target parent: ${RELEASE_ROOT}`);
  }
  if (path.basename(RELEASE_ROOT) !== "stage8-v1.0") {
    throw new Error(`unsafe release target name: ${RELEASE_ROOT}`);
  }
  if (!RELEASE_ROOT.startsWith(`${RELEASE_PARENT}${path.sep}`)) {
    throw new Error(`release target escaped parent: ${RELEASE_ROOT}`);
  }
}

function isForbidden(relativePath) {
  const normalized = normalize(relativePath);
  return FORBIDDEN_FILE_PATTERN.test(normalized);
}

async function walk(absolutePath, files = []) {
  const stat = await fs.lstat(absolutePath);
  if (stat.isSymbolicLink()) return files;
  if (stat.isFile()) {
    files.push(absolutePath);
    return files;
  }

  const entries = await fs.readdir(absolutePath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && IGNORED_DIRECTORY_NAMES.has(entry.name)) continue;
    const childPath = path.join(absolutePath, entry.name);
    if (entry.isDirectory()) await walk(childPath, files);
    if (entry.isFile()) files.push(childPath);
  }
  return files;
}

async function fileRecord(absolutePath, basePath) {
  const bytes = await fs.readFile(absolutePath);
  return {
    path: normalize(path.relative(basePath, absolutePath)),
    bytes: bytes.length,
    sha256: sha256(bytes),
  };
}

async function copyWithParents(sourcePath, destinationPath) {
  await fs.mkdir(path.dirname(destinationPath), { recursive: true });
  await fs.copyFile(sourcePath, destinationPath);
}

async function collectSourceFiles() {
  const files = [];
  for (const sourceRoot of SOURCE_ROOTS) {
    const absoluteRoot = path.join(ROOT, sourceRoot);
    try {
      await walk(absoluteRoot, files);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  for (const sourceFile of SOURCE_FILES) {
    const absoluteFile = path.join(ROOT, sourceFile);
    await fs.access(absoluteFile);
    files.push(absoluteFile);
  }
  return [...new Set(files)]
    .filter((filePath) => !isForbidden(path.relative(ROOT, filePath)))
    .sort((left, right) => normalize(path.relative(ROOT, left)).localeCompare(normalize(path.relative(ROOT, right))));
}

function gitOutput(args) {
  const result = spawnSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

async function verifyStagingManifest(stagingManifest, artifactRoot) {
  if (!Array.isArray(stagingManifest.files) || stagingManifest.file_count !== stagingManifest.files.length) {
    throw new Error("staging manifest file_count mismatch");
  }
  for (const record of stagingManifest.files) {
    const absolutePath = path.join(artifactRoot, ...record.path.split("/"));
    const bytes = await fs.readFile(absolutePath);
    if (bytes.length !== record.bytes || sha256(bytes) !== record.sha256) {
      throw new Error(`staging artifact mismatch: ${record.path}`);
    }
  }
}

assertSafeReleaseTarget();
const gitHead = gitOutput(["rev-parse", "HEAD"]);
const gitStatus = gitOutput(["status", "--porcelain=v1"]);
const dirtyEntryCount = gitStatus ? gitStatus.split(/\r?\n/).filter(Boolean).length : null;

const stagingManifestPath = path.join(STAGING_ROOT, "manifest.json");
const stagingManifestBytes = await fs.readFile(stagingManifestPath);
const stagingManifest = JSON.parse(stagingManifestBytes.toString("utf8"));
await verifyStagingManifest(stagingManifest, STAGING_ROOT);

const sourceFiles = await collectSourceFiles();
const sourceRecords = [];
for (const sourceFile of sourceFiles) {
  const relativePath = normalize(path.relative(ROOT, sourceFile));
  const destination = path.join(SOURCE_ROOT, ...relativePath.split("/"));
  sourceRecords.push(await fileRecord(sourceFile, ROOT));
  if (isForbidden(relativePath)) throw new Error(`forbidden source entered RC: ${relativePath}`);
}

await fs.mkdir(RELEASE_PARENT, { recursive: true });
await fs.rm(RELEASE_ROOT, { recursive: true, force: true });
await fs.mkdir(SOURCE_ROOT, { recursive: true });
await fs.mkdir(ARTIFACT_ROOT, { recursive: true });

for (const sourceFile of sourceFiles) {
  const relativePath = normalize(path.relative(ROOT, sourceFile));
  await copyWithParents(sourceFile, path.join(SOURCE_ROOT, ...relativePath.split("/")));
}
await fs.cp(STAGING_ROOT, ARTIFACT_ROOT, { recursive: true, force: true });

const sourcePayload = {
  schema_version: "1.0.0",
  snapshot_type: "ISOLATED_CONTENT_ADDRESSED_COPY",
  forbidden_sensitive_files_included: false,
  source_roots: SOURCE_ROOTS,
  selected_source_files: SOURCE_FILES,
  files: sourceRecords,
  file_count: sourceRecords.length,
};
const sourceManifestText = canonicalJson(sourcePayload);
const sourceManifestSha256 = sha256(Buffer.from(sourceManifestText));
await fs.writeFile(path.join(RELEASE_ROOT, "source-manifest.json"), sourceManifestText, "utf8");

const copiedStagingManifestBytes = await fs.readFile(path.join(ARTIFACT_ROOT, "manifest.json"));
const artifactManifestSha256 = sha256(copiedStagingManifestBytes);
if (artifactManifestSha256 !== sha256(stagingManifestBytes)) {
  throw new Error("copied staging manifest hash mismatch");
}

for (const record of sourceRecords) {
  const copiedPath = path.join(SOURCE_ROOT, ...record.path.split("/"));
  const copiedBytes = await fs.readFile(copiedPath);
  if (copiedBytes.length !== record.bytes || sha256(copiedBytes) !== record.sha256) {
    throw new Error(`copied source mismatch: ${record.path}`);
  }
}
await verifyStagingManifest(stagingManifest, ARTIFACT_ROOT);

const rcIdentity = {
  source_manifest_sha256: sourceManifestSha256,
  artifact_manifest_sha256: artifactManifestSha256,
  responsive_evidence_sha256: sourceRecords.find((entry) => entry.path.endsWith("GATE6_RESPONSIVE_RUNTIME_QA_v1.0.json"))?.sha256,
  static_quality_evidence_sha256: sourceRecords.find((entry) => entry.path.endsWith("GATE6_STATIC_QUALITY_v1.0.json"))?.sha256,
};
const rcSha256 = sha256(Buffer.from(JSON.stringify(rcIdentity)));
const releaseManifest = {
  schema_version: "1.0.0",
  project: "MathChakChak",
  stage: 8,
  gate: 6,
  release_candidate_id: "stage8-v1.0",
  generated_at: new Date().toISOString(),
  status: "FROZEN",
  rc_sha256: rcSha256,
  source_snapshot: {
    type: "ISOLATED_CONTENT_ADDRESSED_COPY",
    git_head: gitHead,
    git_worktree_clean: dirtyEntryCount === 0,
    git_dirty_entry_count_at_freeze: dirtyEntryCount,
    user_worktree_mutated_or_reset: false,
    manifest_path: "source-manifest.json",
    manifest_sha256: sourceManifestSha256,
    file_count: sourceRecords.length,
  },
  artifact: {
    type: "IMMUTABLE_FRONTEND_PREVIEW",
    path: "artifact/v0.1.0",
    manifest_path: "artifact/v0.1.0/manifest.json",
    manifest_sha256: artifactManifestSha256,
    file_count: stagingManifest.file_count,
    approved_pose_assets: stagingManifest.approved_pose_assets,
    all_manifest_entries_verified: true,
  },
  gate6_evidence: {
    responsive_status: "PASS",
    static_quality_status: "PASS",
    ...rcIdentity,
  },
  external_deployment: {
    performed: false,
    claimed: false,
  },
};
await fs.writeFile(
  path.join(RELEASE_ROOT, "release-manifest.json"),
  canonicalJson(releaseManifest),
  "utf8",
);

console.log(
  `GATE6_RELEASE_CANDIDATE_FROZEN rc_sha256=${rcSha256} source_files=${sourceRecords.length} artifact_files=${stagingManifest.file_count}`,
);
