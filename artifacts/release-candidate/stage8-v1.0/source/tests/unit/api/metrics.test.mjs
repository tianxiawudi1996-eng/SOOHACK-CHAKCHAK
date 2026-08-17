import test from 'node:test';
import assert from 'node:assert/strict';
import {OperationsMetrics} from '../../../developer/src/api/metrics.mjs';

test('operations metrics expose request, error, duration, and uptime signals', () => {
  const metrics = new OperationsMetrics();
  metrics.record({status:200,durationMs:80});
  metrics.record({status:503,durationMs:600});
  const output = metrics.render();
  assert.match(output, /mathchakchak_http_requests_total 2/);
  assert.match(output, /mathchakchak_http_server_errors_total 1/);
  assert.match(output, /le="500"} 1/);
  assert.match(output, /mathchakchak_process_uptime_seconds/);
});
