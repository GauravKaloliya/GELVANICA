"use client";

import { useCallback, useState } from "react";
import type { Block, BlockContent, BlockType } from "@/lib/types";
import BlockRenderer from "./BlockRenderer";
import SlashCommandMenu from "./SlashCommandMenu";
import { cn } from "@/lib/utils";
import { GripVertical, Plus, Loader2 } from "lucide-react";

interface BlockEditorProps {
  blocks: Block[];
  token: string;
  onUpdateBlock: (token: string, id: string, data: { content?: BlockContent; type?: BlockType; position?: number }) => void;
  onDeleteBlock: (token: string, id: string) => void;
  onAddBlock?: () => void;
  onReorder?: (blockId: string, newPosition: number) => void;
  onBlockSelect?: (blockId: string | null) => void;
  readOnly?: boolean;
}

export default function BlockEditor({
  blocks,
  token,
  onUpdateBlock,
  onDeleteBlock,
  onAddBlock,
  onReorder,
  onBlockSelect,
  readOnly = false,
}: BlockEditorProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [slashMenu, setSlashMenu] = useState<{ open: boolean; blockId: string | null; query: string }>({
    open: false,
    blockId: null,
    query: "",
  });
  const [addingBlock, setAddingBlock] = useState(false);

  const handleDragStart = useCallback((e: React.DragEvent, blockId: string) => {
    setDraggedId(blockId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", blockId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, blockId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverId(blockId);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      const sourceId = e.dataTransfer.getData("text/plain");
      if (sourceId === targetId || !onReorder) {
        setDraggedId(null);
        setDragOverId(null);
        return;
      }

      const sourceIndex = blocks.findIndex((b) => b.id === sourceId);
      const targetIndex = blocks.findIndex((b) => b.id === targetId);
      if (sourceIndex === -1 || targetIndex === -1) return;

      const newPosition = blocks[targetIndex].position;
      onReorder(sourceId, newPosition);
      setDraggedId(null);
      setDragOverId(null);
    },
    [blocks, onReorder]
  );

  const handleSlashSelect = useCallback(
    (blockType: BlockType) => {
      if (!slashMenu.blockId) return;
      onUpdateBlock(token, slashMenu.blockId, { type: blockType });
      setSlashMenu({ open: false, blockId: null, query: "" });
    },
    [slashMenu.blockId, token, onUpdateBlock]
  );

  const handleAddBlock = useCallback(async () => {
    setAddingBlock(true);
    try {
      onAddBlock?.();
    } finally {
      setAddingBlock(false);
    }
  }, [onAddBlock]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, block: Block) => {
      if (readOnly) return;
      if (e.key === "/" && block.type === "text") {
        const content = block.content as { text?: string };
        if (!content?.text || content.text === "") {
          e.preventDefault();
          setSlashMenu({ open: true, blockId: block.id, query: "" });
        }
      }
    },
    [readOnly]
  );

  return (
    <div className="space-y-1">
      {blocks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted">No content yet</p>
          <p className="mt-1 text-xs text-muted">Start typing or click below to add a block</p>
        </div>
      ) : (
        blocks.map((block) => (
          <div
            key={block.id}
            draggable={!readOnly}
            onDragStart={(e) => handleDragStart(e, block.id)}
            onDragOver={(e) => handleDragOver(e, block.id)}
            onDrop={(e) => handleDrop(e, block.id)}
            onDragEnd={() => { setDraggedId(null); setDragOverId(null); }}
            onKeyDown={(e) => handleKeyDown(e, block)}
            onClick={() => onBlockSelect?.(block.id)}
            className={cn(
              "group relative flex items-start gap-1 rounded-md transition-all",
              !readOnly && "hover:bg-surface",
              draggedId === block.id && "opacity-40",
              dragOverId === block.id && draggedId !== block.id && "border-t-2 border-blue-500"
            )}
          >
            {!readOnly && (
              <div className="flex shrink-0 items-center gap-0.5 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setSlashMenu({ open: true, blockId: block.id, query: "" })}
                  className="rounded p-0.5 text-muted hover:bg-surface hover:text-foreground"
                  title="Insert block"
                >
                  <Plus className="h-3 w-3" />
                </button>
                <div className="cursor-grab rounded p-0.5 text-muted hover:bg-surface hover:text-foreground active:cursor-grabbing">
                  <GripVertical className="h-3 w-3" />
                </div>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <BlockRenderer
                block={block}
                token={token}
                onUpdateBlock={onUpdateBlock}
                onDeleteBlock={onDeleteBlock}
              />
            </div>
          </div>
        ))
      )}

      {!readOnly && (
        <button
          onClick={handleAddBlock}
          disabled={addingBlock}
          className="w-full rounded-md border border-dashed border-border py-3 text-sm text-muted hover:border-border/80 hover:text-foreground disabled:opacity-50"
        >
          {addingBlock ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "+ Add block"}
        </button>
      )}

      {slashMenu.open && slashMenu.blockId && (
        <SlashCommandMenu
          onSelect={handleSlashSelect}
          onClose={() => setSlashMenu({ open: false, blockId: null, query: "" })}
          query={slashMenu.query}
        />
      )}
    </div>
  );
}
