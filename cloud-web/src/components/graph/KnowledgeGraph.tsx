'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { Network, Info } from 'lucide-react';
import { useTheme } from '@/app/components/ThemeProvider';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from '@/components/ui/ContextMenu';
import GraphControls from '@/components/graph/GraphControls';
import GraphMinimap from '@/components/graph/GraphMinimap';

export interface GraphNode {
  id: string;
  title: string;
  type?: string;
  group?: number;
  val?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  label?: string;
  weight?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphLink[];
}

interface KnowledgeGraphProps {
  data: GraphData | null;
  loading?: boolean;
  error?: string | null;
  onNodeClick?: (node: GraphNode) => void;
  onRefresh?: () => void;
  className?: string;
}

export default function KnowledgeGraph({
  data,
  loading = false,
  error = null,
  onNodeClick,
  onRefresh,
  className = '',
}: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const [, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [contextMenuNode, setContextMenuNode] = useState<GraphNode | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  type SimNode = GraphNode & d3.SimulationNodeDatum;
  type SimEdgeDatum = d3.SimulationLinkDatum<SimNode> & { label?: string; weight?: number };

  const [minimapNodes, setMinimapNodes] = useState<Array<{ id: string; type?: string; x?: number; y?: number }>>([]);
  const [viewportTransform, setViewportTransform] = useState({ x: 0, y: 0, width: 800, height: 600 });

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    }
  }, []);

  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [updateDimensions]);

  useEffect(() => {
    if (!svgRef.current || !data || !data.nodes.length) return;

    const { width, height } = dimensions;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    const g = svg.append('g');

    const isDark = theme === 'dark' || theme === 'midnight' || theme === 'ocean';
    const nodeColor = isDark ? '#60a5fa' : '#2563eb';
    const nodeHoverColor = isDark ? '#93c5fd' : '#1d4ed8';
    const linkColor = isDark ? '#334155' : '#cbd5e1';
    const textColor = isDark ? '#e2e8f0' : '#1e293b';

    const simEdges: Array<{ source: string; target: string; label?: string; weight?: number }> = data.edges;
    const simulation = d3.forceSimulation<SimNode>(data.nodes as SimNode[])
      .force('link', d3.forceLink<SimNode, SimEdgeDatum>(simEdges).id((d) => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setViewportTransform({
          x: -event.transform.x / event.transform.k,
          y: -event.transform.y / event.transform.k,
          width: width / event.transform.k,
          height: height / event.transform.k,
        });
      });

    svg.call(zoom);

    const link = g.append('g')
      .selectAll('line')
      .data<SimEdgeDatum>(simEdges as unknown as SimEdgeDatum[])
      .join('line')
      .attr('stroke', linkColor)
      .attr('stroke-width', (d) => Math.max(1, Math.min(4, (d.weight || 1) * 2)))
      .attr('stroke-opacity', 0.6);

    const node = g.append('g')
      .selectAll('g')
      .data<SimNode>(data.nodes as SimNode[])
      .join('g') as unknown as d3.Selection<SVGGElement, SimNode, SVGGElement, unknown>;
    node.style('cursor', 'pointer')
      .call(d3.drag<SVGGElement, SimNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    node.append('circle')
      .attr('r', (d: SimNode) => Math.max(6, Math.min(16, (d.val || 1) * 6)))
      .attr('fill', nodeColor)
      .attr('stroke', isDark ? '#1e293b' : '#ffffff')
      .attr('stroke-width', 2);

    node.append('text')
      .text((d: SimNode) => d.title || d.id)
      .attr('x', 0)
      .attr('y', (d: SimNode) => Math.max(6, Math.min(16, (d.val || 1) * 6)) + 14)
      .attr('text-anchor', 'middle')
      .attr('fill', textColor)
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .style('pointer-events', 'none');

    node.on('mouseenter', (event, d) => {
      setHoveredNode(d);
      d3.select(event.currentTarget).select('circle')
        .transition().duration(150)
        .attr('fill', nodeHoverColor)
        .attr('r', Math.max(8, Math.min(20, (d.val || 1) * 7)));
    });

    node.on('mouseleave', (event, d) => {
      setHoveredNode(null);
      d3.select(event.currentTarget).select('circle')
        .transition().duration(150)
        .attr('fill', nodeColor)
        .attr('r', Math.max(6, Math.min(16, ((d as SimNode).val || 1) * 6)));
    });

    node.on('click', (event, d) => {
      event.stopPropagation();
      setSelectedNode(d);
      if (onNodeClick) onNodeClick(d);
    });

    node.on('contextmenu', (event, d) => {
      event.preventDefault();
      event.stopPropagation();
      setContextMenuNode(d);
    });

    svg.on('click', () => {
      setSelectedNode(null);
      setContextMenuNode(null);
    });

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as SimNode).x ?? 0)
        .attr('y1', (d) => (d.source as SimNode).y ?? 0)
        .attr('x2', (d) => (d.target as SimNode).x ?? 0)
        .attr('y2', (d) => (d.target as SimNode).y ?? 0);

      node.attr('transform', (d: SimNode) => `translate(${d.x},${d.y})`);

      setMinimapNodes(
        data.nodes.map((n) => ({ id: n.id, type: n.type, x: (n as SimNode).x, y: (n as SimNode).y }))
      );
    });

    return () => {
      simulation.stop();
    };
  }, [data, dimensions, theme, onNodeClick]);

  const handleZoomIn = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.1, 4]);
    svg.transition().duration(300).call(zoomBehavior.scaleBy, 1.3);
  };

  const handleZoomOut = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.1, 4]);
    svg.transition().duration(300).call(zoomBehavior.scaleBy, 0.7);
  };

  const handleReset = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.1, 4]);
    svg.transition().duration(300).call(zoomBehavior.transform, d3.zoomIdentity);
  };

  const handleFitView = handleReset;

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] border-[3px] border-[var(--border)] bg-[var(--sunken-bg)] ${className}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--foreground)] border-t-transparent animate-spin" />
          <span className="font-mono text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Loading graph...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] border-[3px] border-[var(--border)] bg-[var(--sunken-bg)] ${className}`}>
        <div className="flex flex-col items-center gap-3 text-rose-500">
          <Network size={32} strokeWidth={1.5} />
          <p className="font-mono text-[10px] font-black uppercase tracking-wider">{error}</p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="font-mono text-[10px] font-black uppercase tracking-wider px-3 py-1.5 border-2 border-[var(--foreground)] neo-depth-btn cursor-pointer"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!data || !data.nodes.length) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] border-[3px] border-[var(--border)] bg-[var(--sunken-bg)] ${className}`}>
        <div className="flex flex-col items-center gap-3 text-[var(--muted)]">
          <Network size={40} strokeWidth={1.5} />
          <p className="font-mono text-[10px] font-black uppercase tracking-wider">No graph data</p>
          <p className="font-mono text-[9px] text-[var(--muted)]">Create some pages and entities to see your knowledge graph</p>
        </div>
      </div>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div ref={containerRef} className={`relative ${className}`} style={{ minHeight: 400 }}>
          <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className="w-full" style={{ minHeight: 400 }}>
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
          </svg>

          {contextMenuNode && (
            <ContextMenuContent className="absolute z-50" style={{ top: 0, left: 0 }}>
              <ContextMenuItem onClick={() => {
                if (onNodeClick) onNodeClick(contextMenuNode);
                setContextMenuNode(null);
              }}>
                View Details
              </ContextMenuItem>
              <ContextMenuItem onClick={() => setContextMenuNode(null)}>
                Hide Node
              </ContextMenuItem>
              <ContextMenuItem onClick={() => {
                navigator.clipboard.writeText(contextMenuNode.id);
                setContextMenuNode(null);
              }}>
                Copy ID
              </ContextMenuItem>
            </ContextMenuContent>
          )}

          {selectedNode && (
            <div className="absolute bottom-3 left-3 right-3 p-3 border-2 border-[var(--border)] bg-[var(--card-bg)] shadow-[3px_3px_0px_0px_var(--shadow-color)] max-w-xs z-20">
              <div className="flex items-start gap-2">
                <Info size={14} strokeWidth={2.5} className="shrink-0 mt-0.5 text-[var(--foreground)]" />
                <div className="min-w-0">
                  <p className="font-mono text-[10px] font-black uppercase tracking-wider text-[var(--foreground)] truncate">
                    {selectedNode.title}
                  </p>
                  <p className="font-mono text-[9px] text-[var(--muted)] mt-0.5 font-bold">
                    {selectedNode.type || 'Node'} · {selectedNode.id.slice(0, 8)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <GraphMinimap
            nodes={minimapNodes}
            viewportX={viewportTransform.x}
            viewportY={viewportTransform.y}
            viewportWidth={viewportTransform.width}
            viewportHeight={viewportTransform.height}
            totalWidth={dimensions.width}
            totalHeight={dimensions.height}
          />

          <GraphControls
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onFitView={handleFitView}
          />

          <div className="absolute bottom-3 right-3 font-mono text-[9px] text-[var(--muted)] bg-[var(--card-bg)] px-2 py-1 border border-[var(--border)] z-20">
            {data.nodes.length} nodes · {data.edges.length} edges
          </div>
        </div>
      </ContextMenuTrigger>
    </ContextMenu>
  );
}
