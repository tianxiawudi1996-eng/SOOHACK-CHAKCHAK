import { createHash } from 'node:crypto';

export const ALLOWED_DEPLOYMENT_ADAPTERS = new Set([
  'github_actions_environment',
  'docker_context_https',
  'cloudflare_workers',
]);

const FORBIDDEN_HOSTNAMES = new Set([
  'example.com',
  'example.org',
  'example.net',
  'localhost',
  '127.0.0.1',
]);

export function hostnameSha256(hostname) {
  return createHash('sha256').update(hostname.toLowerCase()).digest('hex');
}

export function inspectHttpsBaseUrl(rawValue) {
  if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
    return { valid: false, hostname_sha256: null };
  }

  try {
    const parsed = new URL(rawValue.trim());
    const hostname = parsed.hostname.toLowerCase();
    const forbidden = FORBIDDEN_HOSTNAMES.has(hostname)
      || [...FORBIDDEN_HOSTNAMES].some((item) => hostname.endsWith(`.${item}`))
      || hostname.includes('placeholder');
    const valid = parsed.protocol === 'https:'
      && !parsed.username
      && !parsed.password
      && hostname.includes('.')
      && !forbidden;
    return {
      valid,
      hostname_sha256: valid ? hostnameSha256(hostname) : null,
    };
  } catch {
    return { valid: false, hostname_sha256: null };
  }
}

export function verifyCloudflareRuntimeEvidence(evidence, expectedHostnameSha256) {
  if (!evidence || !expectedHostnameSha256) return false;

  let evidenceHostnameSha256 = null;
  try {
    const parsed = new URL(evidence.endpoint?.public_https_url);
    if (parsed.protocol !== 'https:') return false;
    evidenceHostnameSha256 = hostnameSha256(parsed.hostname);
  } catch {
    return false;
  }

  return evidence.schema_version === '1.0.0'
    && evidence.status === 'PASS_EXTERNAL_FRONTEND_PREVIEW'
    && evidenceHostnameSha256 === expectedHostnameSha256
    && evidence.http_checks?.root === 200
    && evidence.http_checks?.curriculum_e4_ko === 200
    && evidence.http_checks?.readyz === 200
    && evidence.http_checks?.api_not_connected === 503
    && evidence.runtime_truth?.frontend_publicly_reachable === true
    && evidence.runtime_truth?.api_connected === false
    && evidence.runtime_truth?.postgresql_connected === false
    && evidence.runtime_truth?.production_release === false;
}

export function runtimeContextConfigured(adapter, configured) {
  if (adapter === 'docker_context_https') return configured.external_docker_context === true;
  if (adapter === 'cloudflare_workers') return configured.cloudflare_runtime_evidence === true;
  return configured.deployment_adapter === true;
}

export function runtimeContextBlocker(adapter) {
  if (adapter === 'docker_context_https') return 'EXTERNAL_DOCKER_CONTEXT';
  if (adapter === 'cloudflare_workers') return 'CLOUDFLARE_RUNTIME_EVIDENCE';
  return 'EXTERNAL_DEPLOYMENT_RUNTIME_CONTEXT';
}
