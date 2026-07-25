"use client";

import { cn } from "@/lib/utils";
import { Inbox } from "lucide-react";
import { TagBadge } from "@/components/tags/TagBadge";
import type { Tag } from "@/lib/types/tag";

interface TagListProps {
  tags: Tag[];
  onRemoveTag?: (tagId: string) => void;
  onTagClick?: (tagId: string) => void;
  editable?: boolean;
  className?: string;
}

export function TagList({
  tags,
  onRemoveTag,
  onTagClick,
  editable = false,
  className,
}: TagListProps) {
  if (tags.length === 0) {
    return (
      <div className={cn("flex items-center gap-2 py-2", className)}>
        <Inbox className="h-4 w-4 text-zinc-600" />
        <p className="text-xs text-zinc-500">No tags</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {tags.map((tag) => (
        <TagBadge
          key={tag.id}
          name={tag.name}
          color={tag.color}
          removable={editable}
          onRemove={() => onRemoveTag?.(tag.id)}
          onClick={() => onTagClick?.(tag.id)}
        />
      ))}
    </div>
  );
}

export default TagList;
