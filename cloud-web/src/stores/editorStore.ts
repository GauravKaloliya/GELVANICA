import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Block, BlockType, BlockContent } from "@/lib/types";
import { apiClient } from "@/lib/apiClient";

interface EditorState {
  entityId: string | null;
  blocks: Block[];
  selectedBlockId: string | null;
  isSaving: boolean;
  isDirty: boolean;
  lastSavedAt: string | null;
  error: string | null;

  selectedEntityIds: string[];
  lastClickedIndex: number | null;

  setEntityId: (id: string | null) => void;
  setBlocks: (blocks: Block[]) => void;
  setSelectedBlockId: (id: string | null) => void;
  setIsSaving: (saving: boolean) => void;
  setIsDirty: (dirty: boolean) => void;
  setError: (error: string | null) => void;

  toggleEntitySelection: (id: string) => void;
  selectEntity: (id: string) => void;
  deselectEntity: (id: string) => void;
  selectAll: (ids: string[]) => void;
  selectRange: (fromId: string, toId: string, allIds: string[]) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  isEntitySelected: (id: string) => boolean;
  handleEntityClick: (id: string, allIds: string[], shiftKey: boolean, metaKey: boolean) => void;

  addBlock: (token: string, block: Partial<Block> & { entity_id: string; block_type: BlockType }) => Promise<Block>;
  updateBlock: (token: string, id: string, data: { block_type?: BlockType; content?: BlockContent }) => Promise<void>;
  deleteBlock: (token: string, id: string) => Promise<void>;
  moveBlock: (token: string, id: string, parentBlockId: string | null, position: number) => Promise<void>;
  reorderBlocks: (token: string, entityId: string, blocks: Array<{ id: string; position: number }>) => Promise<void>;
  fetchBlocks: (token: string, entityId: string) => Promise<void>;
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
  entityId: null,
  blocks: [],
  selectedBlockId: null,
  isSaving: false,
  isDirty: false,
  lastSavedAt: null,
  error: null,

  selectedEntityIds: [],
  lastClickedIndex: null,

  setEntityId: (id) => set({ entityId: id }),
  setBlocks: (blocks) => set({ blocks }),
  setSelectedBlockId: (id) => set({ selectedBlockId: id }),
  setIsSaving: (saving) => set({ isSaving: saving }),
  setIsDirty: (dirty) => set({ isDirty: dirty }),
  setError: (error) => set({ error }),

  toggleEntitySelection: (id) => {
    const { selectedEntityIds } = get();
    if (selectedEntityIds.includes(id)) {
      set({ selectedEntityIds: selectedEntityIds.filter((eid) => eid !== id) });
    } else {
      set({ selectedEntityIds: [...selectedEntityIds, id] });
    }
  },

  selectEntity: (id) => {
    const { selectedEntityIds } = get();
    if (!selectedEntityIds.includes(id)) {
      set({ selectedEntityIds: [...selectedEntityIds, id] });
    }
  },

  deselectEntity: (id) => {
    set({ selectedEntityIds: get().selectedEntityIds.filter((eid) => eid !== id) });
  },

  selectAll: (ids) => {
    set({ selectedEntityIds: [...ids] });
  },

  selectRange: (fromId, toId, allIds) => {
    const start = allIds.indexOf(fromId);
    const end = allIds.indexOf(toId);
    if (start === -1 || end === -1) return;
    const lo = Math.min(start, end);
    const hi = Math.max(start, end);
    const rangeIds = allIds.slice(lo, hi + 1);
    const { selectedEntityIds } = get();
    const merged = [...new Set([...selectedEntityIds, ...rangeIds])];
    set({ selectedEntityIds: merged });
  },

  clearSelection: () => {
    set({ selectedEntityIds: [], lastClickedIndex: null });
  },

  isSelected: (id) => {
    return get().selectedEntityIds.includes(id);
  },

  isEntitySelected: (id) => {
    return get().selectedEntityIds.includes(id);
  },

  handleEntityClick: (id, allIds, shiftKey, metaKey) => {
    const { selectedEntityIds, lastClickedIndex } = get();
    const currentIndex = allIds.indexOf(id);

    if (shiftKey && lastClickedIndex !== null && currentIndex !== -1) {
      const start = Math.min(lastClickedIndex, currentIndex);
      const end = Math.max(lastClickedIndex, currentIndex);
      const rangeIds = allIds.slice(start, end + 1);
      const merged = [...new Set([...selectedEntityIds, ...rangeIds])];
      set({ selectedEntityIds: merged });
    } else if (metaKey || !navigator.platform.includes("Mac")) {
      if (selectedEntityIds.includes(id)) {
        set({ selectedEntityIds: selectedEntityIds.filter((eid) => eid !== id), lastClickedIndex: currentIndex });
      } else {
        set({ selectedEntityIds: [...selectedEntityIds, id], lastClickedIndex: currentIndex });
      }
    } else {
      set({ selectedEntityIds: [id], lastClickedIndex: currentIndex });
    }
  },

  fetchBlocks: async (token, entityId) => {
    try {
      const res = await apiClient.get<{ data: Block[] }>(`/blocks/entity/${entityId}`, token);
      set({ blocks: res.data, entityId });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  addBlock: async (token, block) => {
    const res = await apiClient.post<{ data: Block }>("/blocks/", block, token);
    const newBlock = res.data;
    set({ blocks: [...get().blocks, newBlock], isDirty: true });
    return newBlock;
  },

  updateBlock: async (token, id, data) => {
    const res = await apiClient.patch<{ data: Block }>(`/blocks/${id}`, data, token);
    const updated = res.data;
    set({
      blocks: get().blocks.map((b) => (b.id === id ? updated : b)),
      isDirty: true,
      lastSavedAt: new Date().toISOString(),
    });
  },

  deleteBlock: async (token, id) => {
    await apiClient.delete(`/blocks/${id}`, token);
    set({
      blocks: get().blocks.filter((b) => b.id !== id),
      isDirty: true,
    });
  },

  moveBlock: async (token, id, parentBlockId, position) => {
    await apiClient.post(`/blocks/${id}/move`, { parent_block_id: parentBlockId, position }, token);
    set({ isDirty: true });
  },

  reorderBlocks: async (token, entityId, blocks) => {
    await apiClient.post("/blocks/reorder", { entity_id: entityId, blocks }, token);
    set({ isDirty: true });
  },
}),
    {
      name: "gnovium-editor",
      partialize: (state) => ({
        entityId: state.entityId,
        selectedBlockId: state.selectedBlockId,
      }),
    }
  )
);
