"use client";

import React, { Suspense, useCallback, useMemo, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState, MarkerType, BackgroundVariant,
  ReactFlowProvider, Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Node, Edge } from "@xyflow/react";
import { useGraph } from "@/hooks/useGraph";
import { useAuthStore } from "@/stores/authStore";
import { cn, downloadJson } from "@/lib/utils";
import type { GraphNode } from "@/lib/types";
import GraphFilters from "@/components/graph/GraphFilters";
import GraphInfoPanel from "@/components/graph/GraphInfoPanel";
import {
  RefreshCw, Zap, AlertCircle, Search, X, Settings2, Maximize, Minimize,
  Download, ChevronDown, ExternalLink, Copy, LayoutGrid, Circle, GitBranch,
  Loader2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";


type LayoutType = "force" | "hierarchical" | "circular";

function computeLayout(nodes: GraphNode[], layout: LayoutType): Map<string, { x: number; y: number }> {
  const pos = new Map<string, { x: number; y: number }>();
  const c = nodes.length;
  if (c === 0) return pos;
  if (layout === "circular") {
    const r = Math.min(c * 30, 400);
    nodes.forEach((n, i) => {
      const a = (i * 2 * Math.PI) / c;
      pos.set(n.id, { x: Math.cos(a) * r + 500, y: Math.sin(a) * r + 300 });
    });
  } else if (layout === "hierarchical") {
    const cols = Math.ceil(Math.sqrt(c));
    nodes.forEach((n, i) => pos.set(n.id, { x: (i % cols) * 200 + 100, y: Math.floor(i / cols) * 120 + 60 }));
  } else {
    const pts = nodes.map((n, i) => {
      const a = (i * 2 * Math.PI) / c;
      return { id: n.id, x: Math.cos(a) * c * 15 + 400, y: Math.sin(a) * c * 15 + 250 };
    });
    for (let iter = 0; iter < 30; iter++) {
      for (let i = 0; i < pts.length; i++) {
        let fx = 0, fy = 0;
        for (let j = 0; j < pts.length; j++) {
          if (i === j) continue;
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const f = 800 / (d * d);
          fx += (dx / d) * f; fy += (dy / d) * f;
        }
        pts[i].x += fx * 0.3; pts[i].y += fy * 0.3;
      }
    }
    pts.forEach((p) => pos.set(p.id, { x: p.x, y: p.y }));
  }
  return pos;
}

function GraphView() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  useAuthStore();
  const { nodes: graphNodes, edges: graphEdges, isLoading, error, versionHash, generatedAt,
    loadGraph, refreshGraph, traverseGraph, setSelectedNodeId } = useGraph(workspaceId);

  const [filterOpen, setFilterOpen] = useState(false);
  const [depthFilter, setDepthFilter] = useState(3);
  const [searchQuery, setSearchQuery] = useState("");
  const [relationFilter, setRelationFilter] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [layout, setLayout] = useState<LayoutType>("circular");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [layoutOpen, setLayoutOpen] = useState(false);

  useEffect(() => { loadGraph(); }, [loadGraph]);

  const layoutPositions = useMemo(() => computeLayout(graphNodes, layout), [graphNodes, layout]);

  const flowNodes: Node[] = useMemo(
    () => graphNodes.map((n: GraphNode) => ({
      id: n.id,
      data: { label: n.title, icon: n.icon, type: n.type },
      position: layoutPositions.get(n.id) ?? { x: 0, y: 0 },
      style: {
        background: "rgb(24 24 27)", border: "1px solid rgb(63 63 70)", borderRadius: "12px",
        padding: "10px 16px", color: "white", fontSize: "13px", fontWeight: 500, minWidth: 120,
      },
    })),
    [graphNodes, layoutPositions]
  );

  const flowEdges: Edge[] = useMemo(
    () => graphEdges.map((e) => ({
      id: e.id, source: e.source, target: e.target, label: e.type,
      labelStyle: { fill: "#a1a1aa", fontSize: 10 },
      labelBgStyle: { fill: "#18181b", fillOpacity: 0.9 },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#52525b", width: 14, height: 14 },
      style: { stroke: "#3f3f46", strokeWidth: 1.5 }, animated: false,
    })),
    [graphEdges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  useEffect(() => { setNodes(flowNodes); setEdges(flowEdges); }, [flowNodes, flowEdges, setNodes, setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node); setSelectedNodeId(node.id);
  }, [setSelectedNodeId]);

  const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    router.push(`/workspace/${workspaceId}/entity/${node.id}`);
  }, [router, workspaceId]);

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
  }, []);

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const handleExport = useCallback(() => {
    downloadJson({ nodes: graphNodes, edges: graphEdges }, `graph-${workspaceId}.json`);
  }, [graphNodes, graphEdges, workspaceId]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen(); setIsFullscreen(true);
    } else {
      document.exitFullscreen(); setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const filteredNodes = useMemo(() => {
    if (!searchQuery) return nodes;
    return nodes.filter((n) => (n.data.label as string).toLowerCase().includes(searchQuery.toLowerCase()));
  }, [nodes, searchQuery]);

  const handleTraverse = (nodeId: string) => {
    traverseGraph(nodeId, depthFilter, relationFilter.length > 0 ? relationFilter : undefined);
    setSelectedNode(null);
  };

  const layoutOpts: { value: LayoutType; label: string; icon: typeof Circle }[] = [
    { value: "force", label: "Force-directed", icon: Zap },
    { value: "hierarchical", label: "Hierarchical", icon: GitBranch },
    { value: "circular", label: "Circular", icon: Circle },
  ];

  const closeCtx = () => setContextMenu(null);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-foreground display-heading">Knowledge Graph</h1>
          <p className="mt-0.5 text-step-1 text-muted">
            {graphNodes.length} nodes · {graphEdges.length} edges
            {versionHash && <span className="ml-2 text-muted">v{versionHash.slice(0, 8)}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter nodes..."
              className="w-48 rounded-lg border border-border bg-card py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted focus:border-accent focus:outline-none" />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="h-3 w-3 text-muted hover:text-foreground" />
              </button>
            )}
          </div>
          <div className="relative">
            <button onClick={() => setLayoutOpen(!layoutOpen)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted hover:bg-surface hover:text-foreground">
              <LayoutGrid className="h-3.5 w-3.5" />
              {layoutOpts.find((o) => o.value === layout)?.label}
              <ChevronDown className="h-3 w-3" />
            </button>
            {layoutOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border border-border bg-card p-1 shadow-xl">
                {layoutOpts.map((opt) => (
                  <button key={opt.value}
                    onClick={() => { setLayout(opt.value); setLayoutOpen(false); }}
                    className={cn("flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors",
                      layout === opt.value ? "bg-surface text-foreground" : "text-muted hover:bg-surface/50 hover:text-foreground"
                    )}>
                    <opt.icon className="h-3.5 w-3.5" />{opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={handleExport} className="rounded-lg p-2 text-muted hover:bg-surface hover:text-foreground" title="Export graph">
            <Download className="h-4 w-4" />
          </button>
          <button onClick={toggleFullscreen} className="rounded-lg p-2 text-muted hover:bg-surface hover:text-foreground" title="Fullscreen">
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
          <button onClick={() => setFilterOpen(!filterOpen)}
            className={cn("rounded-lg p-2 transition-colors",
              filterOpen ? "bg-surface text-foreground" : "text-muted hover:bg-surface hover:text-foreground"
            )}>
            <Settings2 className="h-4 w-4" />
          </button>
          <button onClick={() => refreshGraph()} disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-2 disabled:opacity-50">
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />Refresh
          </button>
        </div>
      </div>

      {filterOpen && (
        <GraphFilters depth={depthFilter} onDepthChange={setDepthFilter} relationTypes={relationFilter}
          onRelationTypesChange={setRelationFilter} workspaceId={workspaceId} />
      )}

      <div className="relative flex-1">
        <Suspense fallback={<div className="flex items-center justify-center h-[400px]"><Loader2 className="h-6 w-6 animate-spin text-muted" /></div>}>
        {isLoading && graphNodes.length === 0 ? (
          <div className="flex h-full flex-col p-6 gap-4">
            <div className="flex items-center gap-3"><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-32" /></div>
            <Skeleton variant="rectangular" className="flex-1 w-full rounded-xl" />
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <AlertCircle className="h-8 w-8 text-red-400" />
            <p className="text-step-3 text-muted">{error}</p>
            <button onClick={() => loadGraph()} className="rounded-lg bg-surface px-3 py-1.5 text-xs text-foreground hover:bg-surface-2">Retry</button>
          </div>
        ) : graphNodes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <Zap className="h-10 w-10 text-muted" />
            <p className="text-step-3 text-muted">No graph data available</p>
            <p className="text-step-1 text-muted">Create entities and relations to populate the graph</p>
          </div>
        ) : (
          <ReactFlow nodes={filteredNodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick} onNodeDoubleClick={onNodeDoubleClick} onNodeContextMenu={onNodeContextMenu}
            fitView fitViewOptions={{ padding: 0.2 }} minZoom={0.1} maxZoom={2}
            defaultEdgeOptions={{ type: "smoothstep" }}>
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#27272a" />
            <Controls className="!rounded-lg !border !border-border !bg-card" />
            <MiniMap nodeColor="#27272a" maskColor="rgba(0,0,0,0.7)" className="!rounded-lg !border !border-border !bg-background" />
            {generatedAt && (
              <Panel position="bottom-left">
                <p className="text-[10px] text-muted">Generated {new Date(generatedAt).toLocaleString()}</p>
              </Panel>
            )}
          </ReactFlow>
        )}

        {selectedNode && (
          <div className="absolute right-4 top-4 z-10 w-64">
            <GraphInfoPanel nodeId={selectedNode.id} nodeLabel={String(selectedNode.data.label || "")}
              nodeType={String(selectedNode.data.type || "")} nodeIcon={String(selectedNode.data.icon || "")}
              workspaceId={workspaceId} onClose={() => { setSelectedNode(null); setSelectedNodeId(null); }}
              onTraverse={handleTraverse} />
          </div>
        )}

        {contextMenu && (
          <div className="fixed z-50 w-48 rounded-lg border border-border bg-card p-1 shadow-xl"
            style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { router.push(`/workspace/${workspaceId}/entity/${contextMenu.nodeId}`); closeCtx(); }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-foreground hover:bg-surface hover:text-foreground">
              <ExternalLink className="h-3.5 w-3.5" />Open Entity
            </button>
            <button onClick={() => { handleTraverse(contextMenu.nodeId); closeCtx(); }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-foreground hover:bg-surface hover:text-foreground">
              <Circle className="h-3.5 w-3.5" />Show in Graph
            </button>
            <button onClick={() => { navigator.clipboard.writeText(contextMenu.nodeId); closeCtx(); }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-foreground hover:bg-surface hover:text-foreground">
              <Copy className="h-3.5 w-3.5" />Copy ID
            </button>
          </div>
        )}
        </Suspense>
      </div>
    </div>
  );
}

export default function GraphPage() {
  return (
    <ReactFlowProvider>
      <GraphView />
    </ReactFlowProvider>
  );
}
