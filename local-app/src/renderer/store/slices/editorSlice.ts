import { StateCreator } from 'zustand'
import type { Block } from '@shared/types'
import type { StoreState } from '../index'

export interface EditorSlice {
  activeEntityId: string | null
  blocks: Block[]
  isDirty: boolean
  isSaving: boolean
  activeBlockId: string | null

  setActiveEntity: (id: string | null) => void
  setBlocks: (blocks: Block[]) => void
  addBlock: (block: Block) => void
  updateBlock: (id: string, updates: Partial<Block>) => void
  removeBlock: (id: string) => void
  reorderBlocks: (orderedIds: string[]) => void
  setDirty: (dirty: boolean) => void
  setSaving: (saving: boolean) => void
  setActiveBlock: (id: string | null) => void
}

export const createEditorSlice: StateCreator<StoreState, [], [], EditorSlice> = (
  set
) => ({
  activeEntityId: null,
  blocks: [],
  isDirty: false,
  isSaving: false,
  activeBlockId: null,

  setActiveEntity: (id) =>
    set({
      activeEntityId: id,
      blocks: [],
      isDirty: false,
      activeBlockId: null,
    }),

  setBlocks: (blocks) => set({ blocks }),

  addBlock: (block) =>
    set((state) => ({
      blocks: [...state.blocks, block],
      isDirty: true,
    })),

  updateBlock: (id, updates) =>
    set((state) => ({
      blocks: state.blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)),
      isDirty: true,
    })),

  removeBlock: (id) =>
    set((state) => ({
      blocks: state.blocks.filter((b) => b.id !== id),
      activeBlockId: state.activeBlockId === id ? null : state.activeBlockId,
      isDirty: true,
    })),

  reorderBlocks: (orderedIds) =>
    set((state) => {
      const blockMap = new Map(state.blocks.map((b) => [b.id, b]))
      const reordered = orderedIds
        .map((id, index) => {
          const block = blockMap.get(id)
          if (!block) return null
          return { ...block, position: index }
        })
        .filter((b): b is Block => b !== null)
      return { blocks: reordered, isDirty: true }
    }),

  setDirty: (isDirty) => set({ isDirty }),

  setSaving: (isSaving) => set({ isSaving }),

  setActiveBlock: (activeBlockId) => set({ activeBlockId }),
})
