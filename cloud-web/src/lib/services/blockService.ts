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
  list: (entityId: string) =>
    apiClient.get<BlockListResponse>(`/blocks/?entity_id=${entityId}`),

  create: (data: {
    entity_id: string;
    block_type: string;
    content: Record<string, unknown>;
    position?: number;
    parent_block_id?: string;
  }) => apiClient.post<BlockResponse>("/blocks/", data),

  get: (blockId: string) =>
    apiClient.get<BlockResponse>(`/blocks/${blockId}`),

  update: (blockId: string, data: {
    content?: Record<string, unknown>;
    position?: number;
  }) => apiClient.patch<BlockResponse>(`/blocks/${blockId}`, data),

  delete: (blockId: string) =>
    apiClient.delete(`/blocks/${blockId}`),

  move: (blockId: string, data: {
    parent_block_id?: string;
    position: number;
    entity_id?: string;
  }) => apiClient.post<BlockResponse>(`/blocks/${blockId}/move`, data),

  reorder: (data: {
    entity_id: string;
    block_ids: string[];
  }) => apiClient.post("/blocks/reorder", data),

  listByEntity: (entityId: string) =>
    apiClient.get<BlockListResponse>(`/blocks/entity/${entityId}`),
};
