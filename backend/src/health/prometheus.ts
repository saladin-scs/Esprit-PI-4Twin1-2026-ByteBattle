import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

export const prometheusRegistry = new Registry();

collectDefaultMetrics({
  prefix: 'bytebattle_',
  register: prometheusRegistry,
});

const commonLabels = ['method', 'route', 'status_code'] as const;

export const httpRequestsTotal = new Counter({
  name: 'bytebattle_http_requests_total',
  help: 'Total number of HTTP requests served by the backend API.',
  labelNames: commonLabels,
  registers: [prometheusRegistry],
});

export const httpRequestDurationSeconds = new Histogram({
  name: 'bytebattle_http_request_duration_seconds',
  help: 'Backend HTTP request duration in seconds.',
  labelNames: commonLabels,
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [prometheusRegistry],
});
