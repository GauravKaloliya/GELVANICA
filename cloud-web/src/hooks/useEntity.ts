"use client";

import { useState, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { apiClient } from "@/lib/apiClient";
import type { Entity, EntityType, Relation, Tag, Comment } from "@/lib/types";

interface UseEntityOptions {
  entityId?: string;
  workspaceId?: string;
}

export function useEntity(options: UseEntityOptions = {}) {
  const { entityId, workspaceId } = options;
  const { tokens } = useAuthStore();
  const [entity, setEntity] = useState<Entity | null>(null);
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = tokens?.access_token;

  const fetchEntity = useCallback(
    async (id?: string) => {
      const targetId = id || entityId;
      if (!targetId || !token || !workspaceId) return;
      setIsLoading(true);
      try {
        const res = await apiClient.get<{ data: Entity }>(`/workspaces/${workspaceId}/entities/${targetId}`, token);
        setEntity(res.data);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setIsLoading(false);
      }
    },
    [entityId, workspaceId, token]
  );

  const fetchEntityTypes = useCallback(async () => {
    if (!workspaceId || !token) return;
    const res = await apiClient.get<{ data: EntityType[] }>(`/workspaces/${workspaceId}/entities/types`, token);
    setEntityTypes(res.data);
  }, [workspaceId, token]);

  const fetchRelations = useCallback(
    async (targetEntityId?: string) => {
      const id = targetEntityId || entityId;
      if (!id || !token || !workspaceId) return;
      const res = await apiClient.get<{ data: Relation[] }>(`/workspaces/${workspaceId}/relations/?entity_id=${id}`, token);
      setRelations(res.data);
    },
    [entityId, workspaceId, token]
  );

  const fetchTags = useCallback(
    async (targetEntityId?: string) => {
      const id = targetEntityId || entityId;
      if (!id || !token || !workspaceId) return;
      const res = await apiClient.get<{ data: Tag[] }>(`/workspaces/${workspaceId}/tags/?entity_id=${id}`, token);
      setTags(res.data);
    },
    [entityId, workspaceId, token]
  );

  const fetchComments = useCallback(
    async (targetEntityId?: string) => {
      const id = targetEntityId || entityId;
      if (!id || !token || !workspaceId) return;
      const res = await apiClient.get<{ data: Comment[] }>(`/workspaces/${workspaceId}/comments/?entity_id=${id}`, token);
      setComments(res.data);
    },
    [entityId, workspaceId, token]
  );

  const createEntity = useCallback(
    async (data: {
      workspace_id: string;
      entity_type_id: string;
      title?: string;
      icon?: string;
      properties?: Record<string, unknown>;
    }) => {
      const wsId = data.workspace_id;
      const res = await apiClient.post<{ data: Entity }>(`/workspaces/${wsId}/entities/`, data, token);
      return res.data;
    },
    [token]
  );

  const updateEntity = useCallback(
    async (id: string, data: Partial<Entity>) => {
      if (!workspaceId) throw new Error("workspaceId required");
      const res = await apiClient.patch<{ data: Entity }>(`/workspaces/${workspaceId}/entities/${id}`, data, token);
      setEntity(res.data);
      return res.data;
    },
    [workspaceId, token]
  );

  const deleteEntity = useCallback(
    async (id: string) => {
      if (!workspaceId) throw new Error("workspaceId required");
      await apiClient.delete(`/workspaces/${workspaceId}/entities/${id}`, token);
      setEntity(null);
    },
    [workspaceId, token]
  );

  const archiveEntity = useCallback(
    async (id: string) => {
      if (!workspaceId) throw new Error("workspaceId required");
      const res = await apiClient.post<{ data: Entity }>(`/workspaces/${workspaceId}/entities/${id}/archive`, undefined, token);
      setEntity(res.data);
      return res.data;
    },
    [workspaceId, token]
  );

  const addTag = useCallback(
    async (targetEntityId: string, tagId: string) => {
      if (!workspaceId) throw new Error("workspaceId required");
      await apiClient.post(`/workspaces/${workspaceId}/tags/${tagId}/entities/${targetEntityId}`, undefined, token);
    },
    [workspaceId, token]
  );

  const removeTag = useCallback(
    async (tagId: string, targetEntityId: string) => {
      if (!workspaceId) throw new Error("workspaceId required");
      await apiClient.delete(`/workspaces/${workspaceId}/tags/${tagId}/entities/${targetEntityId}`, token);
    },
    [workspaceId, token]
  );

  const addRelation = useCallback(
    async (data: {
      source_entity_id: string;
      target_entity_id: string;
      relation_type: string;
    }) => {
      if (!workspaceId) throw new Error("workspaceId required");
      const res = await apiClient.post<{ data: Relation }>(`/workspaces/${workspaceId}/relations/`, data, token);
      setRelations((prev) => [...prev, res.data]);
      return res.data;
    },
    [workspaceId, token]
  );

  const removeRelation = useCallback(
    async (relationId: string) => {
      if (!workspaceId) throw new Error("workspaceId required");
      await apiClient.delete(`/workspaces/${workspaceId}/relations/${relationId}`, token);
      setRelations((prev) => prev.filter((r) => r.id !== relationId));
    },
    [workspaceId, token]
  );

  const restoreEntity = useCallback(
    async (entityId: string) => {
      if (!workspaceId) throw new Error("workspaceId required");
      const res = await apiClient.post<{ data: Entity }>(`/workspaces/${workspaceId}/entities/${entityId}/restore`, {}, token);
      setEntity(res.data);
      return res.data;
    },
    [workspaceId, token]
  );

  const duplicateEntity = useCallback(
    async (entityId: string, options?: { title?: string; include_blocks?: boolean }) => {
      if (!workspaceId) throw new Error("workspaceId required");
      const res = await apiClient.post<{ data: Entity }>(
        `/workspaces/${workspaceId}/entities/${entityId}/duplicate`,
        options || {},
        token
      );
      return res.data;
    },
    [workspaceId, token]
  );

  const listProperties = useCallback(
    async (workspaceId: string, entityTypeId: string) => {
      const res = await apiClient.get<{ data: Array<{ id: string; name: string; property_type: string; config?: Record<string, unknown> }> }>(
        `/workspaces/${workspaceId}/entities/properties?entity_type_id=${entityTypeId}`,
        token
      );
      return res.data;
    },
    [token]
  );

  const createProperty = useCallback(
    async (data: {
      workspace_id: string;
      entity_type_id: string;
      name: string;
      property_type: string;
      config?: Record<string, unknown>;
    }) => {
      const wsId = data.workspace_id;
      const res = await apiClient.post<{ data: { id: string; name: string; property_type: string } }>(
        `/workspaces/${wsId}/entities/properties`,
        data,
        token
      );
      return res.data;
    },
    [token]
  );

  return {
    entity,
    entityTypes,
    relations,
    tags,
    comments,
    isLoading,
    error,
    fetchEntity,
    fetchEntityTypes,
    fetchRelations,
    fetchTags,
    fetchComments,
    createEntity,
    updateEntity,
    deleteEntity,
    archiveEntity,
    addTag,
    removeTag,
    addRelation,
    removeRelation,
    restoreEntity,
    duplicateEntity,
    listProperties,
    createProperty,
  };
}
