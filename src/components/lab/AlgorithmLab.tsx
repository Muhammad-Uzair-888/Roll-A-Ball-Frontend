/**
 * Algorithm Lab Screen
 * Interactive algorithm trace explorer and player decision comparison
 * for Dijkstra's Shortest Path and 0/1 Knapsack optimization.
 */

import React, { useState, useEffect, useRef } from 'react';
import { LevelConfig, LEVEL_PRESETS } from '../../config/levelConfig';
import { PlayerStats } from '../../game/gameLogic';
import { DijkstraSuccessResponse, KnapsackSuccessResponse } from '../../types/api';
import { apiClient } from '../../services/apiClient';
import { DijkstraView } from './DijkstraView';
import { KnapsackView } from './KnapsackView';
import { soundController } from '../../audio/soundEffects';
import {
  Compass,
  Coins,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  AlertCircle,
  RefreshCw,
  X,
  Sliders,
  Layers,
} from 'lucide-react';

interface AlgorithmLabProps {
  level: LevelConfig;
  playerStats: PlayerStats;
  isOpen: boolean;
  onClose: () => void;
  onSelectLevel?: (levelId: string) => void;
}

export const AlgorithmLab: React.FC<AlgorithmLabProps> = ({
  level,
  playerStats,
  isOpen,
  onClose,
  onSelectLevel,
}) => {
  const [activeTab, setActiveTab] = useState<'dijkstra' | 'knapsack'>('dijkstra');

  // Dijkstra State
  const [sourceNode, setSourceNode] = useState<string>('S');
  const [destNode, setDestNode] = useState<string>('F');
  const [dijkstraResult, setDijkstraResult] = useState<DijkstraSuccessResponse | null>(null);
  const [dijkstraStep, setDijkstraStep] = useState<number>(-1);

  // Knapsack State
  const [budget, setBudget] = useState<number>(level.energyBudget || 15);
  const [knapsackResult, setKnapsackResult] = useState<KnapsackSuccessResponse | null>(null);
  const [knapsackStep, setKnapsackStep] = useState<number>(-1);

  // Reset results when level changes
  useEffect(() => {
    setDijkstraResult(null);
    setDijkstraStep(-1);
    setKnapsackResult(null);
    setKnapsackStep(-1);
    setSourceNode('S');
    const fNode = level.nodes.find((n) => n.isFinish)?.id || 'F';
    setDestNode(fNode);
    setBudget(level.energyBudget || 15);
  }, [level.id]);

  // Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // API Status & Errors
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<'checking' | 'healthy' | 'offline'>('checking');

  // Auto-play interval ref
  const playbackTimerRef = useRef<number | null>(null);

  const checkApi = async () => {
    setHealthStatus('checking');
    try {
      const res = await apiClient.checkHealth();
      if (res && res.status === 'ok') {
        setHealthStatus('healthy');
      } else {
        setHealthStatus('offline');
      }
    } catch {
      setHealthStatus('offline');
    }
  };

  // Health check on open
  useEffect(() => {
    if (!isOpen) return;
    checkApi();
  }, [isOpen]);

  // Handle Auto-Play Stepper
  useEffect(() => {
    if (!isPlaying) {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      return;
    }

    const interval = Math.max(150, 700 / playbackSpeed);

    playbackTimerRef.current = window.setInterval(() => {
      if (activeTab === 'dijkstra') {
        const totalSteps = dijkstraResult?.trace?.length || 0;
        setDijkstraStep((prev) => {
          if (prev + 1 >= totalSteps) {
            setIsPlaying(false);
            return prev;
          }
          soundController.playStepClick();
          return prev + 1;
        });
      } else {
        const totalSteps = level.coins.length;
        setKnapsackStep((prev) => {
          if (prev + 1 >= totalSteps) {
            setIsPlaying(false);
            return prev;
          }
          soundController.playStepClick();
          return prev + 1;
        });
      }
    }, interval);

    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [isPlaying, activeTab, dijkstraResult, playbackSpeed, level.coins.length]);

  if (!isOpen) return null;

  // Run Dijkstra API Request
  const handleRunDijkstra = async () => {
    setIsLoading(true);
    setApiError(null);
    setIsPlaying(false);

    try {
      const graphNodes = level.nodes.map((n) => n.id);
      const graphEdges = level.edges.map((e) => ({
        from: e.from,
        to: e.to,
        weight: e.weight,
      }));

      // Strictly include_trace: true from Algorithm Lab
      const res = await apiClient.solveDijkstra({
        graph: {
          nodes: graphNodes,
          edges: graphEdges,
          blocked_edges: level.blockedEdges,
        },
        source: sourceNode,
        destination: destNode,
        include_trace: true,
      });

      if (res.success) {
        setDijkstraResult(res);
        setDijkstraStep(res.trace && res.trace.length > 0 ? 0 : -1);
        soundController.playStepClick();
      } else {
        setDijkstraResult(null);
        setDijkstraStep(-1);
        setApiError(res.error?.message || 'Dijkstra calculation failed');
      }
    } catch (err: any) {
      setDijkstraResult(null);
      setDijkstraStep(-1);
      setApiError(err?.message || 'Failed to communicate with Algorithm API.');
    } finally {
      setIsLoading(false);
    }
  };

  // Run Knapsack API Request
  const handleRunKnapsack = async () => {
    setIsLoading(true);
    setApiError(null);
    setIsPlaying(false);

    try {
      const apiCoins = level.coins.map((c) => ({
        id: c.id,
        cost: c.cost,
        value: c.value,
      }));

      // Strictly include_trace: true from Algorithm Lab
      const res = await apiClient.solveKnapsack({
        budget,
        coins: apiCoins,
        include_trace: true,
      });

      if (res.success) {
        setKnapsackResult(res);
        setKnapsackStep(0);
        soundController.playStepClick();
      } else {
        setKnapsackResult(null);
        setKnapsackStep(-1);
        setApiError(res.error?.message || 'Knapsack calculation failed');
      }
    } catch (err: any) {
      setKnapsackResult(null);
      setKnapsackStep(-1);
      setApiError(err?.message || 'Failed to communicate with Algorithm API.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step Forward
  const handleStepForward = () => {
    if (activeTab === 'dijkstra') {
      const total = dijkstraResult?.trace?.length || 0;
      if (dijkstraStep < total - 1) {
        setDijkstraStep((s) => s + 1);
        soundController.playStepClick();
      }
    } else {
      const total = level.coins.length;
      if (knapsackStep < total) {
        setKnapsackStep((s) => s + 1);
        soundController.playStepClick();
      }
    }
  };

  // Step Backward
  const handleStepBack = () => {
    if (activeTab === 'dijkstra') {
      if (dijkstraStep > 0) {
        setDijkstraStep((s) => s - 1);
        soundController.playStepClick();
      }
    } else {
      if (knapsackStep > 0) {
        setKnapsackStep((s) => s - 1);
        soundController.playStepClick();
      }
    }
  };

  // Reset: resets visualization ONLY, not the game
  const handleResetVisualization = () => {
    setIsPlaying(false);
    if (activeTab === 'dijkstra') {
      setDijkstraStep(dijkstraResult?.trace?.length ? 0 : -1);
    } else {
      setKnapsackStep(0);
    }
    soundController.playStepClick();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lab-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto"
    >
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-md">
              <Sliders className="w-5 h-5" />
            </div>
            <h2 id="lab-title" className="text-lg font-bold text-white">
              Algorithm Lab
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Level Preset Selector */}
            {onSelectLevel && (
              <div className="hidden md:flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-xs font-mono">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                <select
                  value={level.id}
                  onChange={(e) => onSelectLevel(e.target.value)}
                  className="bg-transparent text-slate-300 text-xs focus:outline-none cursor-pointer"
                >
                  {LEVEL_PRESETS.map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                      {p.name.split('(')[0]}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* API Health indicator */}
            {healthStatus === 'healthy' ? (
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-full">
                API connected
              </span>
            ) : healthStatus === 'offline' ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono text-red-400 bg-red-950/60 border border-red-800/80 px-2.5 py-1 rounded-full">
                  API unreachable
                </span>
                <button
                  onClick={checkApi}
                  className="px-2 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : (
              <span className="text-xs font-mono text-slate-400">Checking...</span>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              aria-label="Close Algorithm Lab"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="px-5 pt-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setActiveTab('dijkstra');
                setIsPlaying(false);
                setApiError(null);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer ${
                activeTab === 'dijkstra'
                  ? 'border-sky-500 text-sky-400 bg-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Dijkstra Shortest Path</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('knapsack');
                setIsPlaying(false);
                setApiError(null);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer ${
                activeTab === 'knapsack'
                  ? 'border-amber-500 text-amber-400 bg-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Coins className="w-4 h-4" />
              <span>0/1 Knapsack Optimizer</span>
            </button>
          </div>

          {/* Quick Param Selectors without truncation */}
          <div className="hidden md:flex items-center gap-3 py-1 text-xs">
            {activeTab === 'dijkstra' ? (
              <div className="flex items-center gap-2 font-mono">
                <span className="text-slate-500">Route:</span>
                <select
                  value={sourceNode}
                  onChange={(e) => setSourceNode(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                >
                  {level.nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.id} - {n.name}
                    </option>
                  ))}
                </select>
                <span className="text-slate-500">to</span>
                <select
                  value={destNode}
                  onChange={(e) => setDestNode(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                >
                  {level.nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.id} - {n.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2 font-mono">
                <span className="text-slate-500">Budget:</span>
                <input
                  type="range"
                  min="5"
                  max="30"
                  value={budget}
                  onChange={(e) => setBudget(parseInt(e.target.value, 10))}
                  className="w-24 accent-amber-500 cursor-pointer"
                />
                <span className="text-amber-400 font-bold w-6">{budget}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="px-5 py-3 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {activeTab === 'dijkstra' ? (
              <button
                onClick={handleRunDijkstra}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-50 transition-all shadow-md cursor-pointer"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                <span>Run Dijkstra</span>
              </button>
            ) : (
              <button
                onClick={handleRunKnapsack}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50 transition-all shadow-md cursor-pointer"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                <span>Run Knapsack</span>
              </button>
            )}

            {/* Stepper Controls with step counter */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
              <button
                onClick={() => setIsPlaying((p) => !p)}
                disabled={
                  activeTab === 'dijkstra' ? !dijkstraResult : !knapsackResult
                }
                title={isPlaying ? 'Pause Auto-Play' : 'Play Step Trace'}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>

              <button
                onClick={handleStepBack}
                disabled={
                  activeTab === 'dijkstra'
                    ? dijkstraStep <= 0
                    : knapsackStep <= 0
                }
                title="Step Backward"
                className="px-2.5 py-1 rounded-lg text-xs font-mono text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
              >
                Prev
              </button>

              <button
                onClick={handleStepForward}
                disabled={
                  activeTab === 'dijkstra'
                    ? !dijkstraResult || dijkstraStep >= (dijkstraResult.trace?.length || 0) - 1
                    : !knapsackResult || knapsackStep >= level.coins.length
                }
                title="Step Forward"
                className="px-2.5 py-1 rounded-lg text-xs font-mono text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Next</span>
                <SkipForward className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleResetVisualization}
                title="Reset visualization trace"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <span className="px-2.5 text-xs font-mono text-slate-300 border-l border-slate-800 ml-1">
                {activeTab === 'dijkstra'
                  ? dijkstraResult && dijkstraResult.trace
                    ? `${dijkstraStep + 1} / ${dijkstraResult.trace.length}`
                    : '0 / 0'
                  : knapsackResult
                  ? `${Math.min(knapsackStep + 1, level.coins.length)} / ${level.coins.length}`
                  : '0 / 0'}
              </span>
            </div>

            {/* Speed Toggle */}
            <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-slate-400 ml-2">
              <span>Speed:</span>
              {[1, 2, 4].map((s) => (
                <button
                  key={s}
                  onClick={() => setPlaybackSpeed(s)}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    playbackSpeed === s
                      ? 'bg-slate-800 text-sky-400 font-bold border border-slate-700'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error Toast / Alert with Retry */}
        {apiError && (
          <div className="mx-5 mt-4 p-4 rounded-xl bg-red-950/80 border border-red-800 text-red-200 flex items-start justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>{apiError}</div>
            </div>
            <button
              onClick={activeTab === 'dijkstra' ? handleRunDijkstra : handleRunKnapsack}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-900/60 hover:bg-red-800 border border-red-700 text-white font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Viewport Content */}
        <div className="p-5 overflow-y-auto flex-1">
          {activeTab === 'dijkstra' ? (
            <DijkstraView
              level={level}
              result={dijkstraResult}
              currentStepIndex={dijkstraStep}
              playerStats={playerStats}
              sourceNode={sourceNode}
              destNode={destNode}
            />
          ) : (
            <KnapsackView
              level={level}
              result={knapsackResult}
              currentStepIndex={knapsackStep}
              playerStats={playerStats}
              budget={budget}
              coins={level.coins}
            />
          )}
        </div>
      </div>
    </div>
  );
};
