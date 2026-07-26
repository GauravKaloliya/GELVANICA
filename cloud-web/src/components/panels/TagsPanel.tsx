"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/apiClient";
import type { Tag as TagType } from "@/lib/types";
import { TagPicker } from "@/components/tags/TagPicker";
import { TagList } from "@/components/tags/TagList";

interface TagsPanelProps {
  token: string;
  workspaceId: string;
  entityId: string;
}

export default function TagsPanel({ workspaceId, entityId }: TagsPanelProps) {
  const [entityTags, setEntityTags] = useState<TagType[]>([]);

  useEffect(() => {
    const loadEntityTags = async () => {
      const json = await apiClient.get<{ data: TagType[] }>(`/workspaces/${workspaceId}/tags/?entity_id=${entityId}`);
      setEntityTags(json.data || []);
    };
    loadEntityTags();
  }, [workspaceId, entityId]);

  const handleChange = useCallback(async (newTagIds: string[]) => {
    const currentIds = entityTags.map((t) => t.id);
    const toAdd = newTagIds.filter((id) => !currentIds.includes(id));
    const toRemove = currentIds.filter((id) => !newTagIds.includes(id));

    for (const tagId of toAdd) {
      await apiClient.post(`/workspaces/${workspaceId}/tags/${tagId}/entities/${entityId}`);
    }
    for (const tagId of toRemove) {
      await apiClient.delete(`/workspaces/${workspaceId}/tags/${tagId}/entities/${entityId}`);
    }

    setEntityTags((prev) => {
      const added = prev.filter((t) => newTagIds.includes(t.id));
      return added;
    });
  }, [entityTags, entityId]);

  return (
    <div className="space-y-3">
      <TagList
        tags={entityTags}
        editable
        onRemoveTag={(tagId) => {
          const newIds = entityTags.filter((t) => t.id !== tagId).map((t) => t.id);
          handleChange(newIds);
        }}
      />
      <TagPicker
        workspaceId={workspaceId}
        selectedTagIds={entityTags.map((t) => t.id)}
        onChange={handleChange}
      />
    </div>
  );
}
