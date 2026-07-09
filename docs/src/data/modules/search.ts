import type { Endpoint } from '../types';
import { j, authHeader, workspaceParam, workspaceId, entityId, blockId } from '../common';

export const searchEndpoints: Endpoint[] = [
  {
    id: 'search-query',
    module: 'Search',
    method: 'GET',
    path: '/search/',
    summary: 'Search workspace',
    description: 'Searches entities and blocks by keyword, PostgreSQL full text, hybrid, or semantic mode. Hybrid mode combines keyword matching with embedding similarity for the best results.',
    headers: authHeader,
    parameters: [
      workspaceParam,
      { name: 'q', type: 'String', required: true, description: 'Search query. Minimum 1 character.' },
      { name: 'mode', type: 'String', required: false, description: 'Search mode: keyword, full_text, hybrid (default), or semantic.' },
      { name: 'limit', type: 'Integer', required: false, description: 'Maximum results. Range 1–50. Defaults to 20.' },
    ],
    response: j({
      data: [
        { id: 'c7ad2e49-6322-4214-8cbd-8ec8a1dcdb8f', entity_id: entityId, block_id: null, title: 'Research Notes', content: 'Authentication strategy notes', match_type: 'page', score: 0.95 },
        { id: blockId, entity_id: entityId, block_id: blockId, title: 'Authentication Flow', content: 'The system uses JWT tokens...', match_type: 'block', score: 0.87 },
      ],
    }),
  },
];
