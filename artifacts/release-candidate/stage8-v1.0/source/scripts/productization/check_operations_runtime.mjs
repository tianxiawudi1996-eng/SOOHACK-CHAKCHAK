const baseUrl = process.env.API_BASE_URL || 'http://127.0.0.1:4181';
const samples = Number.parseInt(process.env.OPERATIONS_HEALTH_SAMPLES || '20', 10);
const durations = [];

for (let index = 0; index < samples; index += 1) {
  const started = performance.now();
  const response = await fetch(`${baseUrl}/readyz`);
  durations.push(performance.now() - started);
  if (!response.ok) throw new Error(`OPERATIONS_RUNTIME_FAIL: readiness HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.data?.database?.ready !== true) throw new Error('OPERATIONS_RUNTIME_FAIL: database not ready');
}

durations.sort((a,b) => a-b);
const p95 = durations[Math.ceil(durations.length * 0.95) - 1];
const metricsResponse = await fetch(`${baseUrl}/metrics`);
const metrics = await metricsResponse.text();
if (!metricsResponse.ok || !metrics.includes('mathchakchak_http_requests_total') || !metrics.includes('mathchakchak_http_request_duration_ms_bucket')) {
  throw new Error('OPERATIONS_RUNTIME_FAIL: metrics unavailable');
}
const errors = Number(metrics.match(/mathchakchak_http_server_errors_total (\d+)/)?.[1] ?? -1);
if (p95 > 500 || errors !== 0) throw new Error(`OPERATIONS_RUNTIME_FAIL: p95=${p95} errors=${errors}`);

console.log('OPERATIONS_RUNTIME_PASS');
console.log(`samples=${samples}`);
console.log(`readiness_success=${samples}/${samples}`);
console.log(`p95_ms=${p95.toFixed(2)}`);
console.log(`server_errors=${errors}`);
console.log('database_ready=PASS');
