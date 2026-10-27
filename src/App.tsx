/**
 * Roll a Ball - Main Application
 * 3D browser-based game with Three.js and an interactive Algorithm Lab
 */

import React, { useState, useEffect, useCallback } from 'react';
import { GameCanvas } from './game/GameCanvas';
import { GameHUD } from './components/hud/GameHUD';
import { ReadyModal, CompletedModal, FailedModal } from './components/modals/GameModals';
import { AlgorithmLab } from './components/lab/AlgorithmLab';
import { DEFAULT_LEVEL, LEVEL_PRESETS, LevelConfig, RespawnMode } from './config/levelConfig';
import { PlayerStats, createInitialPlayerStats } from './game/gameLogic';

export default function App() {
  const [currentLevel, setCurrentLevel] = useState<LevelConfig>(DEFAULT_LEVEL);

  const [gameStatus, setGameStatus] = useState<
    'ready' | 'playing' | 'paused' | 'completed' | 'failed'
  >('ready');

  const [stats, setStats] = useState<PlayerStats>(() =>
    createInitialPlayerStats(DEFAULT_LEVEL)
  );

  const [isLabOpen, setIsLabOpen] = useState<boolean>(false);
  const [levelKey, setLevelKey] = useState<number>(0);

  // Check URL query parameters: ?autostart=1 or ?openlab=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      setGameStatus('playing');
    }
    if (params.get('openlab') === '1') {
      setIsLabOpen(true);
    }
  }, []);

  const handleStatsUpdate = useCallback((newStats: PlayerStats) => {
    setStats(newStats);
    if (newStats.gameStatus === 'completed') {
      setGameStatus('completed');
    } else if (newStats.gameStatus === 'failed') {
      setGameStatus('failed');
    }
  }, []);

  const handleStartGame = () => {
    setGameStatus('playing');
  };

  const handlePauseGame = () => {
    setGameStatus('paused');
  };

  const handleResumeGame = () => {
    setGameStatus('playing');
  };

  const handleRestartGame = () => {
    setStats(createInitialPlayerStats(currentLevel, stats.respawnMode));
    setGameStatus('playing');
    setLevelKey((k) => k + 1); // Remount canvas for fresh run
  };

  const handleSelectLevel = (levelId: string) => {
    const found = LEVEL_PRESETS.find((p) => p.id === levelId) || DEFAULT_LEVEL;
    setCurrentLevel(found);
    setStats(createInitialPlayerStats(found, stats.respawnMode));
    setGameStatus('playing');
    setLevelKey((k) => k + 1);
  };

  const handleRespawnModeChange = (mode: RespawnMode) => {
    setStats((prev) => ({ ...prev, respawnMode: mode }));
  };

  const handleRespawnOnFailure = () => {
    setStats((prev) => ({
      ...prev,
      energy: Math.max(15, prev.energy + 15),
      gameStatus: 'playing',
    }));
    setGameStatus('playing');
  };

  const handleOpenLab = () => {
    setIsLabOpen(true);
  };

  const handleCloseLab = () => {
    setIsLabOpen(false);
  };

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none"
      data-testid="app-container"
      data-state={gameStatus}
    >
      {/* 3D WebGL Canvas Layer */}
      <GameCanvas
        key={levelKey}
        level={currentLevel}
        gameStatus={gameStatus}
        onStatsUpdate={handleStatsUpdate}
        onFinishReached={() => setGameStatus('completed')}
      />

      {/* Primary HUD Overlay */}
      <GameHUD
        stats={stats}
        currentLevel={currentLevel}
        onStartGame={handleStartGame}
        onPauseGame={handlePauseGame}
        onResumeGame={handleResumeGame}
        onRestartGame={handleRestartGame}
        onOpenLab={handleOpenLab}
        onRespawnModeChange={handleRespawnModeChange}
        onSelectLevel={handleSelectLevel}
      />

      {/* Ready / Start Overlay */}
      <ReadyModal
        isOpen={gameStatus === 'ready'}
        onStart={handleStartGame}
        onOpenLab={handleOpenLab}
      />

      {/* Course Completed Modal */}
      <CompletedModal
        isOpen={gameStatus === 'completed'}
        stats={stats}
        level={currentLevel}
        onRestart={handleRestartGame}
        onOpenLab={handleOpenLab}
      />

      {/* Energy Depleted / Failed Modal */}
      <FailedModal
        isOpen={gameStatus === 'failed'}
        stats={stats}
        level={currentLevel}
        onRespawn={handleRespawnOnFailure}
        onRestart={handleRestartGame}
        onOpenLab={handleOpenLab}
      />

      {/* Algorithm Lab Modal */}
      <AlgorithmLab
        level={currentLevel}
        playerStats={stats}
        isOpen={isLabOpen}
        onClose={handleCloseLab}
        onSelectLevel={handleSelectLevel}
      />
    </div>
  );
}
