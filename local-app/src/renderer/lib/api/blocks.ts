import { get, getList, post, patch, del } from './client'
import type {
  Block,
  BlockCreateRequest,
  BlockUpdateRequest,
  MoveBlockRequest,
  ReorderBlockRequest,
} from '@shared/types'

export const blocksApi = {
  list: (params?: { entity_id?: string }) =>
    getList<Block>('/blocks/', params ? { params } : undefined),
  create: (data: BlockCreateRequest) => post<Block>('/blocks/', data),
  get: (id: string) => get<Block>(`/blocks/${id}`),
  update: (id: string, data: BlockUpdateRequest) => patch<Block>(`/blocks/${id}`, data),
  move: (id: string, data: MoveBlockRequest) => post<Block>(`/blocks/${id}/move`, data),
  delete: (id: string) => del(`/blocks/${id}`),
  reorder: (data: ReorderBlockRequest) => post<Block[]>('/blocks/reorder', data),
  entityBlocks: (entityId: string) => getList<Block>(`/blocks/entity/${entityId}`),
}
