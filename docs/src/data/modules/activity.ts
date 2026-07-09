import type { Endpoint } from '../types';
import { listEnvelope, j, authHeader, paginationParams, workspaceParam, workspaceId, entityId, entityTypeId, userId } from '../common';

export const activityEndpoints: Endpoint[] = [
  {
    id: 'activity-list',
    module: 'Activity',
    method: 'GET',
    path: '/activity/',
    summary: 'List activity',
    description: 'Returns recent activity log records for a workspace. Each entry shows who did what, when, and on which entity.',
    headers: authHeader,
    parameters: [workspaceParam, ...paginationParams],
    response: listEnvelope([
      { id: 'c7ad2e49-6322-4214-8cbd-8ec8a1dcdb8f', workspace_id: workspaceId, user_id: userId, entity_id: entityId, block_id: null, action: 'entity.create', details: { title: 'Research Notes', entity_type_id: entityTypeId }, created_at: '2026-06-21T08:30:00Z' },
    ]),
  },
];
