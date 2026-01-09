'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { GameState, InputState, JoystickState } from '@/game/types';
import { createInitialState, createInputState, createJoystickState } from '@/game/init';
import { updateGame } from '@/game/update';
import { render } from '@/game/render';
import { setupKeyboardListeners } from '@/game/input';
import { MAP_WIDTH, MAP_HEIGHT, MAX_SUSPICION, WARNING_THRESHOLD, COLORS, LEVELS, UPGRADE_COSTS, MAX_CARRY_CAPACITY, CARRY_CAPACITY, LOSE_THRESHOLD, SPRINT_DURATION, NO_ICE_DURATION } from '@/game/config';
import { resetIceTimer } from '@/game/update';
import { Upgrades } from '@/game/types';

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState>(createInitialState());
  const inputStateRef = useRef<InputState>(createInputState());
  const joystickStateRef = useRef<JoystickState>(createJoystickState());
  const lastTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const gameTimeRef = useRef<number>(0);

  const [displayState, setDisplayState] = useState<GameState>(gameStateRef.current);
  const [currentLevel, setCurrentLevel] = useState<number>(0); // Player's progression level
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showShop, setShowShop] = useState<boolean>(false);

  // Persistent state across games
  const [persistentUpgrades, setPersistentUpgrades] = useState<Upgrades>({ carryCapacity: 0 });
  const [persistentFunding, setPersistentFunding] = useState<number>(0);
  const [isProgressLoaded, setIsProgressLoaded] = useState<boolean>(false);

  // Load progress from localStorage on mount
  useEffect(() => {
    try {
      const savedProgress = localStorage.getItem('qlearn_progress');
      if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        if (progress.upgrades) setPersistentUpgrades(progress.upgrades);
        if (progress.funding !== undefined) setPersistentFunding(progress.funding);
        if (progress.level !== undefined) setCurrentLevel(progress.level);
      }
    } catch {
      // If parsing fails, use defaults
    }
    setIsProgressLoaded(true);
  }, []);

  // Save progress to localStorage when it changes
  useEffect(() => {
    if (!isProgressLoaded) return; // Don't save until we've loaded
    try {
      localStorage.setItem('qlearn_progress', JSON.stringify({
        upgrades: persistentUpgrades,
        funding: persistentFunding,
        level: currentLevel,
      }));
    } catch {
      // If saving fails, ignore
    }
  }, [persistentUpgrades, persistentFunding, currentLevel, isProgressLoaded]);

  // Start game at current progression level
  const handleStart = useCallback(() => {
    resetIceTimer();
    gameStateRef.current = createInitialState(currentLevel, persistentUpgrades, persistentFunding);
    gameStateRef.current.phase = 'playing';
    setDisplayState({ ...gameStateRef.current });
  }, [currentLevel, persistentUpgrades, persistentFunding]);

  // Restart current level
  const handleRestart = useCallback(() => {
    resetIceTimer();
    const currentLevel = gameStateRef.current.level;
    // Save accumulated funding before restart
    setPersistentFunding(gameStateRef.current.totalFunding);
    gameStateRef.current = createInitialState(currentLevel, persistentUpgrades, gameStateRef.current.totalFunding);
    gameStateRef.current.phase = 'playing';
    setDisplayState({ ...gameStateRef.current });
  }, [persistentUpgrades]);

  // Advance to next level
  const handleNextLevel = useCallback(() => {
    const nextLevel = Math.min(gameStateRef.current.level + 1, LEVELS.length - 1);
    setCurrentLevel(nextLevel); // Update progression
    resetIceTimer();
    // Save accumulated funding
    setPersistentFunding(gameStateRef.current.totalFunding);
    gameStateRef.current = createInitialState(nextLevel, persistentUpgrades, gameStateRef.current.totalFunding);
    gameStateRef.current.phase = 'playing';
    setDisplayState({ ...gameStateRef.current });
  }, [persistentUpgrades]);

  // Go back to menu
  const handleMenu = useCallback(() => {
    // Save funding when going to menu
    setPersistentFunding(gameStateRef.current.totalFunding);
    gameStateRef.current = createInitialState(currentLevel, persistentUpgrades, gameStateRef.current.totalFunding);
    gameStateRef.current.phase = 'menu';
    setDisplayState({ ...gameStateRef.current });
  }, [persistentUpgrades, currentLevel]);

  // Reset all progress
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

  // Buy carry capacity upgrade (works in menu and during gameplay)
  const handleBuyCapacity = useCallback(() => {
    const currentCapacity = CARRY_CAPACITY + persistentUpgrades.carryCapacity;
    if (currentCapacity >= MAX_CARRY_CAPACITY) return;

    // Use game state funding if playing, otherwise persistent funding
    const availableFunding = gameStateRef.current.phase === 'playing'
      ? gameStateRef.current.totalFunding
      : persistentFunding;

    if (availableFunding < UPGRADE_COSTS.carryCapacity) return;

    const newUpgrades = { ...persistentUpgrades, carryCapacity: persistentUpgrades.carryCapacity + 1 };
    const newFunding = availableFunding - UPGRADE_COSTS.carryCapacity;

    setPersistentUpgrades(newUpgrades);
    setPersistentFunding(newFunding);

    // Update current game state
    if (gameStateRef.current.phase === 'menu') {
      gameStateRef.current = createInitialState(currentLevel, newUpgrades, newFunding);
      gameStateRef.current.phase = 'menu';
      setDisplayState({ ...gameStateRef.current });
    } else if (gameStateRef.current.phase === 'playing') {
      // Update in-game state
      gameStateRef.current.totalFunding = newFunding;
      gameStateRef.current.upgrades = newUpgrades;
      gameStateRef.current.player.carryCapacity = CARRY_CAPACITY + newUpgrades.carryCapacity;
      setDisplayState({ ...gameStateRef.current });
    }
  }, [persistentUpgrades, persistentFunding, currentLevel]);

  // Buy sprint power-up (only during gameplay)
  const handleBuySprint = useCallback(() => {
    if (gameStateRef.current.phase !== 'playing') return;
    if (gameStateRef.current.totalFunding < UPGRADE_COSTS.sprint) return;
    if (gameStateRef.current.sprintTimer > 0) return; // Already active

    gameStateRef.current.totalFunding -= UPGRADE_COSTS.sprint;
    gameStateRef.current.sprintTimer = SPRINT_DURATION;
    setPersistentFunding(gameStateRef.current.totalFunding);
    setDisplayState({ ...gameStateRef.current });
  }, []);

  // Buy no-ICE power-up (only during gameplay)
  const handleBuyNoIce = useCallback(() => {
    if (gameStateRef.current.phase !== 'playing') return;
    if (gameStateRef.current.totalFunding < UPGRADE_COSTS.noIce) return;
    if (gameStateRef.current.noIceTimer > 0) return; // Already active

    gameStateRef.current.totalFunding -= UPGRADE_COSTS.noIce;
    gameStateRef.current.noIceTimer = NO_ICE_DURATION;
    setPersistentFunding(gameStateRef.current.totalFunding);
    setDisplayState({ ...gameStateRef.current });
  }, []);

  // Joystick handler
  const handleJoystickMove = useCallback((dx: number, dy: number) => {
    joystickStateRef.current = { active: true, dx, dy };
  }, []);

  const handleJoystickEnd = useCallback(() => {
    joystickStateRef.current = { active: false, dx: 0, dy: 0 };
  }, []);

  // Keyboard input setup
  useEffect(() => {
    const isPlayingRef = { current: false };

    const checkPlaying = () => {
      isPlayingRef.current = gameStateRef.current.phase === 'playing';
    };

    const interval = setInterval(checkPlaying, 100);
    const cleanup = setupKeyboardListeners(inputStateRef, isPlayingRef);

    return () => {
      clearInterval(interval);
      cleanup();
    };
  }, []);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = (timestamp: number) => {
      const deltaTime = Math.min(lastTimeRef.current ? timestamp - lastTimeRef.current : 16, 50);
      lastTimeRef.current = timestamp;
      gameTimeRef.current += deltaTime;

      // Update (skip if paused)
      if (gameStateRef.current.phase === 'playing' && !isPaused) {
        gameStateRef.current = updateGame(
          gameStateRef.current,
          inputStateRef.current,
          joystickStateRef.current,
          deltaTime
        );
      }

      // Render
      render(ctx, gameStateRef.current, gameTimeRef.current);

      // Update UI state (~30fps)
      if (timestamp % 33 < 16) {
        setDisplayState({ ...gameStateRef.current });
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [isPaused]);

  // Touch joystick handlers
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (gameStateRef.current.phase !== 'playing') return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || gameStateRef.current.phase !== 'playing') return;
    e.preventDefault();

    const touch = e.touches[0];
    const dx = (touch.clientX - touchStartRef.current.x) / 50;
    const dy = (touch.clientY - touchStartRef.current.y) / 50;

    handleJoystickMove(
      Math.max(-1, Math.min(1, dx)),
      Math.max(-1, Math.min(1, dy))
    );
  }, [handleJoystickMove]);

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null;
    handleJoystickEnd();
  }, [handleJoystickEnd]);

  const isWin = displayState.phase === 'win';
  const isLose = displayState.phase === 'lose';
  const suspicionPercent = Math.min(100, (displayState.suspicion / MAX_SUSPICION) * 100);

  return (
    <div className="relative w-screen h-screen flex items-center justify-center overflow-hidden select-none"
         style={{ backgroundColor: '#1a1a2e' }}
         role="application"
         aria-label="Q-Learn Daycare Simulator Game">
      <div
        className="relative w-full h-full max-w-[1000px] max-h-[600px]"
        style={{ aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT}` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <canvas
          ref={canvasRef}
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          className="absolute inset-0 w-full h-full"
          style={{ imageRendering: 'pixelated' }}
          aria-label="Game canvas - use arrow keys or WASD to move"
          tabIndex={0}
        />

        {/* Menu - Somali Daycare Style */}
        {displayState.phase === 'menu' && (
          <div className="absolute inset-0 flex items-center justify-center overflow-auto py-4"
               style={{ backgroundColor: COLORS.classroomFloor }}
               role="dialog"
               aria-label="Main menu"
               aria-modal="true">
            {/* Bulletin board background */}
            <div className="relative p-4 rounded-lg shadow-2xl"
                 style={{
                   backgroundColor: COLORS.bulletinBoard,
                   border: '8px solid #8b4513',
                   width: '380px'
                 }}>
              {/* Pushpins - Somali flag colors */}
              <div className="absolute -top-2 left-8 w-4 h-4 rounded-full border-2"
                   style={{ backgroundColor: COLORS.uiBlue, borderColor: '#3070b8' }} />
              <div className="absolute -top-2 right-8 w-4 h-4 rounded-full bg-white border-2 border-gray-300" />
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full"
                   style={{ backgroundColor: COLORS.uiBlue }} />

              {/* Title card - Somali flag style */}
              <div className="text-center p-3 mb-2 -rotate-1 relative overflow-hidden"
                   style={{ backgroundColor: COLORS.uiBlue }}>
                {/* White star decoration */}
                <span className="absolute top-1 right-2 text-white/30 text-lg">★</span>
                <span className="absolute bottom-1 left-2 text-white/30 text-sm">★</span>
                <h1 className="text-2xl font-bold text-white"
                    style={{ fontFamily: 'Comic Sans MS, cursive' }}>
                  Q-Learn™
                </h1>
                <p className="text-sm text-white/90" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
                  Somali Daycare Simulator
                </p>
                <p className="text-[10px] text-white/70 mt-1" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
                  &quot;Nabad iyo caano&quot; ☆ Peace &amp; Prosperity
                </p>
              </div>

              {/* Kid drawing decoration */}
              <div className="absolute -right-2 top-20 rotate-12 text-2xl opacity-60">🖍️</div>

              {/* Instructions card */}
              <div className="p-2 mb-2 rotate-1"
                   style={{ backgroundColor: COLORS.uiYellow }}>
                <h2 className="font-bold mb-1 text-center text-xs"
                    style={{ fontFamily: 'Comic Sans MS, cursive', color: '#333' }}>
                  📋 How to Play
                </h2>
                <ul className="space-y-0 text-xs leading-tight" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#333' }}>
                  <li>• WASD / Arrows / Touch to move</li>
                  <li>• Collect enrollment forms from classrooms</li>
                  <li>• Drop forms at the Office desk</li>
                  <li>• HIDE in rooms when ICE patrols! 🚨</li>
                </ul>
              </div>

              {/* Anti-ICE note - looks like a sticky note */}
              <div className="p-1.5 mb-2 -rotate-2 shadow-md"
                   style={{ backgroundColor: '#ffb3b3' }}>
                <p className="text-[10px] text-center font-bold" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#8b0000' }}>
                  ❄️ ICE agents have NO jurisdiction over love ❄️
                </p>
              </div>

              {/* Current Level Display */}
              <div className="p-2 mb-2 -rotate-1"
                   style={{ backgroundColor: COLORS.uiBlue }}>
                <h2 className="font-bold text-center text-white"
                    style={{ fontFamily: 'Comic Sans MS, cursive' }}>
                  🏫 {LEVELS[currentLevel]?.name || 'Unknown'}
                </h2>
                <p className="text-xs text-center text-white/80"
                   style={{ fontFamily: 'Comic Sans MS, cursive' }}>
                  Level {currentLevel + 1} of {LEVELS.length}
                </p>
              </div>

              {/* Upgrades Section */}
              <div className="p-2 mb-2 rotate-1"
                   style={{ backgroundColor: COLORS.uiGreen }}>
                <div className="flex justify-between items-center mb-1">
                  <h2 className="font-bold text-xs text-white"
                      style={{ fontFamily: 'Comic Sans MS, cursive' }}>
                    💰 Upgrades
                  </h2>
                  <span className="px-2 py-0.5 bg-white/20 rounded text-xs font-bold text-white"
                        style={{ fontFamily: 'Comic Sans MS, cursive' }}>
                    ${persistentFunding}
                  </span>
                </div>

                <button
                  onClick={handleBuyCapacity}
                  disabled={persistentFunding < UPGRADE_COSTS.carryCapacity || CARRY_CAPACITY + persistentUpgrades.carryCapacity >= MAX_CARRY_CAPACITY}
                  className={`w-full p-1.5 rounded text-xs font-bold transition-all ${
                    persistentFunding >= UPGRADE_COSTS.carryCapacity && CARRY_CAPACITY + persistentUpgrades.carryCapacity < MAX_CARRY_CAPACITY
                      ? 'bg-white text-green-700 hover:scale-105'
                      : 'bg-white/30 text-white/60 cursor-not-allowed'
                  }`}
                  style={{ fontFamily: 'Comic Sans MS, cursive' }}
                  aria-label={`Buy plus one carry capacity for ${UPGRADE_COSTS.carryCapacity} dollars. Currently ${CARRY_CAPACITY + persistentUpgrades.carryCapacity} of ${MAX_CARRY_CAPACITY}`}
                >
                  +1 Capacity (${UPGRADE_COSTS.carryCapacity}) — {CARRY_CAPACITY + persistentUpgrades.carryCapacity}/{MAX_CARRY_CAPACITY}
                </button>
              </div>

              <button
                onClick={handleStart}
                className="w-full py-3 text-white text-lg font-bold rounded transform hover:scale-105 transition-all shadow-lg"
                style={{
                  fontFamily: 'Comic Sans MS, cursive',
                  backgroundColor: COLORS.uiBlue,
                  border: '3px solid #3070b8'
                }}
                aria-label={`Start game at level ${currentLevel + 1}: ${LEVELS[currentLevel]?.name || 'Unknown'}`}
              >
                ▶ START SHIFT
              </button>

              <p className="mt-2 text-xs text-center" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#fff' }}>
                Get suspicion below {LOSE_THRESHOLD}% to pass inspection!
              </p>

              {/* Bottom tagline */}
              <p className="mt-1 text-[9px] text-center opacity-70" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#fff' }}>
                &quot;They can deport people, but they can&apos;t deport community&quot;
              </p>

              {/* Reset progress button */}
              <button
                onClick={handleResetProgress}
                className="mt-3 text-[10px] text-center opacity-50 hover:opacity-100 transition-opacity underline"
                style={{ fontFamily: 'Comic Sans MS, cursive', color: '#fff' }}
                aria-label="Reset all game progress including upgrades, funding, and level progression"
              >
                Reset Progress
              </button>
            </div>
          </div>
        )}

        {/* HUD - Compact overlay */}
        {displayState.phase === 'playing' && (
          <>
            {/* Top bar - Level name and stats */}
            <div className="absolute top-0 left-0 right-0 flex justify-between items-start p-1" role="status" aria-live="polite">
              {/* Left side stats */}
              <div className="flex gap-1 flex-wrap pointer-events-none" aria-label={`Level: ${LEVELS[displayState.level]?.name}, Funding: ${displayState.totalFunding} dollars, Forms: ${displayState.player.carrying} of ${displayState.player.carryCapacity}`}>
                <div className="px-2 py-0.5 text-xs font-bold text-white rounded"
                     style={{ backgroundColor: COLORS.uiBlue, fontFamily: 'Comic Sans MS, cursive' }}>
                  {LEVELS[displayState.level]?.name || 'Unknown'}
                </div>
                <div className="px-2 py-0.5 text-xs font-bold text-white rounded"
                     style={{ backgroundColor: COLORS.uiGreen, fontFamily: 'Comic Sans MS, cursive' }}>
                  ${displayState.totalFunding}
                </div>
                <div className="px-2 py-0.5 text-xs font-bold text-white rounded"
                     style={{ backgroundColor: COLORS.uiBlue, fontFamily: 'Comic Sans MS, cursive' }}>
                  {displayState.player.carrying}/{displayState.player.carryCapacity} forms
                </div>
                {/* Active power-ups */}
                {displayState.sprintTimer > 0 && (
                  <div className="px-2 py-0.5 text-xs font-bold text-white rounded animate-pulse"
                       style={{ backgroundColor: COLORS.uiYellow, fontFamily: 'Comic Sans MS, cursive', color: '#333' }}>
                    SPRINT {Math.ceil(displayState.sprintTimer)}s
                  </div>
                )}
                {displayState.noIceTimer > 0 && (
                  <div className="px-2 py-0.5 text-xs font-bold text-white rounded animate-pulse"
                       style={{ backgroundColor: COLORS.uiPink, fontFamily: 'Comic Sans MS, cursive' }}>
                    NO ICE {Math.ceil(displayState.noIceTimer)}s
                  </div>
                )}
              </div>

              {/* Right side - Timer and Pause */}
              <div className="flex gap-1 items-center">
                <button
                  onClick={() => setIsPaused(true)}
                  className="px-2 py-0.5 text-xs font-bold rounded hover:scale-105 transition-transform"
                  style={{ backgroundColor: COLORS.uiPaper, fontFamily: 'Comic Sans MS, cursive', color: '#333' }}
                  aria-label="Pause game">
                  PAUSE
                </button>
                <div className="px-2 py-0.5 text-sm font-bold rounded pointer-events-none"
                     style={{ backgroundColor: COLORS.uiPaper, fontFamily: 'Comic Sans MS, cursive', color: COLORS.uiCrayon }}
                     aria-label={`Time remaining: ${Math.ceil(displayState.timeRemaining)} seconds`}>
                  {Math.ceil(displayState.timeRemaining)}s
                </div>
              </div>
            </div>

            {/* Suspicion meter - horizontal bar at bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-1 pointer-events-none"
                 role="progressbar"
                 aria-valuenow={Math.floor(displayState.suspicion)}
                 aria-valuemin={0}
                 aria-valuemax={100}
                 aria-label={`Suspicion level: ${Math.floor(displayState.suspicion)} percent. Goal: below ${LOSE_THRESHOLD} percent`}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
                  Suspicion
                </span>
                <div className="flex-1 h-4 rounded overflow-hidden border-2 relative"
                     style={{ backgroundColor: COLORS.uiPaper, borderColor: COLORS.uiCrayon }}>
                  {/* Fill */}
                  <div
                    className="absolute top-0 left-0 bottom-0 transition-all duration-300"
                    style={{
                      width: `${suspicionPercent}%`,
                      backgroundColor: suspicionPercent > WARNING_THRESHOLD
                        ? COLORS.uiRed
                        : suspicionPercent > LOSE_THRESHOLD
                          ? COLORS.uiYellow
                          : COLORS.uiGreen,
                    }}
                  />
                  {/* Threshold line at 25% */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5"
                    style={{
                      left: `${LOSE_THRESHOLD}%`,
                      backgroundColor: '#000',
                    }}
                  />
                  {/* Percentage text */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#333' }}>
                      {Math.floor(displayState.suspicion)}% (goal: ≤{LOSE_THRESHOLD}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pause Menu */}
            {isPaused && !showShop && (
              <div className="absolute inset-0 flex items-center justify-center"
                   style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
                   role="dialog"
                   aria-label="Pause menu"
                   aria-modal="true">
                <div className="p-4 rounded-lg shadow-2xl"
                     style={{
                       backgroundColor: COLORS.uiPaper,
                       border: `4px solid ${COLORS.uiBlue}`,
                       width: '280px'
                     }}>
                  <h2 className="text-xl font-bold text-center mb-4"
                      style={{ fontFamily: 'Comic Sans MS, cursive', color: COLORS.uiBlue }}>
                    PAUSED
                  </h2>

                  <div className="space-y-2">
                    <button
                      onClick={() => setIsPaused(false)}
                      className="w-full py-2 text-white font-bold rounded hover:scale-105 transition-transform"
                      style={{
                        fontFamily: 'Comic Sans MS, cursive',
                        backgroundColor: COLORS.uiGreen,
                        border: '2px solid #0a8a4d'
                      }}
                      aria-label="Resume game"
                    >
                      RESUME
                    </button>

                    <button
                      onClick={() => setShowShop(true)}
                      className="w-full py-2 text-white font-bold rounded hover:scale-105 transition-transform"
                      style={{
                        fontFamily: 'Comic Sans MS, cursive',
                        backgroundColor: COLORS.uiYellow,
                        color: '#333',
                        border: '2px solid #d4a844'
                      }}
                      aria-label={`Open shop. You have ${displayState.totalFunding} dollars`}
                    >
                      SHOP (${displayState.totalFunding})
                    </button>

                    <button
                      onClick={() => { setIsPaused(false); handleMenu(); }}
                      className="w-full py-2 font-bold rounded hover:scale-105 transition-transform"
                      style={{
                        fontFamily: 'Comic Sans MS, cursive',
                        backgroundColor: '#ddd',
                        color: '#333',
                        border: '2px solid #999'
                      }}
                      aria-label="Return to main menu"
                    >
                      MAIN MENU
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Shop Modal (from pause menu) */}
            {isPaused && showShop && (
              <div className="absolute inset-0 flex items-center justify-center"
                   style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
                   role="dialog"
                   aria-label="Shop"
                   aria-modal="true">
                <div className="p-4 rounded-lg shadow-2xl"
                     style={{
                       backgroundColor: COLORS.uiPaper,
                       border: `4px solid ${COLORS.uiGreen}`,
                       width: '300px'
                     }}>
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-lg font-bold"
                        style={{ fontFamily: 'Comic Sans MS, cursive', color: COLORS.uiGreen }}>
                      SHOP
                    </h2>
                    <span className="px-2 py-1 rounded font-bold text-white"
                          style={{ backgroundColor: COLORS.uiGreen, fontFamily: 'Comic Sans MS, cursive' }}
                          aria-label={`Available funds: ${displayState.totalFunding} dollars`}>
                      ${displayState.totalFunding}
                    </span>
                  </div>

                  <div className="space-y-2 mb-3" role="group" aria-label="Available upgrades">
                    {/* Capacity upgrade */}
                    <button
                      onClick={handleBuyCapacity}
                      disabled={displayState.totalFunding < UPGRADE_COSTS.carryCapacity || displayState.player.carryCapacity >= MAX_CARRY_CAPACITY}
                      className={`w-full p-2 rounded text-sm font-bold transition-all ${
                        displayState.totalFunding >= UPGRADE_COSTS.carryCapacity && displayState.player.carryCapacity < MAX_CARRY_CAPACITY
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                      style={{ fontFamily: 'Comic Sans MS, cursive' }}
                      aria-label={`Buy plus one form capacity for ${UPGRADE_COSTS.carryCapacity} dollars. Current capacity: ${displayState.player.carryCapacity} of ${MAX_CARRY_CAPACITY}`}
                    >
                      +1 Form Capacity (${UPGRADE_COSTS.carryCapacity})
                      <div className="text-xs opacity-80">
                        Current: {displayState.player.carryCapacity}/{MAX_CARRY_CAPACITY}
                      </div>
                    </button>

                    {/* Sprint power-up */}
                    <button
                      onClick={handleBuySprint}
                      disabled={displayState.totalFunding < UPGRADE_COSTS.sprint || displayState.sprintTimer > 0}
                      className={`w-full p-2 rounded text-sm font-bold transition-all ${
                        displayState.totalFunding >= UPGRADE_COSTS.sprint && displayState.sprintTimer <= 0
                          ? 'text-white hover:opacity-90'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                      style={{
                        fontFamily: 'Comic Sans MS, cursive',
                        backgroundColor: displayState.totalFunding >= UPGRADE_COSTS.sprint && displayState.sprintTimer <= 0 ? COLORS.uiYellow : undefined,
                        color: displayState.totalFunding >= UPGRADE_COSTS.sprint && displayState.sprintTimer <= 0 ? '#333' : undefined
                      }}
                      aria-label={`Buy sprint power-up for ${UPGRADE_COSTS.sprint} dollars. ${displayState.sprintTimer > 0 ? `Currently active: ${Math.ceil(displayState.sprintTimer)} seconds remaining` : `Gives ${SPRINT_DURATION} seconds of speed boost`}`}
                    >
                      SPRINT (${UPGRADE_COSTS.sprint})
                      <div className="text-xs opacity-80">
                        {displayState.sprintTimer > 0 ? `Active: ${Math.ceil(displayState.sprintTimer)}s` : `${SPRINT_DURATION}s speed boost`}
                      </div>
                    </button>

                    {/* No ICE power-up */}
                    <button
                      onClick={handleBuyNoIce}
                      disabled={displayState.totalFunding < UPGRADE_COSTS.noIce || displayState.noIceTimer > 0}
                      className={`w-full p-2 rounded text-sm font-bold transition-all ${
                        displayState.totalFunding >= UPGRADE_COSTS.noIce && displayState.noIceTimer <= 0
                          ? 'text-white hover:opacity-90'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                      style={{
                        fontFamily: 'Comic Sans MS, cursive',
                        backgroundColor: displayState.totalFunding >= UPGRADE_COSTS.noIce && displayState.noIceTimer <= 0 ? COLORS.uiPink : undefined
                      }}
                      aria-label={`Buy no ICE power-up for ${UPGRADE_COSTS.noIce} dollars. ${displayState.noIceTimer > 0 ? `Currently active: ${Math.ceil(displayState.noIceTimer)} seconds remaining` : `Gives ${NO_ICE_DURATION} seconds of ICE-free time`}`}
                    >
                      NO ICE (${UPGRADE_COSTS.noIce})
                      <div className="text-xs opacity-80">
                        {displayState.noIceTimer > 0 ? `Active: ${Math.ceil(displayState.noIceTimer)}s` : `${NO_ICE_DURATION}s ICE-free`}
                      </div>
                    </button>
                  </div>

                  <button
                    onClick={() => setShowShop(false)}
                    className="w-full py-2 text-white font-bold rounded hover:scale-105 transition-transform"
                    style={{
                      fontFamily: 'Comic Sans MS, cursive',
                      backgroundColor: COLORS.uiBlue,
                      border: '2px solid #3070b8'
                    }}
                    aria-label="Go back to pause menu"
                  >
                    BACK
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* End Screen - Construction Paper Style */}
        {(isWin || isLose) && (
          <div className="absolute inset-0 flex items-center justify-center"
               style={{ backgroundColor: isWin ? 'rgba(29, 209, 161, 0.9)' : 'rgba(255, 107, 107, 0.9)' }}
               role="dialog"
               aria-label={isWin ? 'Level complete' : 'Game over'}
               aria-modal="true">
            <div className="p-6 rounded-lg shadow-2xl max-w-md"
                 style={{
                   backgroundColor: COLORS.uiPaper,
                   border: `6px solid ${isWin ? COLORS.uiGreen : COLORS.uiRed}`,
                   transform: 'rotate(-1deg)'
                 }}>
              {/* Level name */}
              <div className="text-center mb-2">
                <span className="px-3 py-1 text-sm font-bold text-white"
                      style={{ backgroundColor: COLORS.uiBlue, fontFamily: 'Comic Sans MS, cursive' }}>
                  {LEVELS[displayState.level]?.name || 'Unknown'}
                </span>
              </div>

              <h1 className="text-3xl font-bold mb-3 text-center"
                  style={{
                    fontFamily: 'Comic Sans MS, cursive',
                    color: isWin ? COLORS.uiGreen : COLORS.uiRed
                  }}>
                {isWin
                  ? (displayState.level >= LEVELS.length - 1 ? 'GAME COMPLETE!' : 'INSPECTION PASSED!')
                  : 'BUSTED!'}
              </h1>

              <p className="text-base mb-4 text-center"
                 style={{ fontFamily: 'Comic Sans MS, cursive', color: COLORS.uiCrayon }}>
                {isWin
                  ? (displayState.level >= LEVELS.length - 1
                      ? 'You saved all the daycares! Quality outcomes achieved.'
                      : 'Level complete! Ready for the next daycare?')
                  : 'An independent journalist caught you with ICE!'}
              </p>

              <div className="grid grid-cols-2 gap-2 mb-4" role="group" aria-label="Level statistics">
                <div className="p-2 text-center -rotate-1" style={{ backgroundColor: COLORS.uiGreen }} aria-label={`Enrollments: ${displayState.enrollments}`}>
                  <div className="text-xl font-bold text-white">{displayState.enrollments}</div>
                  <div className="text-xs text-white/80" style={{ fontFamily: 'Comic Sans MS, cursive' }}>Enrollments</div>
                </div>
                <div className="p-2 text-center rotate-1" style={{ backgroundColor: COLORS.uiYellow }} aria-label={`Total funding saved: ${displayState.totalFunding} dollars`}>
                  <div className="text-xl font-bold text-gray-800">${displayState.totalFunding}</div>
                  <div className="text-xs text-gray-700" style={{ fontFamily: 'Comic Sans MS, cursive' }}>Total Saved</div>
                </div>
                <div className="p-2 text-center rotate-1" style={{ backgroundColor: displayState.suspicion <= LOSE_THRESHOLD ? COLORS.uiGreen : COLORS.uiRed }} aria-label={`Suspicion: ${Math.floor(displayState.suspicion)} percent, ${displayState.suspicion <= LOSE_THRESHOLD ? 'goal met' : 'goal not met'}`}>
                  <div className="text-xl font-bold text-white">{Math.floor(displayState.suspicion)}%</div>
                  <div className="text-xs text-white/80" style={{ fontFamily: 'Comic Sans MS, cursive' }}>Suspicion {displayState.suspicion <= LOSE_THRESHOLD ? '✓' : '✗'}</div>
                </div>
                <div className="p-2 text-center -rotate-1" style={{ backgroundColor: COLORS.uiBlue }} aria-label={`Carry capacity: ${CARRY_CAPACITY + persistentUpgrades.carryCapacity}`}>
                  <div className="text-xl font-bold text-white">{CARRY_CAPACITY + persistentUpgrades.carryCapacity}</div>
                  <div className="text-xs text-white/80" style={{ fontFamily: 'Comic Sans MS, cursive' }}>Carry Cap</div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mb-2">
                <button
                  onClick={handleRestart}
                  className="flex-1 py-2 text-white text-base font-bold rounded transform hover:scale-105 transition-all shadow-lg"
                  style={{
                    fontFamily: 'Comic Sans MS, cursive',
                    backgroundColor: isWin ? COLORS.uiGreen : COLORS.uiRed,
                    border: `3px solid ${isWin ? '#0a8a4d' : '#cc5555'}`
                  }}
                  aria-label="Retry this level"
                >
                  RETRY
                </button>
                {isWin && displayState.level < LEVELS.length - 1 && (
                  <button
                    onClick={handleNextLevel}
                    className="flex-1 py-2 text-white text-base font-bold rounded transform hover:scale-105 transition-all shadow-lg"
                    style={{
                      fontFamily: 'Comic Sans MS, cursive',
                      backgroundColor: COLORS.uiBlue,
                      border: '3px solid #3070b8'
                    }}
                    aria-label={`Go to next level: ${LEVELS[displayState.level + 1]?.name || 'Unknown'}`}
                  >
                    NEXT →
                  </button>
                )}
              </div>

              <button
                onClick={handleMenu}
                className="w-full py-2 text-gray-800 text-sm font-bold rounded transform hover:scale-105 transition-all"
                style={{
                  fontFamily: 'Comic Sans MS, cursive',
                  backgroundColor: '#ddd',
                  border: '2px solid #999'
                }}
                aria-label="Return to main menu"
              >
                MENU
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
