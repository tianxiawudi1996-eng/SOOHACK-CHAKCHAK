import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const EVIDENCE_PATH = path.join(
  ROOT,
  "docs/stage8/evidence/gate6/GATE6_STATIC_QUALITY_v1.0.json",
);
const PATHS = {
  package: "package.json",
  staging: "artifacts/staging/v0.1.0/manifest.json",
  responsive: "docs/stage8/evidence/gate6/GATE6_RESPONSIVE_RUNTIME_QA_v1.0.json",
  motion: "docs/stage8/evidence/2d-pet/v1.0/2D_PET_MOTION_MANIFEST_v1.0.json",
  behavior: "docs/stage8/evidence/2d-pet/v1.0/AI_BEHAVIOR_RUNTIME_MANIFEST_v1.0.json",
};
const REQUIRED_LOCALES = ["ko", "zh-CN", "ja", "en", "es", "fr", "it", "ru"];
const REQUIRED_WIDTHS = [360, 768, 1024, 1200];
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(ROOT, relativePath), "utf8"));
}

async function readEvidence() {
  try {
    return await readJson(path.relative(ROOT, EVIDENCE_PATH));
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
  evidence.checks.runtime_type_contract = result;
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
let assertionCount = 0;
function assert(condition, contract, detail) {
  assertionCount += 1;
  if (!condition) failures.push({ contract, detail });
}
function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function sameMembers(actual, expected) {
  return (
    Array.isArray(actual) &&
    actual.length === expected.length &&
    [...actual].sort().every((value, index) => value === [...expected].sort()[index])
  );
}

const packageJson = await readJson(PATHS.package);
const staging = await readJson(PATHS.staging);
const responsive = await readJson(PATHS.responsive);
const motion = await readJson(PATHS.motion);
const behavior = await readJson(PATHS.behavior);

assert(packageJson.type === "module", "PACKAGE_MODULE_TYPE", "package.type must be module");
assert(isObject(packageJson.scripts), "PACKAGE_SCRIPTS", "package.scripts must be an object");
for (const scriptName of ["lint", "typecheck", "build:staging", "test:unit"]) {
  assert(
    typeof packageJson.scripts?.[scriptName] === "string" && packageJson.scripts[scriptName].length > 0,
    "PACKAGE_REQUIRED_SCRIPT",
    `missing script ${scriptName}`,
  );
}

assert(staging.project === "MathChakChak", "STAGING_PROJECT", "unexpected project");
assert(staging.environment === "staging", "STAGING_ENVIRONMENT", "environment must be staging");
assert(sameMembers(staging.supported_locales, REQUIRED_LOCALES), "STAGING_LOCALES", "required locale set mismatch");
assert(staging.approved_character_assets === 2, "STAGING_CHARACTER_COUNT", "expected 2 approved characters");
assert(staging.approved_pose_assets === 32, "STAGING_POSE_COUNT", "expected 32 approved pose files");
assert(Array.isArray(staging.files) && staging.files.length >= 32, "STAGING_FILES", "staging files must be a non-empty array");
const stagingPaths = new Set();
for (const [index, file] of (staging.files || []).entries()) {
  assert(isObject(file), "STAGING_FILE_OBJECT", `file ${index} must be an object`);
  assert(typeof file?.path === "string" && file.path.length > 0, "STAGING_FILE_PATH", `file ${index} path`);
  assert(Number.isInteger(file?.bytes) && file.bytes > 0, "STAGING_FILE_BYTES", `file ${index} bytes`);
  assert(SHA256_PATTERN.test(file?.sha256 || ""), "STAGING_FILE_SHA", `file ${index} sha256`);
  assert(!stagingPaths.has(file?.path), "STAGING_FILE_UNIQUE", `duplicate ${file?.path}`);
  stagingPaths.add(file?.path);
}
const posePathCount = [...stagingPaths].filter((entry) => entry.includes("/poses/")).length;
assert(posePathCount === 32, "STAGING_POSE_PATHS", `expected 32 pose paths, got ${posePathCount}`);

assert(responsive.status === "PASS", "RESPONSIVE_STATUS", "responsive QA must pass");
assert(Array.isArray(responsive.viewports), "RESPONSIVE_VIEWPORTS", "viewports must be an array");
assert(
  sameMembers(responsive.viewports?.map((viewport) => viewport.width), REQUIRED_WIDTHS),
  "RESPONSIVE_WIDTHS",
  "required width set mismatch",
);
for (const viewport of responsive.viewports || []) {
  assert(viewport.status === "PASS", "RESPONSIVE_VIEWPORT_STATUS", `${viewport.width} must pass`);
  assert(viewport.response_status === 200, "RESPONSIVE_HTTP_STATUS", `${viewport.width} must return 200`);
  assert(isObject(viewport.observed), "RESPONSIVE_OBSERVED", `${viewport.width} observed must be object`);
  assert(viewport.observed?.horizontalOverflow === false, "RESPONSIVE_OVERFLOW", `${viewport.width} overflow`);
  assert(viewport.observed?.petBoxesInsideViewport === true, "RESPONSIVE_PETS", `${viewport.width} pet clipping`);
  assert(viewport.observed?.motionStateCount === 8, "RESPONSIVE_MOTION_STATES", `${viewport.width} motion states`);
  assert(viewport.observed?.behaviorEventCount === 15, "RESPONSIVE_BEHAVIOR_EVENTS", `${viewport.width} behavior events`);
  assert(viewport.observed?.behaviorBubbleCount === 13, "RESPONSIVE_BUBBLES", `${viewport.width} bubbles`);
  for (const field of ["console_errors", "page_errors", "failed_requests", "error_responses"]) {
    assert(Array.isArray(viewport[field]) && viewport[field].length === 0, "RESPONSIVE_ERROR_ARRAY", `${viewport.width} ${field}`);
  }
}

assert(motion.status === "APPROVED", "MOTION_STATUS", "motion manifest must be approved");
assert(motion.state_count === 8, "MOTION_STATE_COUNT", "motion state count must be 8");
assert(Array.isArray(motion.states) && motion.states.length === 8, "MOTION_STATES", "motion states must contain 8 entries");
assert(motion.natural_choreography?.total_transition_ms === 680, "MOTION_DURATION", "transition must be 680ms");
assert(motion.natural_choreography?.character_rhythm_offset_ms === 90, "MOTION_RHYTHM", "rhythm offset must be 90ms");
assert(sameMembers(motion.allowed_motion_properties, ["transform", "opacity"]), "MOTION_PROPERTIES", "only transform and opacity are allowed");
assert(motion.controls?.reduced_motion_required === true, "MOTION_REDUCED", "reduced motion must be required");

assert(behavior.status === "APPROVED", "BEHAVIOR_STATUS", "behavior manifest must be approved");
assert(Array.isArray(behavior.canonical_states) && behavior.canonical_states.length === 15, "BEHAVIOR_STATES", "expected 15 states");
assert(Array.isArray(behavior.events) && behavior.events.length === 15, "BEHAVIOR_EVENTS", "expected 15 events");
assert(Array.isArray(behavior.bubble_ids) && behavior.bubble_ids.length === 13, "BEHAVIOR_BUBBLES", "expected 13 bubbles");
assert(behavior.runtime_controls?.answer_reveal_prohibited === true, "BEHAVIOR_ANSWER_REVEAL", "direct answer reveal must be prohibited");
assert(behavior.runtime_controls?.log_context_values === false, "BEHAVIOR_LOG_CONTEXT", "context values must not be logged");

const inputHashes = {};
for (const [name, relativePath] of Object.entries(PATHS)) {
  const bytes = await fs.readFile(path.join(ROOT, relativePath));
  inputHashes[name] = {
    path: relativePath,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

const result = {
  status: failures.length === 0 ? "PASS" : "FAIL",
  checker: "JAVASCRIPT_RUNTIME_DATA_CONTRACT_TYPECHECK",
  claim_boundary: "This validates JavaScript runtime and data contracts; it does not claim a TypeScript compiler run.",
  checked_at: new Date().toISOString(),
  assertion_count: assertionCount,
  input_hashes: inputHashes,
  failures,
};
await writeEvidence(result);

if (failures.length > 0) {
  console.error(`GATE6_RUNTIME_TYPE_CONTRACT_FAIL failures=${failures.length}`);
  for (const failure of failures.slice(0, 30)) {
    console.error(`${failure.contract}: ${failure.detail}`);
  }
  process.exit(1);
}

console.log(`GATE6_RUNTIME_TYPE_CONTRACT_PASS assertions=${assertionCount}`);
