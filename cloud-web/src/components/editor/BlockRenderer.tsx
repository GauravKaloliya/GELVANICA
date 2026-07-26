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
import ImageBlock from "./blocks/ImageBlock";
import EquationBlock from "./blocks/EquationBlock";
import TextBlock from "./blocks/TextBlock";
import VideoBlock from "./blocks/VideoBlock";
import FileBlock from "./blocks/FileBlock";
import BookmarkBlock from "./blocks/BookmarkBlock";
import TableOfContentsBlock from "./blocks/TableOfContentsBlock";
import ColumnListBlock from "./blocks/ColumnListBlock";
import ColumnBlock from "./blocks/ColumnBlock";
import BreadcrumbBlock from "./blocks/BreadcrumbBlock";

interface BlockRendererProps {
  block: Block;
  token: string;
  onUpdateBlock: (token: string, id: string, data: { content?: BlockContent }) => void;
  onDeleteBlock: (token: string, id: string) => void;
}

export default function BlockRenderer({ block, token, onUpdateBlock, onDeleteBlock }: BlockRendererProps) {
  const update = (content: BlockContent) => onUpdateBlock(token, block.id, { content });

  const renderContent = () => {
    switch (block.type) {
      case "heading1":
      case "heading2":
      case "heading3":
        return (
          <HeadingBlock
            blockType={block.type}
            content={(block.content as { text: string }) || { text: "" }}
            onChange={(c) => update(c)}
          />
        );
      case "bulleted_list":
      case "numbered_list":
        return (
          <ListBlock
            blockType={block.type}
            content={(block.content as { text: string }) || { text: "" }}
            onChange={(c) => update(c)}
            position={block.position}
          />
        );
      case "to-do":
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
      case "image":
        return (
          <ImageBlock
            content={(block.content as { url?: string; alt?: string }) || {}}
            onChange={(c) => update(c)}
          />
        );
      case "equation":
        return <EquationBlock content={(block.content as { text: string; display?: boolean }) || { text: "" }} onChange={(c) => update(c)} />;
      case "video":
        return <VideoBlock content={(block.content as { url?: string; caption?: string }) || {}} onChange={(c) => update(c)} />;
      case "file":
        return <FileBlock content={(block.content as { url?: string; name?: string }) || {}} onChange={(c) => update(c)} />;
      case "bookmark":
        return <BookmarkBlock content={(block.content as { url?: string; title?: string; description?: string; icon?: string }) || {}} onChange={(c) => update(c)} />;
      case "table_of_contents":
        return <TableOfContentsBlock content={(block.content as Record<string, unknown>) || {}} onChange={(c) => update(c)} />;
      case "column_list":
        return <ColumnListBlock content={(block.content as { columns?: number }) || {}} onChange={(c) => update(c)} />;
      case "column":
        return <ColumnBlock content={(block.content as Record<string, unknown>) || {}} onChange={(c) => update(c)} />;
      case "breadcrumb":
        return <BreadcrumbBlock content={(block.content as { pages?: string[] }) || {}} onChange={(c) => update(c)} />;
      default:
        return <TextBlock content={(block.content as { text: string }) || { text: "" }} onChange={(c) => update(c)} />;
    }
  };

  return (
    <div className="group relative rounded-md border border-transparent p-2 card-hover">
      {renderContent()}
      <button
        onClick={() => onDeleteBlock(token, block.id)}
        className="absolute right-1 top-1 hidden rounded p-1 text-muted hover:bg-surface hover:text-red-400 group-hover:block"
      >
        ×
      </button>
    </div>
  );
}
