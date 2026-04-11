/**
 * Graph page - Interactive force-directed graph of page connections
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as d3 from 'd3';
import { useQuery } from '@tanstack/react-query';
import { getGraphData } from '../api/wiki';

interface GraphNode {
  id: string;
  title: string;
  type: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
}

export function GraphPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const navigate = useNavigate();

  const { data: graphData, isLoading } = useQuery({
    queryKey: ['graph'],
    queryFn: getGraphData,
  });

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: Math.max(500, window.innerHeight - 200),
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Render graph
  useEffect(() => {
    if (!svgRef.current || !graphData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Create container for zoom/pan
    const g = svg.append('g');

    // Color scale for node types
    const colorScale: Record<string, string> = {
      summary: '#f59e0b',
      entity: '#8b5cf6',
      source: '#10b981',
      comparison: '#ec4899',
      synthesis: '#6366f1',
    };

    // Create simulation
    const simulation = d3.forceSimulation(graphData.nodes as GraphNode[])
      .force('link', d3.forceLink<GraphNode, GraphEdge>(graphData.edges as GraphEdge[])
        .id((d) => d.id)
        .distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Draw edges
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(graphData.edges as GraphEdge[])
      .enter()
      .append('line')
      .attr('stroke', '#9ca3af')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1);

    // Draw nodes
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(graphData.nodes)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, GraphNode>()
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
        }));

    // Add circles to nodes
    node.append('circle')
      .attr('r', 12)
      .attr('fill', (d) => colorScale[d.type] || '#6b7280')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Add labels to nodes
    node.append('text')
      .text((d) => d.title)
      .attr('x', 16)
      .attr('y', 4)
      .attr('font-size', '12px')
      .attr('fill', 'currentColor')
      .attr('class', 'text-gray-700 dark:text-gray-300');

    // Click handler
    node.on('click', (_event, d) => {
      navigate(`/page/${d.id}`);
    });

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: GraphEdge) => (d.source as unknown as GraphNode).x!)
        .attr('y1', (d: GraphEdge) => (d.source as unknown as GraphNode).y!)
        .attr('x2', (d: GraphEdge) => (d.target as unknown as GraphNode).x!)
        .attr('y2', (d: GraphEdge) => (d.target as unknown as GraphNode).y!);

      node.attr('transform', (d: GraphNode) => `translate(${d.x},${d.y})`);
    });

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [graphData, dimensions, navigate]);

  if (isLoading) {
    return (
      <div className="card p-8 text-center text-gray-500 dark:text-gray-400">
        Loading graph data...
      </div>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400 mb-4">No graph data available</p>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Add some pages to your wiki to see the connection graph
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Page Graph</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {graphData.nodes.length} pages, {graphData.edges.length} connections
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {Object.entries({
            summary: 'Summaries',
            entity: 'Entities',
            source: 'Sources',
            comparison: 'Comparisons',
            synthesis: 'Syntheses',
          }).map(([type, label]) => (
            <div key={type} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: {
                    summary: '#f59e0b',
                    entity: '#8b5cf6',
                    source: '#10b981',
                    comparison: '#ec4899',
                    synthesis: '#6366f1',
                  }[type],
                }}
              />
              <span className="text-gray-600 dark:text-gray-400">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="card overflow-hidden bg-white dark:bg-gray-800">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="bg-gray-50 dark:bg-gray-900"
        />
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
        Drag nodes to reposition • Scroll to zoom • Click a node to view the page
      </p>
    </div>
  );
}
