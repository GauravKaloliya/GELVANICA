"use client";

import { useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useGraphStore } from "@/stores/graphStore";
import type { GraphPath } from "@/lib/types";

export function useGraph(workspaceId: string) {
  const { tokens } = useAuthStore();
  const {
    nodes,
    edges,
    selectedNodeId,
    hoveredNodeId,
    isLoading,
    error,
    versionHash,
    generatedAt,
    setNodes,
    setEdges,
    setSelectedNodeId,
    setHoveredNodeId,
    fetchGraph,
    materialize,
    queryGraph,
    traverse,
    findPath,
  } = useGraphStore();

  const loadGraph = useCallback(() => {
    if (tokens?.access_token) fetchGraph(tokens.access_token, workspaceId);
  }, [tokens, workspaceId, fetchGraph]);

  const refreshGraph = useCallback(() => {
    if (tokens?.access_token) materialize(tokens.access_token, workspaceId);
  }, [tokens, workspaceId, materialize]);

  const filterGraph = useCallback(
    (filters: { relation_types?: string[]; entity_type_ids?: string[]; limit?: number }) => {
      if (tokens?.access_token) queryGraph(tokens.access_token, workspaceId, filters);
    },
    [tokens, workspaceId, queryGraph]
  );

  const traverseGraph = useCallback(
    (centerNode: string, depth?: number, relationTypes?: string[]) => {
      if (tokens?.access_token) traverse(tokens.access_token, workspaceId, centerNode, depth, relationTypes);
    },
    [tokens, workspaceId, traverse]
  );

  const findPathBetween = useCallback(
    async (sourceId: string, targetId: string): Promise<GraphPath | null> => {
      if (!tokens?.access_token) return null;
      return findPath(tokens.access_token, workspaceId, sourceId, targetId);
    },
    [tokens, workspaceId, findPath]
  );

  return {
    nodes,
    edges,
    selectedNodeId,
    hoveredNodeId,
    isLoading,
    error,
    versionHash,
    generatedAt,
    setNodes,
    setEdges,
    setSelectedNodeId,
    setHoveredNodeId,
    loadGraph,
    refreshGraph,
    filterGraph,
    traverseGraph,
    findPathBetween,
  };
}
