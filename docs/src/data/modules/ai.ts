import type { Endpoint } from '../types';
import { itemEnvelope, j, authHeader, workspaceId } from '../common';

export const aiEndpoints: Endpoint[] = [
  {
    id: 'ai-query',
    module: 'AI',
    method: 'POST',
    path: '/ai/query',
    summary: 'Ask workspace AI',
    description: 'Submits a natural language question about your workspace. The API retrieves relevant context via semantic search, assembles it as context, and asks the configured Inference Runtime (local GPU-native or cloud) to answer based on your knowledge. Returns both the answer and source documents.',
    headers: authHeader,
    requestBody: j({
      workspace_id: workspaceId,
      question: 'Summarize authentication mechanisms',
      limit: 5,
    }),
    response: itemEnvelope({
      answer: 'Gnovium uses JWT access and refresh tokens with server-side session revocation. Access tokens expire after 30 minutes, refresh tokens after 14 days.',
      sources: [
        { title: 'Architecture Overview', content: 'Authentication is set up with JWT...' },
        { title: 'Project Alpha README', content: 'The system uses a microservices architecture...' },
      ],
    }),
  },
];
