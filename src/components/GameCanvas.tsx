'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { GameState, InputState, JoystickState } from '@/game/types';
import { createInitialState, createInputState, createJoystickState } from '@/game/init';
import { updateGame } from '@/game/update';
import { render } from '@/game/render';
import { setupKeyboardListeners } from '@/game/input';
import { MAP_WIDTH, MAP_HEIGHT, MAX_SUSPICION, WARNING_THRESHOLD, COLORS, LEVEL_SPECS, UPGRADE_COSTS, MAX_CARRY_CAPACITY, CARRY_CAPACITY, LOSE_THRESHOLD, SPRINT_DURATION, NO_ICE_DURATION } from '@/game/config';
import { resetIceTimer } from '@/game/update';
import { Upgrades } from '@/game/types';
import { useAudio } from '@/hooks/useAudio';

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState>(createInitialState());
  const inputStateRef = useRef<InputState>(createInputState());
  const joystickStateRef = useRef<JoystickState>(createJoystickState());
  const lastTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const gameTimeRef = useRef<number>(0);

  const [displayState, setDisplayState] = useState<GameState>(gameStateRef.current);
  const [currentLevel, setCurrentLevel] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showShop, setShowShop] = useState<boolean>(false);

  const [persistentUpgrades, setPersistentUpgrades] = useState<Upgrades>({ carryCapacity: 0 });
  const [persistentFunding, setPersistentFunding] = useState<number>(0);
  const [isProgressLoaded, setIsProgressLoaded] = useState<boolean>(false);

  // Audio system
  const { playTrack, toggleMute, isMuted } = useAudio();

  useEffect(() => {
    try {
      const savedProgress = localStorage.getItem('qlearn_progress');
      if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        if (progress.upgrades) setPersistentUpgrades(progress.upgrades);
        if (progress.funding !== undefined) setPersistentFunding(progress.funding);
        if (progress.level !== undefined) {
          const validLevel = Math.max(0, Math.min(progress.level, LEVEL_SPECS.length - 1));
          setCurrentLevel(validLevel);
        }
      }
    } catch { /* ignore */ }
    setIsProgressLoaded(true);
  }, []);

  useEffect(() => {
    if (!isProgressLoaded) return;
    try {
      localStorage.setItem('qlearn_progress', JSON.stringify({
        upgrades: persistentUpgrades,
        funding: persistentFunding,
        level: currentLevel,
      }));
    } catch { /* ignore */ }
  }, [persistentUpgrades, persistentFunding, currentLevel, isProgressLoaded]);

  // Switch music based on game phase
  useEffect(() => {
    if (displayState.phase === 'menu') {
      playTrack('menu');
    } else if (displayState.phase === 'playing') {
      playTrack('gameplay');
    } else if (displayState.phase === 'win' || displayState.phase === 'lose') {
      playTrack('menu'); // Return to chill music on end screens
    }
  }, [displayState.phase, playTrack]);

  const handleStart = useCallback(() => {
    resetIceTimer();
    gameStateRef.current = createInitialState(currentLevel, persistentUpgrades, persistentFunding);
    gameStateRef.current.phase = 'playing';
    setDisplayState({ ...gameStateRef.current });
  }, [currentLevel, persistentUpgrades, persistentFunding]);

  const handleRestart = useCallback(() => {
    resetIceTimer();
    const currentLevel = gameStateRef.current.level;
    setPersistentFunding(gameStateRef.current.totalFunding);
    gameStateRef.current = createInitialState(currentLevel, persistentUpgrades, gameStateRef.current.totalFunding);
    gameStateRef.current.phase = 'playing';
    setDisplayState({ ...gameStateRef.current });
  }, [persistentUpgrades]);

  const handleNextLevel = useCallback(() => {
    const nextLevel = Math.min(gameStateRef.current.level + 1, LEVEL_SPECS.length - 1);
    setCurrentLevel(nextLevel);
    resetIceTimer();
    setPersistentFunding(gameStateRef.current.totalFunding);
    gameStateRef.current = createInitialState(nextLevel, persistentUpgrades, gameStateRef.current.totalFunding);
    gameStateRef.current.phase = 'playing';
    setDisplayState({ ...gameStateRef.current });
  }, [persistentUpgrades]);

  const handleMenu = useCallback(() => {
    setPersistentFunding(gameStateRef.current.totalFunding);
    gameStateRef.current = createInitialState(currentLevel, persistentUpgrades, gameStateRef.current.totalFunding);
    gameStateRef.current.phase = 'menu';
    setDisplayState({ ...gameStateRef.current });
  }, [persistentUpgrades, currentLevel]);

  const handleResetProgress = useCallback(() => {
    if (confirm('Reset all progress? This will erase your upgrades, funding, and level progress.')) {
      localStorage.removeItem('qlearn_progress');
      setPersistentUpgrades({ carryCapacity: 0 });
      setPersistentFunding(0);
      setCurrentLevel(0);
      gameStateRef.current = createInitialState(0);
      gameStateRef.current.phase = 'menu';
      setDisplayState({ ...gameStateRef.current });
    }
  }, []);

  const handleBuyCapacity = useCallback(() => {
    const currentCapacity = CARRY_CAPACITY + persistentUpgrades.carryCapacity;
    if (currentCapacity >= MAX_CARRY_CAPACITY) return;
    const availableFunding = gameStateRef.current.phase === 'playing'
      ? gameStateRef.current.totalFunding : persistentFunding;
    if (availableFunding < UPGRADE_COSTS.carryCapacity) return;

    const newUpgrades = { ...persistentUpgrades, carryCapacity: persistentUpgrades.carryCapacity + 1 };
    const newFunding = availableFunding - UPGRADE_COSTS.carryCapacity;
    setPersistentUpgrades(newUpgrades);
    setPersistentFunding(newFunding);

    if (gameStateRef.current.phase === 'menu') {
      gameStateRef.current = createInitialState(currentLevel, newUpgrades, newFunding);
      gameStateRef.current.phase = 'menu';
      setDisplayState({ ...gameStateRef.current });
    } else if (gameStateRef.current.phase === 'playing') {
      gameStateRef.current.totalFunding = newFunding;
      gameStateRef.current.upgrades = newUpgrades;
      gameStateRef.current.player.carryCapacity = CARRY_CAPACITY + newUpgrades.carryCapacity;
      setDisplayState({ ...gameStateRef.current });
    }
  }, [persistentUpgrades, persistentFunding, currentLevel]);

  const handleBuySprint = useCallback(() => {
    if (gameStateRef.current.phase !== 'playing') return;
    if (gameStateRef.current.totalFunding < UPGRADE_COSTS.sprint) return;
    if (gameStateRef.current.sprintTimer > 0) return;
    gameStateRef.current.totalFunding -= UPGRADE_COSTS.sprint;
    gameStateRef.current.sprintTimer = SPRINT_DURATION;
    setPersistentFunding(gameStateRef.current.totalFunding);
    setDisplayState({ ...gameStateRef.current });
  }, []);

  const handleBuyNoIce = useCallback(() => {
    if (gameStateRef.current.phase !== 'playing') return;
    if (gameStateRef.current.totalFunding < UPGRADE_COSTS.noIce) return;
    if (gameStateRef.current.noIceTimer > 0) return;
    gameStateRef.current.totalFunding -= UPGRADE_COSTS.noIce;
    gameStateRef.current.noIceTimer = NO_ICE_DURATION;
    setPersistentFunding(gameStateRef.current.totalFunding);
    setDisplayState({ ...gameStateRef.current });
  }, []);

  const handleJoystickMove = useCallback((dx: number, dy: number) => {
    joystickStateRef.current = { active: true, dx, dy };
  }, []);

  const handleJoystickEnd = useCallback(() => {
    joystickStateRef.current = { active: false, dx: 0, dy: 0 };
  }, []);

  useEffect(() => {
    const isPlayingRef = { current: false };
    const checkPlaying = () => { isPlayingRef.current = gameStateRef.current.phase === 'playing'; };
    const interval = setInterval(checkPlaying, 100);
    const cleanup = setupKeyboardListeners(inputStateRef, isPlayingRef);
    return () => { clearInterval(interval); cleanup(); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = (timestamp: number) => {
      const deltaTime = Math.min(lastTimeRef.current ? timestamp - lastTimeRef.current : 16, 50);
      lastTimeRef.current = timestamp;
      gameTimeRef.current += deltaTime;

      if (gameStateRef.current.phase === 'playing' && !isPaused) {
        gameStateRef.current = updateGame(gameStateRef.current, inputStateRef.current, joystickStateRef.current, deltaTime);
      }
      render(ctx, gameStateRef.current, gameTimeRef.current);
      if (timestamp % 33 < 16) setDisplayState({ ...gameStateRef.current });
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [isPaused]);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (gameStateRef.current.phase !== 'playing') return;
    e.preventDefault();
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || gameStateRef.current.phase !== 'playing') return;
    e.preventDefault();
    const touch = e.touches[0];
    const sensitivity = Math.min(80, Math.max(30, window.innerWidth / 12));
    const dx = (touch.clientX - touchStartRef.current.x) / sensitivity;
    const dy = (touch.clientY - touchStartRef.current.y) / sensitivity;
    handleJoystickMove(Math.max(-1, Math.min(1, dx)), Math.max(-1, Math.min(1, dy)));
  }, [handleJoystickMove]);

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null;
    handleJoystickEnd();
  }, [handleJoystickEnd]);

  const isWin = displayState.phase === 'win';
  const isLose = displayState.phase === 'lose';
  const suspicionPercent = Math.min(100, (displayState.suspicion / MAX_SUSPICION) * 100);

  const [isMobilePortrait, setIsMobilePortrait] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      setIsMobilePortrait(window.innerWidth < 768 && window.innerHeight > window.innerWidth);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  return (
    <div
      className="fixed inset-0 overflow-hidden select-none"
      style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
      role="application"
      aria-label="Q-Learn Daycare Simulator Game"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Game canvas */}
      <div className={`absolute inset-0 flex items-center justify-center ${displayState.phase === 'menu' ? 'hidden' : ''}`}>
        <canvas
          ref={canvasRef}
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          className="max-w-full max-h-full shadow-2xl rounded-lg"
          style={{
            imageRendering: 'pixelated',
            width: isMobilePortrait ? '100%' : 'auto',
            height: isMobilePortrait ? 'auto' : '100%',
          }}
          aria-label="Game canvas - use arrow keys or WASD to move"
          tabIndex={0}
        />
      </div>

      {/* === MENU === */}
      {displayState.phase === 'menu' && (
        <div className="absolute inset-0 flex items-center justify-center overflow-auto p-4"
             style={{ background: '#B8D4E8' }}>
          {/* Clipboard */}
          <div className="relative w-full max-w-[420px] fade-in">
            {/* Clipboard decorations */}
            <div className="absolute -top-2 left-4 w-5 h-5 rounded-full" style={{ background: '#4A90D9' }} />
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full" style={{ background: '#4A90D9' }} />
            <div className="absolute -top-2 right-4 w-5 h-5 rounded-full bg-white" />
            <div className="absolute top-16 -right-1 w-3 h-12 rounded-sm rotate-12"
                 style={{ background: 'linear-gradient(180deg, #d4a574 0%, #c4956a 50%, #ff6b6b 50%, #ff6b6b 100%)' }} />
            <div className="absolute top-8 right-8 text-blue-300/50 text-sm">✦</div>

            {/* Clipboard board */}
            <div className="rounded-2xl p-4 pt-6" style={{ background: '#B87333', border: '4px solid #8B4513' }}>
              {/* Header Card */}
              <div className="rounded-xl p-4 mb-3 text-center relative" style={{ background: '#4A90D9' }}>
                <div className="absolute top-2 left-3 text-yellow-300 text-sm">★</div>
                <div className="absolute top-2 right-3 text-blue-200/40 text-xs">✦</div>
                <h1 className="text-3xl font-black text-white" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                  Learing™
                </h1>
                <p className="text-white/90 text-sm font-medium">Somali Daycare Simulator</p>
                <p className="text-white/70 text-xs mt-1">&quot;Nabad iyo caano&quot; ☆ Peace &amp; Prosperity</p>
              </div>

              {/* How to Play Card */}
              <div className="rounded-xl p-3 mb-3" style={{ background: '#FFD93D' }}>
                <h2 className="text-gray-800 font-bold text-sm mb-2 flex items-center justify-center gap-2">
                  <span className="text-lg">📋</span> How to Play
                </h2>
                <ul className="text-gray-700 text-sm space-y-1">
                  <li>• WASD / Arrows / Touch to move</li>
                  <li>• Collect enrollment forms from classrooms</li>
                  <li>• Drop forms at the Office desk</li>
                  <li>• HIDE in rooms when ICE patrols! 🚨</li>
                </ul>
              </div>

              {/* Pink Banner */}
              <div className="rounded-lg p-2 mb-3 text-center" style={{ background: '#FFB6C1' }}>
                <p className="text-red-600 text-sm font-medium">
                  ❄️ ICE agents have NO jurisdiction over love ❄️
                </p>
              </div>

              {/* Level Card */}
              <div className="rounded-xl p-3 mb-3 text-center" style={{ background: '#4A90D9' }}>
                <p className="text-white font-bold text-lg flex items-center justify-center gap-2">
                  <span>🏫</span> {LEVEL_SPECS[currentLevel]?.name || 'Unknown'}
                </p>
                <p className="text-white/80 text-sm">Level {currentLevel + 1} of {LEVEL_SPECS.length}</p>
              </div>

              {/* Upgrades Card */}
              <div className="rounded-xl p-3 mb-3" style={{ background: '#5BC67E' }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-800 font-bold text-sm flex items-center gap-1">
                    <span>💰</span> Upgrades
                  </span>
                  <span className="px-3 py-1 bg-blue-500 rounded-lg text-white text-sm font-bold">
                    ${persistentFunding}
                  </span>
                </div>
                <button
                  onClick={handleBuyCapacity}
                  disabled={persistentFunding < UPGRADE_COSTS.carryCapacity || CARRY_CAPACITY + persistentUpgrades.carryCapacity >= MAX_CARRY_CAPACITY}
                  className={`w-full p-2 rounded-lg font-bold text-sm transition-all ${
                    persistentFunding >= UPGRADE_COSTS.carryCapacity && CARRY_CAPACITY + persistentUpgrades.carryCapacity < MAX_CARRY_CAPACITY
                      ? 'bg-emerald-300 text-emerald-700 hover:bg-emerald-200 active:scale-[0.98]'
                      : 'bg-emerald-300/50 text-emerald-600/50 cursor-not-allowed'
                  }`}
                >
                  +1 Capacity (${UPGRADE_COSTS.carryCapacity}) — {CARRY_CAPACITY + persistentUpgrades.carryCapacity}/{MAX_CARRY_CAPACITY}
                </button>
              </div>

              {/* Start Button - with border frame */}
              <div className="rounded-xl p-1" style={{ background: '#4A90D9' }}>
                <button
                  onClick={handleStart}
                  className="w-full py-4 text-white text-xl font-black rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: '#5B9FE8' }}
                >
                  ▶ START SHIFT
                </button>
              </div>

              {/* Footer */}
              <p className="text-white text-sm text-center mt-3 font-bold">
                Get suspicion below {LOSE_THRESHOLD}% to pass inspection!
              </p>
              <p className="text-white/70 text-xs text-center mt-1 italic">
                &quot;They can deport people, but they can&apos;t deport community&quot;
              </p>

              {/* Music Toggle */}
              <button
                onClick={toggleMute}
                className="w-full mt-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                style={{ background: isMuted ? 'rgba(255,255,255,0.2)' : '#4A90D9', color: 'white' }}
              >
                {isMuted ? '🔇 Music Off' : '🎵 Music On'}
              </button>

              <button
                onClick={handleResetProgress}
                className="w-full mt-2 py-2 text-white/50 text-xs hover:text-white/80 transition-colors underline"
              >
                Reset Progress
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === HUD === */}
      {displayState.phase === 'playing' && (
        <>
          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 p-3 slide-down"
               style={{
                 paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 8px))',
                 paddingLeft: 'max(12px, env(safe-area-inset-left))',
                 paddingRight: 'max(12px, env(safe-area-inset-right))',
               }}>
            <div className="flex justify-between items-start gap-2">
              {/* Stats */}
              <div className="flex gap-2 flex-wrap">
                <div className="badge glass-dark text-white">
                  {LEVEL_SPECS[displayState.level]?.name || 'Unknown'}
                </div>
                <div className="badge text-white" style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}>
                  ${displayState.totalFunding}
                </div>
                <div className="badge glass-dark text-white">
                  📋 {displayState.player.carrying}/{displayState.player.carryCapacity}
                </div>
                {displayState.sprintTimer > 0 && (
                  <div className="badge animate-pulse" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#000' }}>
                    ⚡ {Math.ceil(displayState.sprintTimer)}s
                  </div>
                )}
                {displayState.noIceTimer > 0 && (
                  <div className="badge animate-pulse" style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)' }}>
                    🛡️ {Math.ceil(displayState.noIceTimer)}s
                  </div>
                )}
              </div>

              {/* Timer & Controls */}
              <div className="flex gap-2 items-center">
                <button
                  onClick={toggleMute}
                  className="badge glass-dark text-white hover:bg-white/20 transition-colors cursor-pointer"
                  title={isMuted ? 'Unmute music' : 'Mute music'}
                >
                  {isMuted ? '🔇' : '🎵'}
                </button>
                <button
                  onClick={() => setIsPaused(true)}
                  className="badge glass-dark text-white hover:bg-white/20 transition-colors cursor-pointer"
                >
                  ⏸
                </button>
                <div className="badge glass-dark text-white font-mono text-base tabular-nums">
                  {Math.ceil(displayState.timeRemaining)}s
                </div>
              </div>
            </div>
          </div>

          {/* Suspicion Bar */}
          <div className="absolute bottom-0 left-0 right-0 p-3 slide-up"
               style={{
                 paddingBottom: 'max(16px, calc(env(safe-area-inset-bottom) + 12px))',
                 paddingLeft: 'max(12px, env(safe-area-inset-left))',
                 paddingRight: 'max(12px, env(safe-area-inset-right))',
               }}>
            <div className="glass-dark rounded-xl p-3">
              <div className="flex items-center gap-3">
                <span className="text-white/60 text-xs font-medium uppercase tracking-wider">Suspicion</span>
                <div className="flex-1 h-3 bg-black/30 rounded-full overflow-hidden relative">
                  <div
                    className="absolute inset-y-0 left-0 transition-all duration-300 rounded-full"
                    style={{
                      width: `${suspicionPercent}%`,
                      background: suspicionPercent > WARNING_THRESHOLD
                        ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'
                        : suspicionPercent > LOSE_THRESHOLD
                          ? 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)'
                          : 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)',
                    }}
                  />
                  <div className="absolute inset-y-0 w-0.5 bg-white/50" style={{ left: `${LOSE_THRESHOLD}%` }} />
                </div>
                <span className={`text-sm font-bold tabular-nums ${
                  suspicionPercent > WARNING_THRESHOLD ? 'text-red-400' :
                  suspicionPercent > LOSE_THRESHOLD ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {Math.floor(displayState.suspicion)}%
                </span>
              </div>
              <div className="text-white/40 text-[10px] text-center mt-1">
                Goal: ≤{LOSE_THRESHOLD}%
              </div>
            </div>
          </div>

          {/* Pause Menu */}
          {isPaused && !showShop && (
            <div className="absolute inset-0 flex items-center justify-center p-4 fade-in"
                 style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
              <div className="card p-6 w-full max-w-[300px] bounce-in">
                <h2 className="text-2xl font-black text-center mb-6 text-gray-800">PAUSED</h2>
                <div className="space-y-3">
                  <button onClick={() => setIsPaused(false)} className="w-full py-3 text-white font-bold rounded-xl btn-success">
                    ▶ RESUME
                  </button>
                  <button onClick={() => setShowShop(true)} className="w-full py-3 font-bold rounded-xl btn-warning text-gray-900">
                    🛒 SHOP (${displayState.totalFunding})
                  </button>
                  <button
                    onClick={() => { setIsPaused(false); handleMenu(); }}
                    className="w-full py-3 font-bold rounded-xl bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                  >
                    ← MAIN MENU
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Shop */}
          {isPaused && showShop && (
            <div className="absolute inset-0 flex items-center justify-center p-4 fade-in"
                 style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
              <div className="card p-6 w-full max-w-[340px] bounce-in">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-black text-gray-800">SHOP</h2>
                  <span className="px-3 py-1.5 rounded-full font-bold text-white text-sm"
                        style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}>
                    ${displayState.totalFunding}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <button
                    onClick={handleBuyCapacity}
                    disabled={displayState.totalFunding < UPGRADE_COSTS.carryCapacity || displayState.player.carryCapacity >= MAX_CARRY_CAPACITY}
                    className={`w-full p-4 rounded-xl text-left transition-all ${
                      displayState.totalFunding >= UPGRADE_COSTS.carryCapacity && displayState.player.carryCapacity < MAX_CARRY_CAPACITY
                        ? 'bg-green-500 text-white hover:bg-green-600 shadow-lg'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex justify-between font-bold">
                      <span>📋 +1 Form Capacity</span>
                      <span>${UPGRADE_COSTS.carryCapacity}</span>
                    </div>
                    <div className="text-xs opacity-80 mt-1">{displayState.player.carryCapacity}/{MAX_CARRY_CAPACITY} slots</div>
                  </button>

                  <button
                    onClick={handleBuySprint}
                    disabled={displayState.totalFunding < UPGRADE_COSTS.sprint || displayState.sprintTimer > 0}
                    className={`w-full p-4 rounded-xl text-left transition-all ${
                      displayState.totalFunding >= UPGRADE_COSTS.sprint && displayState.sprintTimer <= 0
                        ? 'bg-amber-500 text-gray-900 hover:bg-amber-600 shadow-lg'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex justify-between font-bold">
                      <span>⚡ Sprint Boost</span>
                      <span>${UPGRADE_COSTS.sprint}</span>
                    </div>
                    <div className="text-xs opacity-80 mt-1">
                      {displayState.sprintTimer > 0 ? `Active: ${Math.ceil(displayState.sprintTimer)}s` : `${SPRINT_DURATION}s speed boost`}
                    </div>
                  </button>

                  <button
                    onClick={handleBuyNoIce}
                    disabled={displayState.totalFunding < UPGRADE_COSTS.noIce || displayState.noIceTimer > 0}
                    className={`w-full p-4 rounded-xl text-left transition-all ${
                      displayState.totalFunding >= UPGRADE_COSTS.noIce && displayState.noIceTimer <= 0
                        ? 'bg-purple-500 text-white hover:bg-purple-600 shadow-lg'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex justify-between font-bold">
                      <span>🛡️ ICE Shield</span>
                      <span>${UPGRADE_COSTS.noIce}</span>
                    </div>
                    <div className="text-xs opacity-80 mt-1">
                      {displayState.noIceTimer > 0 ? `Active: ${Math.ceil(displayState.noIceTimer)}s` : `${NO_ICE_DURATION}s protection`}
                    </div>
                  </button>
                </div>

                <button onClick={() => setShowShop(false)} className="w-full py-3 font-bold rounded-xl btn-primary text-white">
                  ← BACK
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* === END SCREEN === */}
      {(isWin || isLose) && (
        <div className="absolute inset-0 flex items-center justify-center p-4 fade-in"
             style={{
               background: isWin
                 ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.95) 0%, rgba(22, 163, 74, 0.95) 100%)'
                 : 'linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(220, 38, 38, 0.95) 100%)',
               backdropFilter: 'blur(8px)',
             }}>
          <div className="card p-6 w-full max-w-[400px] bounce-in">
            {/* Level badge */}
            <div className="text-center mb-2">
              <span className="inline-block px-4 py-1 rounded-full text-white text-sm font-medium"
                    style={{ background: 'linear-gradient(135deg, #4189DD 0%, #2d6bc4 100%)' }}>
                {LEVEL_SPECS[displayState.level]?.name || 'Unknown'}
              </span>
            </div>

            <h1 className={`text-3xl font-black text-center mb-2 ${isWin ? 'text-green-600' : 'text-red-600'}`}>
              {isWin
                ? (displayState.level >= LEVEL_SPECS.length - 1 ? '🎉 GAME COMPLETE!' : '✓ INSPECTION PASSED!')
                : '✗ BUSTED!'}
            </h1>

            <p className="text-gray-600 text-sm text-center mb-4">
              {isWin
                ? (displayState.level >= LEVEL_SPECS.length - 1
                    ? 'You saved all the daycares!'
                    : 'Ready for the next daycare?')
                : 'An independent journalist caught you!'}
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="p-3 rounded-xl text-center text-white"
                   style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}>
                <div className="text-2xl font-black">{displayState.enrollments}</div>
                <div className="text-xs opacity-80">Enrollments</div>
              </div>
              <div className="p-3 rounded-xl text-center"
                   style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#000' }}>
                <div className="text-2xl font-black">${displayState.totalFunding}</div>
                <div className="text-xs opacity-80">Saved</div>
              </div>
              <div className={`p-3 rounded-xl text-center text-white`}
                   style={{
                     background: displayState.suspicion <= LOSE_THRESHOLD
                       ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                       : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                   }}>
                <div className="text-2xl font-black">{Math.floor(displayState.suspicion)}%</div>
                <div className="text-xs opacity-80">Suspicion {displayState.suspicion <= LOSE_THRESHOLD ? '✓' : '✗'}</div>
              </div>
              <div className="p-3 rounded-xl text-center text-white"
                   style={{ background: 'linear-gradient(135deg, #4189DD 0%, #2d6bc4 100%)' }}>
                <div className="text-2xl font-black">{CARRY_CAPACITY + persistentUpgrades.carryCapacity}</div>
                <div className="text-xs opacity-80">Capacity</div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 mb-2">
              <button onClick={handleRestart}
                      className={`flex-1 py-3 text-white font-bold rounded-xl ${isWin ? 'btn-success' : 'btn-danger'}`}>
                ↻ RETRY
              </button>
              {isWin && displayState.level < LEVEL_SPECS.length - 1 && (
                <button onClick={handleNextLevel} className="flex-1 py-3 text-white font-bold rounded-xl btn-primary">
                  NEXT →
                </button>
              )}
            </div>

            <button onClick={handleMenu}
                    className="w-full py-2 font-medium rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
              ← Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
