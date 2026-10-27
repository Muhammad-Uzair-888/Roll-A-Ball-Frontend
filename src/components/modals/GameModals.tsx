/**
 * Game Overlays and Completion Modals
 */

import React from 'react';
import { PlayerStats, calculatePathCost } from '../../game/gameLogic';
import { LevelConfig } from '../../config/levelConfig';
import { Trophy, Play, Sliders, RotateCcw, CheckCircle, Zap, Coins, Flag } from 'lucide-react';

interface ReadyModalProps {
  isOpen: boolean;
  onStart: () => void;
  onOpenLab: () => void;
}

export const ReadyModal: React.FC<ReadyModalProps> = ({ isOpen, onStart, onOpenLab }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center flex flex-col items-center">
        <h1 className="text-2xl font-black text-white tracking-tight">Roll a Ball</h1>
        <p className="text-xs text-slate-400 mt-2 mb-6">WASD or arrow keys</p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <button
            onClick={onStart}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-900/40 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start</span>
          </button>

          <button
            onClick={onOpenLab}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-sky-400" />
            <span>Algorithm Lab</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface CompletedModalProps {
  isOpen: boolean;
  stats: PlayerStats;
  level: LevelConfig;
  onRestart: () => void;
  onOpenLab: () => void;
}

export const CompletedModal: React.FC<CompletedModalProps> = ({
  isOpen,
  stats,
  level,
  onRestart,
  onOpenLab,
}) => {
  if (!isOpen) return null;

  const pathCost = calculatePathCost(stats.visitedNodeIds, level);
  const cpCount = stats.activatedCheckpoints.filter(Boolean).length;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl text-center flex flex-col items-center">
        {/* Trophy icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-950/50 mb-4">
          <Trophy className="w-8 h-8 text-slate-950" />
        </div>

        <h2 className="text-2xl font-black text-white">Course Completed!</h2>
        <p className="text-xs text-slate-400 mt-1 mb-6">
          You conquered the 3D circuit and reached the finish portal!
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full mb-6 text-center">
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3">
            <Coins className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <div className="text-[10px] text-slate-400 uppercase font-mono">Score</div>
            <div className="text-lg font-bold font-mono text-white">{stats.score}</div>
          </div>

          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3">
            <Zap className="w-4 h-4 text-sky-400 mx-auto mb-1" />
            <div className="text-[10px] text-slate-400 uppercase font-mono">Energy Left</div>
            <div className="text-lg font-bold font-mono text-sky-300">{stats.energy}</div>
          </div>

          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3">
            <Flag className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
            <div className="text-[10px] text-slate-400 uppercase font-mono">Checkpoints</div>
            <div className="text-lg font-bold font-mono text-emerald-300">{cpCount}/3</div>
          </div>

          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3">
            <CheckCircle className="w-4 h-4 text-purple-400 mx-auto mb-1" />
            <div className="text-[10px] text-slate-400 uppercase font-mono">Route Cost</div>
            <div className="text-lg font-bold font-mono text-purple-300">{pathCost}</div>
          </div>
        </div>

        {/* Route taken */}
        <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 mb-6 text-xs text-left">
          <div className="text-slate-400 font-mono mb-1 text-[11px]">Your Route Journey:</div>
          <div className="font-mono text-sky-300 font-bold flex flex-wrap gap-1">
            {stats.visitedNodeIds.join(' → ')}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <button
            onClick={onOpenLab}
            className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-sm font-bold bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-lg transition-all cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
            <span>Compare in Algorithm Lab</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface FailedModalProps {
  isOpen: boolean;
  stats: PlayerStats;
  level: LevelConfig;
  onRespawn: () => void;
  onRestart: () => void;
  onOpenLab: () => void;
}

export const FailedModal: React.FC<FailedModalProps> = ({
  isOpen,
  stats,
  level,
  onRespawn,
  onRestart,
  onOpenLab,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-red-900/60 rounded-2xl p-6 sm:p-8 shadow-2xl text-center flex flex-col items-center">
        {/* Warning Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-600 flex items-center justify-center shadow-lg shadow-red-950/50 mb-4">
          <Zap className="w-8 h-8 text-white" />
        </div>

        <h2 className="text-2xl font-black text-white">Energy Depleted!</h2>
        <p className="text-xs text-slate-400 mt-1 mb-6">
          Your ball ran out of kinetic energy. Respawn at your last checkpoint or restart the circuit.
        </p>

        {/* Stats Summary */}
        <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 mb-6 text-xs text-slate-300 flex justify-around">
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-mono">Score Kept</div>
            <div className="font-bold font-mono text-amber-400">{stats.score}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-mono">Respawn Rule</div>
            <div className="font-bold font-mono text-sky-400 uppercase">{stats.respawnMode}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-mono">Checkpoints</div>
            <div className="font-bold font-mono text-emerald-400">
              {stats.activatedCheckpoints.filter(Boolean).length}/3
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 w-full">
          <button
            onClick={onRespawn}
            className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-sm font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-lg transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Respawn (+15 Energy)</span>
          </button>

          <div className="flex gap-2 w-full">
            <button
              onClick={onRestart}
              className="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
            >
              Restart Course
            </button>
            <button
              onClick={onOpenLab}
              className="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 transition-colors cursor-pointer"
            >
              Algorithm Lab
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
