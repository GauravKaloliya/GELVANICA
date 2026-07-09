import type { Endpoint } from '../types';
import { itemEnvelope } from '../common';

export const systemEndpoints: Endpoint[] = [
  {
    id: 'health-check',
    module: 'System',
    method: 'GET',
    path: '/health',
    summary: 'Check API health',
    description: 'Public liveness endpoint for load balancers, uptime checks, and deployment smoke tests. Requires no authentication.',
    response: itemEnvelope({ status: 'healthy' }),
  },
];
