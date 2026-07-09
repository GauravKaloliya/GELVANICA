import type { Parameter } from './types';

export const j = (value: unknown) => JSON.stringify(value, null, 2);

export const workspaceId = '50e50f55-27a3-4927-90c7-0e6d5eb72579';
export const entityId = 'fa82a0b1-12c8-47fb-ba2e-ff6a39226cb3';
export const entityTypeId = '8cb385bc-223d-4c3e-8c38-dfa22026d36e';
export const blockId = '4ef014a4-569d-4cf9-98fe-d2784860b263';
export const tagId = 'c3d7e8f1-4a2b-4c5d-8e6f-7a8b9c0d1e2f';
export const branchId = '2a49ccf9-f02e-4b68-8de9-b1d6837130a1';
export const versionId = '70fdad5c-2e3b-49a2-9146-fbd84d61f27a';
export const commentId = '2d33f64d-090a-472c-b5a0-72407946f2ad';
export const relationId = '63ed9d0f-4a67-4cdf-8df5-ee166567f38a';
export const fileId = 'f5da7c75-283d-47b7-82bd-3f2dfb8d1b01';
export const syncOpId = '3e8c0b95-2308-4d66-8c7c-732c1c414d51';
export const notificationId = '20e86072-36bd-4b3f-a652-46bd67a4f566';
export const jobId = 'a0e953b9-0cdd-4c68-9b50-8578700ce361';
export const dashboardId = 'd7e8f9a0-1b2c-3d4e-5f6a-7b8c9d0e1f2a';
export const backupId = 'e1f2a3b4-5c6d-7e8f-9a0b-1c2d3e4f5a6b';
export const governanceReportId = '9cbef023-ffaa-45cc-ba1e-faef266bc39e';
export const snapshotId = '109518f4-4e1b-43b2-9640-f8da24e0e1d5';
export const changesetId = '0b7c95b2-8eb6-4ca4-aa04-420fd68cbb0c';
export const userId = 'd9b23b3f-1d86-4e5a-a5f1-3cf93f9ef294';

export const authHeader = { Authorization: 'Bearer $ACCESS_TOKEN' };
export const refreshHeader = { Authorization: 'Bearer $REFRESH_TOKEN' };

export const paginationParams: Parameter[] = [
  { name: 'page', type: 'Integer', required: false, description: 'Page number. Defaults to 1.' },
  { name: 'per_page', type: 'Integer', required: false, description: 'Page size from 1 to 100. Defaults to 25.' },
];

export const pathParam = (name: string, description: string): Parameter => ({
  name,
  type: 'UUID',
  required: true,
  description,
});

export const workspaceParam: Parameter = {
  name: 'workspace_id',
  type: 'UUID',
  required: true,
  description: 'Workspace scope for the operation.',
};

export const itemEnvelope = (resource: Record<string, unknown>) => j({ data: resource });

export const listEnvelope = (items: Record<string, unknown>[]) =>
  j({
    data: items,
    meta: { page: 1, per_page: 25, total: items.length, pages: 1 },
  });

export const now = '2026-06-21T12:00:00Z';
