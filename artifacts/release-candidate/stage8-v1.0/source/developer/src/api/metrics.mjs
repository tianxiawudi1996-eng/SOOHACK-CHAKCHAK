export class OperationsMetrics {
  constructor() {
    this.startedAt = Date.now();
    this.requests = 0;
    this.serverErrors = 0;
    this.durationMsTotal = 0;
    this.durationBuckets = new Map([[100,0],[250,0],[500,0],[1000,0],[2000,0],[Infinity,0]]);
  }

  record({status, durationMs}) {
    this.requests += 1;
    if (status >= 500) this.serverErrors += 1;
    this.durationMsTotal += durationMs;
    for (const boundary of this.durationBuckets.keys()) {
      if (durationMs <= boundary) this.durationBuckets.set(boundary, this.durationBuckets.get(boundary) + 1);
    }
  }

  render() {
    const lines = [
      '# HELP mathchakchak_http_requests_total Total HTTP requests.',
      '# TYPE mathchakchak_http_requests_total counter',
      `mathchakchak_http_requests_total ${this.requests}`,
      '# HELP mathchakchak_http_server_errors_total Total HTTP 5xx responses.',
      '# TYPE mathchakchak_http_server_errors_total counter',
      `mathchakchak_http_server_errors_total ${this.serverErrors}`,
      '# HELP mathchakchak_http_request_duration_ms Request duration in milliseconds.',
      '# TYPE mathchakchak_http_request_duration_ms histogram'
    ];
    for (const [boundary, count] of this.durationBuckets) {
      lines.push(`mathchakchak_http_request_duration_ms_bucket{le="${boundary === Infinity ? '+Inf' : boundary}"} ${count}`);
    }
    lines.push(`mathchakchak_http_request_duration_ms_sum ${Math.round(this.durationMsTotal * 100) / 100}`);
    lines.push(`mathchakchak_http_request_duration_ms_count ${this.requests}`);
    lines.push('# HELP mathchakchak_process_uptime_seconds API process uptime.');
    lines.push('# TYPE mathchakchak_process_uptime_seconds gauge');
    lines.push(`mathchakchak_process_uptime_seconds ${Math.floor((Date.now() - this.startedAt) / 1000)}`);
    return `${lines.join('\n')}\n`;
  }
}
