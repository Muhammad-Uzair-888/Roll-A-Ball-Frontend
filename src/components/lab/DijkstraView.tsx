/**
 * Dijkstra Visualization & Comparison Component for Algorithm Lab
 * Visualizes graph nodes, edge relaxation, distance updates, optimal path,
 * and compares player's route against Dijkstra's optimal route.
 */

import React from 'react';
import { DijkstraSuccessResponse, DijkstraTraceStep } from '../../types/api';
import { LevelConfig } from '../../config/levelConfig';
import { PlayerStats, calculatePathCost } from '../../game/gameLogic';
import { ArrowRight, TrendingUp } from 'lucide-react';

interface DijkstraViewProps {
  level: LevelConfig;
  result: DijkstraSuccessResponse | null;
  currentStepIndex: number;
  playerStats: PlayerStats;
  sourceNode: string;
  destNode: string;
}

export const DijkstraView: React.FC<DijkstraViewProps> = ({
  level,
  result,
  currentStepIndex,
  playerStats,
  sourceNode,
  destNode,
}) => {
  const trace = result?.trace || [];

  // Compute state up to currentStepIndex
  const activeVisitedNodes = new Set<string>();
  const activeDistances: Record<string, number> = {};
  let currentRelaxEdge: { from: string; to: string } | null = null;
  let currentActiveNode: string | null = null;

  for (const n of level.nodes) {
    activeDistances[n.id] = Infinity;
  }

  for (let i = 0; i <= currentStepIndex && i < trace.length; i++) {
    const step = trace[i];
    if (step.event === 'initialize' && step.node) {
      activeDistances[step.node] = 0;
      currentActiveNode = step.node;
    } else if (step.event === 'visit' && step.node && typeof step.distance === 'number') {
      activeVisitedNodes.add(step.node);
      activeDistances[step.node] = step.distance;
      currentActiveNode = step.node;
    } else if (step.event === 'relax_edge' && step.from && step.to && typeof step.new_distance === 'number') {
      activeDistances[step.to] = step.new_distance;
      if (i === currentStepIndex) {
        currentRelaxEdge = { from: step.from, to: step.to };
      }
    }
  }

  const isFinalStep = currentStepIndex >= trace.length - 1;
  const optimalPath = isFinalStep && result?.reachable ? result.path : [];

  // Player route analysis
  const playerPath = playerStats.visitedNodeIds;
  const playerPathCost = calculatePathCost(playerPath, level);
  const dijkstraCost = result?.total_cost ?? null;

  // 2D Layout coordinates for SVG graph projection
  const svgWidth = 620;
  const svgHeight = 420;

  const minZ = -40;
  const maxZ = 42;
  const minX = -19;
  const maxX = 19;

  const getNodePos = (nodeId: string) => {
    const node = level.nodes.find((n) => n.id === nodeId);
    if (!node) return { x: svgWidth / 2, y: svgHeight / 2 };
    const [nx, , nz] = node.position;
    const x = 50 + ((nx - minX) / (maxX - minX)) * (svgWidth - 100);
    const y = 45 + ((nz - minZ) / (maxZ - minZ)) * (svgHeight - 90);
    return { x, y };
  };

  const isEdgeInPath = (u: string, v: string, path: string[]) => {
    for (let i = 0; i < path.length - 1; i++) {
      if ((path[i] === u && path[i + 1] === v) || (path[i] === v && path[i + 1] === u)) {
        return true;
      }
    }
    return false;
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Main Grid: Interactive Graph & Distance Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Graph Visualizer SVG (2 cols) */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col items-center">
          <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-slate-850 text-xs text-slate-400">
            <span className="font-semibold text-slate-200">Network Graph</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Settled</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Relaxing</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Optimal Path</span>
            </div>
          </div>

          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto max-h-[440px] bg-slate-900/60 rounded-lg select-none"
          >
            {/* Edges */}
            {level.edges.map((edge) => {
              const p1 = getNodePos(edge.from);
              const p2 = getNodePos(edge.to);
              const isOptimal = isEdgeInPath(edge.from, edge.to, optimalPath);
              const isRelaxing =
                currentRelaxEdge &&
                ((currentRelaxEdge.from === edge.from && currentRelaxEdge.to === edge.to) ||
                  (currentRelaxEdge.from === edge.to && currentRelaxEdge.to === edge.from));

              let stroke = '#334155';
              let strokeWidth = 2.5;

              if (isOptimal) {
                stroke = '#38bdf8';
                strokeWidth = 4.5;
              } else if (isRelaxing) {
                stroke = '#fbbf24';
                strokeWidth = 4;
              }

              const midX = (p1.x + p2.x) / 2;
              const midY = (p1.y + p2.y) / 2;

              return (
                <g key={`${edge.from}-${edge.to}`}>
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={isRelaxing ? '6,4' : undefined}
                  />
                  {/* Weight Badge */}
                  <rect
                    x={midX - 11}
                    y={midY - 9}
                    width={22}
                    height={18}
                    rx={4}
                    fill="#0f172a"
                    stroke="#334155"
                    strokeWidth={1}
                  />
                  <text
                    x={midX}
                    y={midY + 4}
                    fill="#94a3b8"
                    fontSize={11}
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {edge.weight}
                  </text>
                </g>
              );
            })}

            {/* Nodes */}
            {level.nodes.map((node) => {
              const { x, y } = getNodePos(node.id);
              const isSource = node.id === sourceNode;
              const isVisited = activeVisitedNodes.has(node.id);
              const isCurrent = currentActiveNode === node.id;
              const inPath = optimalPath.includes(node.id);

              let fillColor = '#1e293b';
              let strokeColor = '#475569';
              let r = 18;

              if (inPath) {
                fillColor = '#0369a1';
                strokeColor = '#38bdf8';
                r = 20;
              } else if (isCurrent) {
                fillColor = '#854d0e';
                strokeColor = '#facc15';
                r = 21;
              } else if (isVisited) {
                fillColor = '#065f46';
                strokeColor = '#34d399';
              } else if (isSource) {
                fillColor = '#1e3a8a';
                strokeColor = '#60a5fa';
              }

              const dist = activeDistances[node.id];
              const distLabel = dist === Infinity ? '∞' : dist.toString();

              return (
                <g key={node.id} className="cursor-pointer">
                  {isCurrent && (
                    <circle cx={x} cy={y} r={r + 6} fill="none" stroke="#facc15" strokeWidth={1.5} opacity={0.6} />
                  )}
                  <circle
                    cx={x}
                    cy={y}
                    r={r}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={2.5}
                  />
                  <text
                    x={x}
                    y={y + 4}
                    fill="#ffffff"
                    fontSize={13}
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {node.id}
                  </text>

                  {/* Distance bubble */}
                  <rect
                    x={x - 14}
                    y={y - r - 15}
                    width={28}
                    height={14}
                    rx={3}
                    fill="#020617"
                    stroke={isVisited ? '#10b981' : '#475569'}
                    strokeWidth={1}
                  />
                  <text
                    x={x}
                    y={y - r - 4}
                    fill={isVisited ? '#34d399' : '#cbd5e1'}
                    fontSize={10}
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {distLabel}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Distance Table & Nodes Progress (1 col) */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col">
          <div className="text-xs font-semibold text-slate-200 pb-2 mb-3 border-b border-slate-850 flex items-center justify-between">
            <span>Settled Distance Table</span>
            <span className="text-slate-500 text-[11px] font-mono">
              {activeVisitedNodes.size}/{level.nodes.length}
            </span>
          </div>

          <div className="overflow-y-auto max-h-[380px] space-y-1.5 pr-1 text-xs">
            {level.nodes.map((n) => {
              const d = activeDistances[n.id];
              const isSettled = activeVisitedNodes.has(n.id);
              const inFinalPath = optimalPath.includes(n.id);

              return (
                <div
                  key={n.id}
                  className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                    inFinalPath
                      ? 'bg-sky-950/60 border-sky-800 text-sky-200'
                      : isSettled
                      ? 'bg-emerald-950/30 border-emerald-900/60 text-emerald-200'
                      : 'bg-slate-900/40 border-slate-850 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold w-6 text-center text-slate-200 bg-slate-800 px-1 py-0.5 rounded">
                      {n.id}
                    </span>
                    <span className="truncate max-w-[120px]">{n.name}</span>
                  </div>
                  <div className="font-mono font-bold">
                    {d === Infinity ? (
                      <span className="text-slate-600">∞</span>
                    ) : (
                      <span className={inFinalPath ? 'text-sky-300' : isSettled ? 'text-emerald-400' : 'text-slate-300'}>
                        {d}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Comparison Panel: Player vs Optimal */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-sky-400" />
          <h3 className="text-sm font-semibold text-white">Player vs Optimal</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Player route */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-mono font-bold text-slate-400">Player Route</span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Cost: {playerPathCost}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 py-2 text-sm font-mono text-slate-200">
              {playerPath.length > 0 ? (
                playerPath.map((node, i) => (
                  <React.Fragment key={i}>
                    <span className="px-2.5 py-1 rounded bg-slate-800 font-bold border border-slate-700">
                      {node}
                    </span>
                    {i < playerPath.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-slate-500" />}
                  </React.Fragment>
                ))
              ) : (
                <span className="text-slate-600">-</span>
              )}
            </div>
          </div>

          {/* Optimal route */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-mono font-bold text-sky-400">Optimal Route</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  Cost: {dijkstraCost !== null ? dijkstraCost : '-'}
                </span>
                {dijkstraCost !== null && playerPathCost > 0 && (
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {playerPathCost - dijkstraCost >= 0
                      ? `+${playerPathCost - dijkstraCost}`
                      : `${playerPathCost - dijkstraCost}`}
                  </span>
                )}
              </div>
            </div>
            {result?.reachable && result.path.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5 py-2 text-sm font-mono text-sky-300">
                {result.path.map((node, i) => (
                  <React.Fragment key={i}>
                    <span className="px-2.5 py-1 rounded bg-sky-950 font-bold border border-sky-800">
                      {node}
                    </span>
                    {i < result.path.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-sky-600" />}
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 py-3 font-mono">-</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
