"use client";

import type { Block, BlockContent } from "@/lib/types";
import HeadingBlock from "./blocks/HeadingBlock";
import ListBlock from "./blocks/ListBlock";
import ToDoBlock from "./blocks/ToDoBlock";
import CodeBlock from "./blocks/CodeBlock";
import QuoteBlock from "./blocks/QuoteBlock";
import CalloutBlock from "./blocks/CalloutBlock";
import DividerBlock from "./blocks/DividerBlock";
import ToggleBlock from "./blocks/ToggleBlock";
import TableBlock from "./blocks/TableBlock";
import ImageBlock from "./blocks/ImageBlock";
import EmbedBlock from "./blocks/EmbedBlock";
import EquationBlock from "./blocks/EquationBlock";
import MentionBlock from "./blocks/MentionBlock";
import AIBlock from "./blocks/AIBlock";
import TextBlock from "./blocks/TextBlock";

interface BlockRendererProps {
  block: Block;
  token: string;
  onUpdateBlock: (token: string, id: string, data: { content?: BlockContent }) => void;
  onDeleteBlock: (token: string, id: string) => void;
}

export default function BlockRenderer({ block, token, onUpdateBlock, onDeleteBlock }: BlockRendererProps) {
  const update = (content: BlockContent) => onUpdateBlock(token, block.id, { content });

  const renderContent = () => {
    switch (block.block_type) {
      case "heading_1":
      case "heading_2":
      case "heading_3":
        return (
          <HeadingBlock
            blockType={block.block_type}
            content={(block.content as { text: string }) || { text: "" }}
            onChange={(c) => update(c)}
          />
        );
      case "bulleted_list":
      case "numbered_list":
        return (
          <ListBlock
            blockType={block.block_type}
            content={(block.content as { text: string }) || { text: "" }}
            onChange={(c) => update(c)}
            position={block.position}
          />
        );
      case "to_do":
        return (
          <ToDoBlock
            content={(block.content as { text: string; checked: boolean }) || { text: "", checked: false }}
            onChange={(c) => update(c)}
          />
        );
      case "code":
        return (
          <CodeBlock
            content={(block.content as { text: string; language?: string }) || { text: "", language: "text" }}
            onChange={(c) => update(c)}
          />
        );
      case "quote":
        return (
          <QuoteBlock
            content={(block.content as { text: string }) || { text: "" }}
            onChange={(c) => update(c)}
          />
        );
      case "callout":
        return (
          <CalloutBlock
            content={(block.content as { text: string; icon?: string }) || { text: "", icon: "" }}
            onChange={(c) => update(c)}
          />
        );
      case "divider":
        return <DividerBlock />;
      case "toggle":
        return (
          <ToggleBlock
            content={(block.content as { text: string; open?: boolean }) || { text: "", open: false }}
            onChange={(c) => update(c)}
          />
        );
      case "table":
        return (
          <TableBlock
            content={(block.content as { rows?: string[][]; columns?: string[] }) || {}}
            onChange={(c) => update(c)}
          />
        );
      case "image":
        return (
          <ImageBlock
            content={(block.content as { url?: string; alt?: string }) || {}}
            onChange={(c) => update(c)}
          />
        );
      case "embed":
        return <EmbedBlock content={(block.content as { url: string; title?: string }) || { url: "" }} onChange={(c) => update(c)} />;
      case "equation":
        return <EquationBlock content={(block.content as { text: string; display?: boolean }) || { text: "" }} onChange={(c) => update(c)} />;
      case "mention":
        return <MentionBlock content={(block.content as { text: string; entity_id?: string; entity_title?: string }) || { text: "" }} onChange={(c) => update(c)} />;
      case "ai":
        return <AIBlock content={(block.content as { text: string; prompt?: string; model?: string }) || { text: "" }} onChange={(c) => update(c)} />;
      default:
        return <TextBlock content={(block.content as { text: string }) || { text: "" }} onChange={(c) => update(c)} />;
    }
  };

  return (
    <div className="group relative rounded-md border border-transparent p-2 hover:border-zinc-700">
      {renderContent()}
      <button
        onClick={() => onDeleteBlock(token, block.id)}
        className="absolute right-1 top-1 hidden rounded p-1 text-zinc-600 hover:bg-zinc-800 hover:text-red-400 group-hover:block"
      >
        ×
      </button>
    </div>
  );
}
