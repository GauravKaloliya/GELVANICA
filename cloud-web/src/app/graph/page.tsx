'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from '@/lib/session';
import { useRouter } from 'next/navigation';
import { Network, RefreshCw } from 'lucide-react';
import KnowledgeGraph, { type GraphData, type GraphNode } from '@/components/graph/KnowledgeGraph';
import { motion } from 'framer-motion';
import { Routes } from '@gnovium/shared';
import { apiClient } from "@/lib/apiClient";

interface GraphSnapshotNode {
  id: string;
  title?: string;
  name?: string;
  type?: string;
  entity_type?: string;
  val?: number;
}

interface GraphSnapshotEdge {
  source: string;
  target: string;
  label?: string;
  weight?: number;
}

interface GraphApiResponse {
  data?: { graph_snapshot?: { nodes?: GraphSnapshotNode[]; edges?: GraphSnapshotEdge[] } };
  graph_snapshot?: { nodes?: GraphSnapshotNode[]; edges?: GraphSnapshotEdge[] };
}

export default function GraphPage() {
  const { user, isLoading, isAuthenticated } = useSession();
  const router = useRouter();
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await apiClient.get<GraphApiResponse>("/graph/default");
      const data = json.data || json;
      if (data?.graph_snapshot) {
        const snap = data.graph_snapshot;
        setGraphData({
          nodes: (snap.nodes || []).map((n) => ({
            id: n.id,
            title: n.title || n.name || n.id,
            type: n.type || n.entity_type,
            val: n.val || 1,
          })),
          edges: (snap.edges || []).map((e) => ({
            source: e.source,
            target: e.target,
            label: e.label,
            weight: e.weight || 1,
          })),
        });
      } else {
        setGraphData({ nodes: [], edges: [] });
      }
    } catch {
      setError('Failed to load graph');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Knowledge Graph | Gnovium'
  }, [])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(Routes.cloudWeb.signIn.build({}));
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) fetchGraph();
  }, [isAuthenticated, fetchGraph]);

  const handleNodeClick = (node: GraphNode) => {
    if (process.env.NODE_ENV === "development") console.log("Node clicked:", node);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="skeleton-card min-h-[500px] rounded-none border-2 border-dashed" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6"
    >
      <div className="flex items-center justify-between border-b-2 border-[var(--border)] pb-4">
        <div className="flex items-center gap-3">
          <Network size={20} strokeWidth={2.5} />
          <div>
            <h1 className="text-sm font-black font-mono uppercase tracking-wider">Knowledge Graph</h1>
            <p className="text-[9px] font-mono font-bold text-[var(--muted)] mt-0.5">
              Visualize connections between pages, entities, and ideas
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchGraph}
            className="flex items-center gap-1.5 font-mono text-[10px] font-black uppercase tracking-wider px-3 py-2 border-2 border-[var(--border)] neo-depth-btn bg-[var(--card-bg)] cursor-pointer hover:bg-[var(--code-bg)]"
          >
            <RefreshCw size={12} strokeWidth={2.5} />
            Refresh
          </button>
        </div>
      </div>

      <KnowledgeGraph
        data={graphData}
        loading={loading}
        error={error}
        onNodeClick={handleNodeClick}
        onRefresh={fetchGraph}
        className="border-[3px] border-[var(--border)] neo-depth"
      />
    </motion.div>
  );
}
