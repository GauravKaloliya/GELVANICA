import { apiClient } from "../apiClient";
import type { Block } from "../types";

interface BlockListResponse {
  data: Block[];
  meta?: { total: number };
}

interface BlockResponse {
  data: Block;
}

export const blockService = {
  list: (workspaceId: string, entityId: string) =>
    apiClient.get<BlockListResponse>(`/workspaces/${workspaceId}/blocks/?entity_id=${entityId}`),

  create: (workspaceId: string, data: {
    entity_id: string;
    type: string;
    branch_id: string;
    position: string;
    content?: Record<string, unknown>;
    parent_block_id?: string;
    indent?: number;
  }) => apiClient.post<BlockResponse>(`/workspaces/${workspaceId}/blocks/`, data),

  get: (workspaceId: string, blockId: string) =>
    apiClient.get<BlockResponse>(`/workspaces/${workspaceId}/blocks/${blockId}`),

  update: (workspaceId: string, blockId: string, data: {
    content?: Record<string, unknown>;
    position?: number;
  }) => apiClient.patch<BlockResponse>(`/workspaces/${workspaceId}/blocks/${blockId}`, data),

  delete: (workspaceId: string, blockId: string) =>
    apiClient.delete(`/workspaces/${workspaceId}/blocks/${blockId}`),

  move: (workspaceId: string, blockId: string, data: {
    parent_block_id?: string;
    position: number;
    entity_id?: string;
  }) => apiClient.post<BlockResponse>(`/workspaces/${workspaceId}/blocks/${blockId}/move`, data),

  reorder: (workspaceId: string, data: {
    entity_id: string;
    blocks: Array<{ id: string; position: number }>;
  }) => apiClient.post(`/workspaces/${workspaceId}/blocks/reorder`, data),

  listByEntity: (workspaceId: string, entityId: string) =>
    apiClient.get<BlockListResponse>(`/workspaces/${workspaceId}/blocks/entity/${entityId}`),

  restore: (workspaceId: string, blockId: string) =>
    apiClient.post<BlockResponse>(`/workspaces/${workspaceId}/blocks/${blockId}/restore`),

};
