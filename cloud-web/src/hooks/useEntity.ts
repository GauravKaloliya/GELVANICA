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
      if (!targetId || !token) return;
      setIsLoading(true);
      try {
        const res = await apiClient.get<{ data: Entity }>(`/entities/${targetId}`, token);
        setEntity(res.data);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setIsLoading(false);
      }
    },
    [entityId, token]
  );

  const fetchEntityTypes = useCallback(async () => {
    if (!workspaceId || !token) return;
    const res = await apiClient.get<{ data: EntityType[] }>(`/entities/types?workspace_id=${workspaceId}`, token);
    setEntityTypes(res.data);
  }, [workspaceId, token]);

  const fetchRelations = useCallback(
    async (targetEntityId?: string) => {
      const id = targetEntityId || entityId;
      if (!id || !token) return;
      const res = await apiClient.get<{ data: Relation[] }>(`/relations/?entity_id=${id}`, token);
      setRelations(res.data);
    },
    [entityId, token]
  );

  const fetchTags = useCallback(
    async (targetEntityId?: string) => {
      const id = targetEntityId || entityId;
      if (!id || !token) return;
      const res = await apiClient.get<{ data: Tag[] }>(`/tags/?entity_id=${id}`, token);
      setTags(res.data);
    },
    [entityId, token]
  );

  const fetchComments = useCallback(
    async (targetEntityId?: string) => {
      const id = targetEntityId || entityId;
      if (!id || !token) return;
      const res = await apiClient.get<{ data: Comment[] }>(`/comments/?entity_id=${id}`, token);
      setComments(res.data);
    },
    [entityId, token]
  );

  const createEntity = useCallback(
    async (data: {
      workspace_id: string;
      entity_type_id: string;
      title?: string;
      icon?: string;
      properties?: Record<string, unknown>;
    }) => {
      const res = await apiClient.post<{ data: Entity }>("/entities/", data, token);
      return res.data;
    },
    [token]
  );

  const updateEntity = useCallback(
    async (id: string, data: Partial<Entity>) => {
      const res = await apiClient.patch<{ data: Entity }>(`/entities/${id}`, data, token);
      setEntity(res.data);
      return res.data;
    },
    [token]
  );

  const deleteEntity = useCallback(
    async (id: string) => {
      await apiClient.delete(`/entities/${id}`, token);
      setEntity(null);
    },
    [token]
  );

  const archiveEntity = useCallback(
    async (id: string) => {
      const res = await apiClient.post<{ data: Entity }>(`/entities/${id}/archive`, undefined, token);
      setEntity(res.data);
      return res.data;
    },
    [token]
  );

  const addTag = useCallback(
    async (targetEntityId: string, tagId: string) => {
      await apiClient.post(`/tags/${tagId}/entities`, { entity_id: targetEntityId }, token);
    },
    [token]
  );

  const removeTag = useCallback(
    async (tagId: string, targetEntityId: string) => {
      await apiClient.delete(`/tags/${tagId}/entities/${targetEntityId}`, token);
    },
    [token]
  );

  const addRelation = useCallback(
    async (data: {
      source_entity_id: string;
      target_entity_id: string;
      relation_type: string;
    }) => {
      const res = await apiClient.post<{ data: Relation }>("/relations/", data, token);
      setRelations((prev) => [...prev, res.data]);
      return res.data;
    },
    [token]
  );

  const removeRelation = useCallback(
    async (relationId: string) => {
      await apiClient.delete(`/relations/${relationId}`, token);
      setRelations((prev) => prev.filter((r) => r.id !== relationId));
    },
    [token]
  );

  const restoreEntity = useCallback(
    async (entityId: string) => {
      const res = await apiClient.post<{ data: Entity }>(`/entities/${entityId}/restore`, {}, token);
      setEntity(res.data);
      return res.data;
    },
    [token]
  );

  const duplicateEntity = useCallback(
    async (entityId: string, options?: { title?: string; include_blocks?: boolean }) => {
      const res = await apiClient.post<{ data: Entity }>(
        `/entities/${entityId}/duplicate`,
        options || {},
        token
      );
      return res.data;
    },
    [token]
  );

  const listProperties = useCallback(
    async (workspaceId: string, entityTypeId: string) => {
      const res = await apiClient.get<{ data: Array<{ id: string; name: string; property_type: string; config?: Record<string, unknown> }> }>(
        `/entities/properties?workspace_id=${workspaceId}&entity_type_id=${entityTypeId}`,
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
      const res = await apiClient.post<{ data: { id: string; name: string; property_type: string } }>(
        "/entities/properties",
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
