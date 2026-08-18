import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const workflowPath = new URL('../../../.github/workflows/productization-ci.yml', import.meta.url);
const statusPath = new URL('../../../docs/productization/STATUS.json', import.meta.url);

test('productization CI verifies source, Cloudflare package, and Docker API/PostgreSQL runtime', () => {
  assert.equal(fs.existsSync(workflowPath), true, 'productization CI workflow is missing');
  const workflow = fs.readFileSync(workflowPath, 'utf8');

  for (const required of [
    'name: Productization CI',
    'permissions:',
    'contents: read',
    'persist-credentials: false',
    'node-version: "24"',
    'npm ci',
    'npm run lint',
    'npm run typecheck',
    'npm run test:unit',
    'npm run cloudflare:dry-run',
    'docker compose -f infra/deployment/compose.api-staging.yaml config --quiet',
    'npm run test:integration:api',
    'npm run test:operations:runtime',
    'if: always()',
    'docker compose -f infra/deployment/compose.api-staging.yaml down -v --remove-orphans'
  ]) {
    assert.match(workflow, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), required);
  }

  assert.doesNotMatch(workflow, /pull_request_target:/);
  assert.doesNotMatch(workflow, /\$\{\{\s*secrets\./);
  assert.doesNotMatch(workflow, /CLOUDFLARE_API_TOKEN|OPENAI_API_KEY\s*:/);

  const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
  assert.equal(status.phases['9'].ci.workflow, '.github/workflows/productization-ci.yml');
  assert.equal(status.phases['9'].ci.local_contract, 'PASS');
  assert.equal(status.phases['9'].ci.github_run, 'NOT_RUN');
  assert.equal(status.phases['9'].ci.deployment_performed, false);
});
