/**
 * Game HUD Component
 * Designed with Zero-Viewport Occlusion & Collapsible Bottom Dock.
 * Uses solid/rgba backgrounds (no backdrop-filter over WebGL) and static indicators.
 * Includes configurable respawn modes, level preset selector, and in-game route planning hints.
 */

import React, { useState } from 'react';
import { PlayerStats } from '../../game/gameLogic';
import { LevelConfig, LEVEL_PRESETS, RespawnMode } from '../../config/levelConfig';
import { soundController } from '../../audio/soundEffects';
import { apiClient } from '../../services/apiClient';
import {
  Coins,
  Zap,
  Flag,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Compass,
  MapPin,
  Settings,
} from 'lucide-react';

interface GameHUDProps {
  stats: PlayerStats;
  currentLevel: LevelConfig;
  onStartGame: () => void;
  onPauseGame: () => void;
  onResumeGame: () => void;
  onRestartGame: () => void;
  onOpenLab: () => void;
  onRespawnModeChange: (mode: RespawnMode) => void;
  onSelectLevel: (levelId: string) => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  stats,
  currentLevel,
  onStartGame,
  onPauseGame,
  onResumeGame,
  onRestartGame,
  onOpenLab,
  onRespawnModeChange,
  onSelectLevel,
}) => {
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // In-game route hint state (calls API with include_trace: false)
  const [routeHint, setRouteHint] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState<boolean>(false);

  const toggleSound = () => {
    soundController.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
  };

  const handleRequestRouteHint = async () => {
    setHintLoading(true);
    try {
      const lastVisited = stats.visitedNodeIds[stats.visitedNodeIds.length - 1] || 'S';
      const finishNode = currentLevel.nodes.find((n) => n.isFinish)?.id || 'F';

      const graphNodes = currentLevel.nodes.map((n) => n.id);
      const graphEdges = currentLevel.edges.map((e) => ({
        from: e.from,
        to: e.to,
        weight: e.weight,
      }));

      // In gameplay: include_trace is strictly false / omitted
      const res = await apiClient.solveDijkstra({
        graph: {
          nodes: graphNodes,
          edges: graphEdges,
          blocked_edges: currentLevel.blockedEdges,
        },
        source: lastVisited,
        destination: finishNode,
        include_trace: false,
      });

      if (res.success && res.reachable && res.path.length > 0) {
        setRouteHint(`Optimal path: ${res.path.join(' → ')} (Total Cost: ${res.total_cost})`);
      } else if (res.success && !res.reachable) {
        setRouteHint('No path available from current node.');
      } else if (!res.success) {
        setRouteHint(res.error.message || 'Route calculation failed.');
      }
    } catch {
      setRouteHint('Route calculation service unavailable.');
    } finally {
      setHintLoading(false);
      setTimeout(() => setRouteHint(null), 18000);
    }
  };

  const isPlaying = stats.gameStatus === 'playing';
  const isPaused = stats.gameStatus === 'paused';
  const isReady = stats.gameStatus === 'ready';
  const isCompleted = stats.gameStatus === 'completed';

  const cpCount = stats.activatedCheckpoints.filter(Boolean).length;

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-between p-4 sm:p-6 overflow-hidden">
      {/* Top Bar: Minimal Spec Badge & Stats */}
      <div className="flex items-start justify-between w-full">
        {/* Top-Left: Game Title & Essential Stats */}
        <div className="pointer-events-auto flex flex-col gap-2">
          <div className="bg-slate-900/95 border border-slate-800 rounded-xl px-4 py-2.5 shadow-lg flex items-center gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider font-bold text-sky-400">
                Roll a Ball
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {currentLevel.name.split('&')[0]}
              </div>
            </div>

            <div className="h-6 w-px bg-slate-800" />

            {/* Score */}
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-mono">Score</div>
                <div className="text-sm font-bold font-mono text-white" data-testid="hud-score">
                  {stats.score}
                </div>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-800" />

            {/* Energy */}
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-sky-400" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-mono">Energy</div>
                <div className="text-sm font-bold font-mono text-sky-300" data-testid="hud-energy">
                  {stats.energy}
                </div>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-800" />

            {/* Checkpoints */}
            <div className="flex items-center gap-2">
              <Flag className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-mono">Checkpoints</div>
                <div className="flex items-center gap-1.5 mt-0.5" data-testid="hud-checkpoints">
                  {[1, 2, 3].map((cp, i) => (
                    <span
                      key={cp}
                      className={`w-2.5 h-2.5 rounded-sm transition-colors ${
                        stats.activatedCheckpoints[i]
                          ? 'bg-emerald-400'
                          : 'bg-slate-700'
                      }`}
                      title={`Checkpoint ${cp}`}
                    />
                  ))}
                  <span className="text-xs font-mono font-bold text-slate-300 ml-1">
                    {cpCount}/3
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* HUD Alert Message Banner */}
          {stats.hudMessage && (
            <div
              className="bg-amber-950 border border-amber-500 text-amber-200 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold flex items-center gap-2 shadow-2xl animate-pulse"
              data-testid="hud-alert-message"
            >
              <span>{stats.hudMessage}</span>
            </div>
          )}

          {/* In-Game Route Hint Banner */}
          {routeHint && (
            <div className="bg-sky-950 border border-sky-500 text-sky-100 px-3.5 py-2 rounded-xl text-xs font-mono flex items-center gap-2 shadow-2xl">
              <Compass className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="font-semibold">{routeHint}</span>
              <button
                onClick={() => setRouteHint(null)}
                className="ml-auto px-1.5 py-0.5 rounded text-sky-300 hover:text-white hover:bg-sky-900 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Top-Right: Quick Controls, Settings, & Lab Trigger */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* In-Game Route Assist */}
          <button
            onClick={handleRequestRouteHint}
            disabled={hintLoading}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900/95 border border-slate-800 text-sky-400 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Ask API for optimal path ahead"
          >
            <Compass className={`w-4 h-4 ${hintLoading ? 'animate-spin' : ''}`} />
            <span>Route Hint</span>
          </button>

          {/* Algorithm Lab Button */}
          <button
            onClick={onOpenLab}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-lg shadow-sky-950/50 transition-all cursor-pointer border border-sky-400/30"
          >
            <Sliders className="w-4 h-4" />
            <span className="hidden sm:inline">Algorithm Lab</span>
          </button>

          {/* Configurable Settings */}
          <button
            onClick={() => setShowSettings((s) => !s)}
            aria-label="Settings and Respawn Configuration"
            className="p-2 rounded-xl bg-slate-900/95 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            aria-label={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
            className="p-2 rounded-xl bg-slate-900/95 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-400" />}
          </button>

          {/* Help Toggle */}
          <button
            onClick={() => setShowHelp((h) => !h)}
            aria-label="Toggle Controls Help"
            className="p-2 rounded-xl bg-slate-900/95 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings Panel (Configurable Respawn & Course Presets) */}
      {showSettings && (
        <div className="pointer-events-auto self-center bg-slate-900/95 border border-slate-800 rounded-xl p-5 shadow-2xl max-w-md w-full text-xs text-slate-300 space-y-4">
          <div className="font-bold text-white flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-sky-400" />
              <span>Game & Respawn Rules</span>
            </span>
            <button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-white">✕</button>
          </div>

          {/* Respawn Mode Rule */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-200 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              <span>Configurable Respawn Position on Failure:</span>
            </label>
            <select
              value={stats.respawnMode}
              onChange={(e) => onRespawnModeChange(e.target.value as RespawnMode)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs font-mono"
            >
              <option value="last_checkpoint">Last Activated Checkpoint (Standard)</option>
              <option value="start">Start Bay (Hardcore)</option>
              <option value="cp1">Always Checkpoint 1</option>
              <option value="cp2">Always Checkpoint 2</option>
              <option value="cp3">Always Checkpoint 3</option>
            </select>
            <p className="text-[11px] text-slate-400">
              Determines where the ball respawns when failing into lava or falling off edges.
            </p>
          </div>

          {/* Course Preset Selector */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-200">
              Active Level Configuration:
            </label>
            <select
              value={currentLevel.id}
              onChange={(e) => onSelectLevel(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs font-mono"
            >
              {LEVEL_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400">
              {currentLevel.description}
            </p>
          </div>
        </div>
      )}

      {/* Help Overlay (if open) */}
      {showHelp && (
        <div className="pointer-events-auto self-center bg-slate-900/95 border border-slate-800 rounded-xl p-4 shadow-xl max-w-sm text-xs text-slate-300 space-y-2">
          <div className="font-bold text-white flex items-center justify-between">
            <span>Desktop Controls Guide</span>
            <button onClick={() => setShowHelp(false)} className="text-slate-500 hover:text-white">✕</button>
          </div>
          <p><span className="font-mono text-sky-400 font-bold">W / A / S / D</span> or <span className="font-mono text-sky-400 font-bold">Arrow Keys</span>: Roll the ball</p>
          <p><span className="font-mono text-sky-400 font-bold">Spacebar</span>: Brake / Stabilize ball</p>
          <p>Collect coins to boost score, activate all 3 checkpoints, and reach the finish portal.</p>
        </div>
      )}

      {/* Collapsible Bottom Control Dock */}
      <div className="pointer-events-auto self-center flex flex-col items-center">
        {/* Collapse / Expand Toggle Tab */}
        <button
          onClick={() => setDockCollapsed((c) => !c)}
          aria-label={dockCollapsed ? 'Expand Dock' : 'Collapse Dock'}
          className="px-3 py-1 bg-slate-900/95 border border-b-0 border-slate-800 rounded-t-lg text-[11px] font-mono text-slate-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer shadow-md"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Show Controls</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Hide Controls</span>
            </>
          )}
        </button>

        {/* Unified Bottom Dock */}
        {!dockCollapsed && (
          <div className="bg-slate-900/95 border border-slate-800 rounded-xl px-5 py-3 shadow-2xl flex flex-wrap items-center justify-center gap-4 text-xs">
            {/* Status Indicator */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono text-slate-500">Status:</span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono uppercase ${
                  isPlaying
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : isPaused
                    ? 'bg-amber-950 text-amber-400 border border-amber-800'
                    : isCompleted
                    ? 'bg-purple-950 text-purple-400 border border-purple-800'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
              >
                {stats.gameStatus}
              </span>
            </div>

            <div className="h-5 w-px bg-slate-800" />

            {/* Primary Action Button */}
            {isReady && (
              <button
                onClick={onStartGame}
                className="flex items-center gap-2 px-5 py-2 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Roll</span>
              </button>
            )}

            {isPlaying && (
              <button
                onClick={onPauseGame}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
              >
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </button>
            )}

            {isPaused && (
              <button
                onClick={onResumeGame}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Resume</span>
              </button>
            )}

            {/* Restart Button */}
            <button
              onClick={onRestartGame}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Restart Level"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Level</span>
            </button>

            <div className="h-5 w-px bg-slate-800" />

            {/* Quick Route Info */}
            <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
              <span>Route:</span>
              <span className="text-sky-300 font-bold">
                {stats.visitedNodeIds.join(' → ')}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
