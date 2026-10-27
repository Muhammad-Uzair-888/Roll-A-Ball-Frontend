/**
 * 0/1 Knapsack DP Visualization & Comparison Component for Algorithm Lab
 * Visualizes coin costs and values, the dynamic programming matrix,
 * optimal coin selection, and compares player's score with the algorithmic maximum.
 */

import React from 'react';
import { KnapsackSuccessResponse } from '../../types/api';
import { LevelConfig, LevelCoin } from '../../config/levelConfig';
import { PlayerStats } from '../../game/gameLogic';
import { Coins, Award, Zap, Check, Sparkles } from 'lucide-react';

interface KnapsackViewProps {
  level: LevelConfig;
  result: KnapsackSuccessResponse | null;
  currentStepIndex: number;
  playerStats: PlayerStats;
  budget: number;
  coins: LevelCoin[];
}

export const KnapsackView: React.FC<KnapsackViewProps> = ({
  level,
  result,
  currentStepIndex,
  playerStats,
  budget,
  coins,
}) => {
  const dpTable = result?.trace?.dp_table;
  const selectedCoinIds = new Set(result?.selected_coin_ids || []);

  const playerCollectedCoins = level.coins.filter((c) =>
    playerStats.collectedCoinIds.includes(c.id)
  );
  const playerTotalCost = playerStats.energyUsed;
  const playerScore = playerStats.score;

  return (
    <div className="flex flex-col gap-5">
      {/* Knapsack Metrics Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-950 text-amber-400 border border-amber-800">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              <span>0/1 Knapsack</span>
              <span className="text-xs px-2 py-0.5 rounded font-mono bg-slate-800 text-slate-300 border border-slate-700">
                Budget: {budget}
              </span>
            </div>
          </div>
        </div>

        {result && (
          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 mr-2">Optimal Score:</span>
              <span className="text-amber-400 font-bold text-sm">
                +{result.maximum_score}
              </span>
            </div>
            <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 mr-2">Energy:</span>
              <span className="text-sky-400 font-bold">
                {result.total_cost}/{result.budget}
              </span>
            </div>
            <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 mr-2">Picked:</span>
              <span className="text-emerald-400 font-bold">
                {result.selected_coin_ids.length}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Grid: Coins Table & Interactive DP Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Available Coins List (1 col) */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col">
          <div className="text-xs font-semibold text-slate-200 pb-2 mb-3 border-b border-slate-850 flex items-center justify-between">
            <span>Coins ({coins.length})</span>
            <span className="text-[11px] text-slate-400">Cost / Value</span>
          </div>

          <div className="overflow-y-auto max-h-[340px] space-y-2 pr-1 text-xs">
            {coins.map((coin, idx) => {
              const isSelectedByAlgo = selectedCoinIds.has(coin.id);
              const isPlayerCollected = playerStats.collectedCoinIds.includes(coin.id);
              const isCurrentCoin = currentStepIndex >= 0 && idx === currentStepIndex;

              return (
                <div
                  key={coin.id}
                  className={`p-2.5 rounded-lg border transition-all ${
                    isCurrentCoin
                      ? 'ring-1 ring-amber-400 bg-amber-950/30 border-amber-600'
                      : isSelectedByAlgo
                      ? 'bg-amber-950/20 border-amber-800/80 text-amber-200'
                      : 'bg-slate-900/40 border-slate-850 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: coin.color || '#fbbf24' }}
                      />
                      <span className="font-semibold text-slate-200">{coin.name}</span>
                      <span className="font-mono text-[10px] text-slate-500">({coin.id})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isSelectedByAlgo && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                          OPTIMAL
                        </span>
                      )}
                      {isPlayerCollected && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                          COLLECTED
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-1 text-[11px] font-mono text-slate-400">
                    <span className="flex items-center gap-1 text-sky-400">
                      <Zap className="w-3 h-3" /> {coin.cost}
                    </span>
                    <span className="flex items-center gap-1 text-amber-400 font-bold">
                      <Award className="w-3 h-3" /> {coin.value}
                    </span>
                    <span className="text-slate-500">
                      {(coin.value / Math.max(1, coin.cost)).toFixed(1)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Programming Table Matrix (2 cols) */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col">
          <div className="text-xs font-semibold text-slate-200 pb-2 mb-2 border-b border-slate-850 flex items-center justify-between">
            <span className="font-mono text-slate-400 font-normal">
              DP Matrix
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              0 .. {budget}
            </span>
          </div>

          {dpTable ? (
            <div className="overflow-x-auto overflow-y-auto max-h-[340px] border border-slate-800 rounded-lg">
              <table className="w-full text-center border-collapse font-mono text-xs select-none">
                <thead className="bg-slate-900 sticky top-0 z-10 text-[11px] text-slate-400">
                  <tr>
                    <th className="p-2 border-b border-r border-slate-800 bg-slate-900 sticky left-0 z-20 min-w-[70px]">
                      Item / W
                    </th>
                    {Array.from({ length: budget + 1 }, (_, w) => (
                      <th
                        key={w}
                        className={`p-1.5 border-b border-slate-800 min-w-[32px] ${
                          w === budget ? 'bg-amber-950/40 text-amber-300 font-bold' : ''
                        }`}
                      >
                        {w}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Row 0: Base */}
                  <tr className="hover:bg-slate-900/30">
                    <td className="p-1.5 border-r border-b border-slate-800 bg-slate-900 text-slate-400 sticky left-0 text-left pl-2 font-bold">
                      0
                    </td>
                    {Array.from({ length: budget + 1 }, (_, w) => (
                      <td key={w} className="p-1.5 border-b border-slate-850 text-slate-600">
                        {dpTable[0]?.[w] ?? 0}
                      </td>
                    ))}
                  </tr>

                  {/* Rows 1 to N */}
                  {coins.map((coin, idx) => {
                    const rowIdx = idx + 1;
                    const isCurrentRow = currentStepIndex >= 0 && rowIdx === currentStepIndex + 1;
                    const isChosen = selectedCoinIds.has(coin.id);

                    return (
                      <tr
                        key={coin.id}
                        className={`transition-colors ${
                          isCurrentRow
                            ? 'bg-amber-950/30 font-bold'
                            : isChosen
                            ? 'bg-slate-900/60'
                            : 'hover:bg-slate-900/20'
                        }`}
                      >
                        <td
                          className={`p-1.5 border-r border-b border-slate-800 sticky left-0 text-left pl-2 ${
                            isCurrentRow ? 'bg-amber-900/40 text-amber-300' : 'bg-slate-900 text-slate-300'
                          }`}
                        >
                          <span className="font-bold">{coin.id}</span>
                        </td>

                        {Array.from({ length: budget + 1 }, (_, w) => {
                          const val = dpTable[rowIdx]?.[w] ?? 0;
                          const prevVal = dpTable[rowIdx - 1]?.[w] ?? 0;
                          const changed = typeof val === 'number' && val > prevVal;

                          return (
                            <td
                              key={w}
                              className={`p-1.5 border-b border-slate-850 transition-colors ${
                                w === budget ? 'bg-slate-900/50' : ''
                              } ${
                                changed
                                  ? 'text-amber-400 font-bold bg-amber-500/10'
                                  : 'text-slate-400'
                              }`}
                            >
                              {val}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-[320px] flex items-center justify-center text-slate-600 font-mono text-sm">
              -
            </div>
          )}
        </div>
      </div>

      {/* Comparison Panel: Player vs Optimal */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">Player vs Optimal</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Player choices */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-mono font-bold text-slate-400">Player Coins</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Score: {playerScore}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Cost: {playerTotalCost}
                </span>
              </div>
            </div>

            {playerCollectedCoins.length > 0 ? (
              <div className="flex flex-wrap gap-2 py-2">
                {playerCollectedCoins.map((coin) => (
                  <div
                    key={coin.id}
                    className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 flex items-center gap-1.5 text-xs font-mono text-slate-200"
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: coin.color || '#fbbf24' }}
                    />
                    <span>{coin.name}</span>
                    <span className="text-amber-400 font-bold">+{coin.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-600 py-3 font-mono">-</div>
            )}
          </div>

          {/* Knapsack optimal choice */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-mono font-bold text-amber-400">Optimal Coins</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Score: {result ? result.maximum_score : '-'}
                </span>
                {result && (
                  <span className="text-xs font-mono text-slate-400">
                    Cost: {result.total_cost}/{result.budget}
                  </span>
                )}
                {result && (
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {result.maximum_score - playerScore >= 0
                      ? `+${result.maximum_score - playerScore}`
                      : `${result.maximum_score - playerScore}`}
                  </span>
                )}
              </div>
            </div>

            {result && result.selected_coin_ids.length > 0 ? (
              <div className="flex flex-wrap gap-2 py-2">
                {result.selected_coin_ids.map((id) => {
                  const coin = level.coins.find((c) => c.id === id);
                  return (
                    <div
                      key={id}
                      className="px-2.5 py-1 rounded bg-amber-950/60 border border-amber-800 flex items-center gap-1.5 text-xs font-mono text-amber-200"
                    >
                      <Check className="w-3.5 h-3.5 text-amber-400" />
                      <span>{coin?.name || id}</span>
                      <span className="text-amber-300 font-bold">+{coin?.value ?? ''}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-slate-600 py-3 font-mono">-</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
