import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const RC_ROOT = path.join(ROOT, "artifacts/release-candidate/stage8-v1.0");
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(RC_ROOT, relativePath), "utf8"));
}

const failures = [];
function check(condition, id, detail) {
  if (!condition) failures.push({ id, detail });
}

const release = await readJson("release-manifest.json");
const sourceManifestBytes = await fs.readFile(path.join(RC_ROOT, "source-manifest.json"));
const source = JSON.parse(sourceManifestBytes.toString("utf8"));
const artifactManifestBytes = await fs.readFile(path.join(RC_ROOT, "artifact/v0.1.0/manifest.json"));
const artifact = JSON.parse(artifactManifestBytes.toString("utf8"));

check(release.status === "FROZEN", "RC_STATUS", "release candidate must be frozen");
check(SHA256_PATTERN.test(release.rc_sha256 || ""), "RC_SHA", "invalid rc sha256");
check(
  release.source_snapshot?.manifest_sha256 === sha256(sourceManifestBytes),
  "SOURCE_MANIFEST_SHA",
  "source manifest hash mismatch",
);
check(
  release.artifact?.manifest_sha256 === sha256(artifactManifestBytes),
  "ARTIFACT_MANIFEST_SHA",
  "artifact manifest hash mismatch",
);
check(source.file_count === source.files?.length, "SOURCE_COUNT", "source count mismatch");
check(artifact.file_count === artifact.files?.length, "ARTIFACT_COUNT", "artifact count mismatch");
check(artifact.approved_pose_assets === 32, "POSE_COUNT", "approved pose count must be 32");
check(release.external_deployment?.performed === false, "EXTERNAL_BOUNDARY", "external deployment must remain false");

for (const record of source.files || []) {
  const absolutePath = path.join(RC_ROOT, "source", ...record.path.split("/"));
  const bytes = await fs.readFile(absolutePath);
  check(bytes.length === record.bytes, "SOURCE_BYTES", record.path);
  check(sha256(bytes) === record.sha256, "SOURCE_FILE_SHA", record.path);
}
for (const record of artifact.files || []) {
  const absolutePath = path.join(RC_ROOT, "artifact/v0.1.0", ...record.path.split("/"));
  const bytes = await fs.readFile(absolutePath);
  check(bytes.length === record.bytes, "ARTIFACT_BYTES", record.path);
  check(sha256(bytes) === record.sha256, "ARTIFACT_FILE_SHA", record.path);
}

const rcIdentity = {
  source_manifest_sha256: release.gate6_evidence?.source_manifest_sha256,
  artifact_manifest_sha256: release.gate6_evidence?.artifact_manifest_sha256,
  responsive_evidence_sha256: release.gate6_evidence?.responsive_evidence_sha256,
  static_quality_evidence_sha256: release.gate6_evidence?.static_quality_evidence_sha256,
};
check(
  release.rc_sha256 === sha256(Buffer.from(JSON.stringify(rcIdentity))),
  "RC_IDENTITY_SHA",
  "release candidate identity hash mismatch",
);

if (failures.length > 0) {
  console.error(`GATE6_RELEASE_CANDIDATE_AUDIT_FAIL failures=${failures.length}`);
  for (const failure of failures.slice(0, 30)) console.error(`${failure.id}: ${failure.detail}`);
  process.exit(1);
}

console.log(
  `GATE6_RELEASE_CANDIDATE_AUDIT_PASS rc_sha256=${release.rc_sha256} source_files=${source.file_count} artifact_files=${artifact.file_count}`,
);
