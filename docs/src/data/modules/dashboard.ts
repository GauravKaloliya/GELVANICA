import type { Endpoint } from '../types';
import { j, authHeader, workspaceParam, workspaceId } from '../common';

export const dashboardEndpoints: Endpoint[] = [
  {
    id: 'dashboard-overview',
    module: 'Dashboard',
    method: 'GET',
    path: '/dashboard/overview',
    summary: 'Workspace dashboard overview',
    description: 'Returns a curated snapshot of workspace activity and health — entity count, block count, relation count, comments, members, archived items, and recently updated entities. Ideal for building workspace home screens.',
    headers: authHeader,
    parameters: [workspaceParam],
    response: j({
      data: {
        workspace_id: workspaceId,
        entity_count: 42,
        block_count: 215,
        relation_count: 18,
        comment_count: 7,
        member_count: 3,
        archived_count: 5,
        recent_entities: [
          { id: 'fa82a0b1-12c8-47fb-ba2e-ff6a39226cb3', title: 'Research Notes', updated_at: '2026-06-21T08:30:00Z' },
          { id: '9cd19086-ea22-4fa3-b452-f2f132a3d2b7', title: 'Auth Design', updated_at: '2026-06-20T14:00:00Z' },
        ],
      },
    }),
  },
];
