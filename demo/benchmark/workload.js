import http from 'k6/http';
import { check } from 'k6';
import { scenario } from 'k6/execution';
import encoding from 'k6/encoding';
import { Rate } from 'k6/metrics';

const base = __ENV.BASE || 'http://aapno-load-app:3000';
if (!/^http:\/\/(aapno-load-app:3000|127\.0\.0\.1:\d+)$/.test(base)) {
  throw new Error('Run this workload against the isolated local benchmark only.');
}

const population = Number(__ENV.POPULATION || 50000);
if (![3000, 10000, 50000, 100000].includes(population)) throw new Error('Invalid population scenario');
const requestsPerThreeSeconds = population / 200;
const samplePhoto = encoding.b64encode(open('./fixture.jpg', 'b'));
const failures = new Rate('failed_checks');
const status2xx = http.expectedStatuses(200, 201);
export const options = {
  scenarios: {
    burst: {
      executor: 'constant-arrival-rate',
      rate: requestsPerThreeSeconds,
      timeUnit: '3s',
      duration: __ENV.DURATION || '20s',
      preAllocatedVUs: 50,
      maxVUs: 150,
      gracefulStop: '5s',
    },
  },
  discardResponseBodies: true,
  summaryTrendStats: ['avg', 'med', 'p(95)', 'p(99)', 'max'],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
    failed_checks: ['rate<0.01'],
    dropped_iterations: ['count==0'],
    'http_req_duration{operation:overview}': ['p(95)<500'],
    'http_req_duration{operation:register}': ['p(95)<500'],
    'http_req_duration{operation:submit}': ['p(95)<1000'],
    'http_req_duration{operation:photo}': ['p(95)<1000'],
  },
};

function idempotency(n) {
  return 'f8799300-fbad-462d-b87b-' + n.toString(16).padStart(12, '0');
}
function submission(n, photo) {
  const payload = {
    wardId: n % 4 + 1,
    category: n % 2 ? 'water' : 'roads',
    landmark: 'Synthetic benchmark landmark ' + n,
    description: 'A synthetic report to measure local staging performance.',
  };
  if (photo) payload.photo = samplePhoto;
  return http.post(base + '/api/reports', JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotency(n),
      'X-Vercel-Forwarded-For': '198.18.' + Math.floor(n / 250) % 250 + '.' + n % 250,
    },
    tags: { operation: photo ? 'photo' : 'submit' },
    responseType: 'text',
    responseCallback: status2xx,
    timeout: '5s',
  });
}

export default function () {
  const n = scenario.iterationInTest;
  const slot = n % 100;
  let passed;
  if (slot % 25 === 0) {
    const response = submission(n, slot === 0);
    passed = check(response, {'new report has a ticket': r =>
      r.status === 201 && /"ticketCode":"MS-/.test(r.body || '')});
  } else if (slot % 3 === 0) {
    const days = [7, 30, 90][Math.floor(n / 3) % 3];
    const response = http.get(base + '/overview?days=' + days, {
      tags: { operation: 'overview' }, responseType: 'text', timeout: '5s',
    });
    passed = check(response, {'overview contains real totals': r =>
      r.status === 200 && /Reports received in the last/.test(r.body || '')});
  } else {
    const response = http.get(base + '/register', { tags: { operation: 'register' }, timeout: '5s' });
    passed = check(response, {'register returns 200': r => r.status === 200});
  }
  failures.add(!passed);
}

export function handleSummary(data) {
  const metrics = data.metrics;
  const v = name => metrics[name]?.values || {};
  const result = {
    population,
    requestedRps: requestsPerThreeSeconds / 3,
    requests: v('http_reqs').count,
    achievedRps: v('http_reqs').rate,
    completionDurationSeconds: data.state.testRunDurationMs / 1000,
    httpErrorPct: 100 * v('http_req_failed').rate,
    checkFailurePct: 100 * v('failed_checks').rate,
    dropped: v('dropped_iterations').count || 0,
    p95Ms: v('http_req_duration')['p(95)'],
    endpointsP95Ms: Object.fromEntries(['overview', 'register', 'submit', 'photo']
      .map(op => [op, v('http_req_duration{operation:' + op + '}')['p(95)']])),
  };
  return { stdout: JSON.stringify(result) + '\n', '/results/k6.json': JSON.stringify(result, null, 2) + '\n' };
}
