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
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useVisualEffects } from '@/hooks/useVisualEffects';

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
  const sfx = useSoundEffects(isMuted);
  const vfx = useVisualEffects();

  // Track previous state for sound effect triggers
  const prevStateRef = useRef({
    carrying: 0,
    enrollments: 0,
    iceCount: 0,
    suspicionLevel: 0, // 0 = normal, 1 = warning (50%+), 2 = critical (75%+)
    phase: 'menu' as string,
  });

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

  // Sound and visual effects based on state changes
  useEffect(() => {
    const prev = prevStateRef.current;
    const curr = displayState;

    // Only trigger effects during gameplay
    if (curr.phase === 'playing') {
      // Form collected
      if (curr.player.carrying > prev.carrying) {
        sfx.playCollect();
        // Spawn paper particles at approximate center of screen
        vfx.onCollectForm(window.innerWidth / 2, window.innerHeight / 2);
      }

      // Forms dropped off at desk
      if (curr.enrollments > prev.enrollments) {
        sfx.playDropOff();
        vfx.onDropOff(window.innerWidth / 2, window.innerHeight / 2);
      }

      // ICE spawned
      const currIceCount = curr.iceAgents?.length || 0;
      if (currIceCount > prev.iceCount) {
        sfx.playIceAlert();
        vfx.onIceSpawn();
      }

      // Suspicion level changes
      const suspicionPercent = (curr.suspicion / MAX_SUSPICION) * 100;
      const currSuspicionLevel = suspicionPercent >= WARNING_THRESHOLD ? 2 : suspicionPercent >= 50 ? 1 : 0;

      if (currSuspicionLevel > prev.suspicionLevel) {
        if (currSuspicionLevel === 2) {
          sfx.playSuspicionCritical();
          vfx.onSuspicionCritical();
        } else if (currSuspicionLevel === 1) {
          sfx.playSuspicionWarning();
          vfx.triggerFlash('yellow', 0.15, 200);
        }
      }

      // Update prev state
      prevStateRef.current = {
        carrying: curr.player.carrying,
        enrollments: curr.enrollments,
        iceCount: currIceCount,
        suspicionLevel: currSuspicionLevel,
        phase: curr.phase,
      };
    }

    // Win/Lose effects
    if (curr.phase === 'win' && prev.phase === 'playing') {
      sfx.playWin();
      vfx.onWin(window.innerWidth / 2, window.innerHeight / 2);
    }
    if (curr.phase === 'lose' && prev.phase === 'playing') {
      sfx.playLose();
      vfx.onLose();
    }

    // Update phase tracking
    if (curr.phase !== prev.phase) {
      prevStateRef.current.phase = curr.phase;
    }
  }, [displayState, sfx, vfx]);

  const handleStart = useCallback(() => {
    sfx.playClick();
    resetIceTimer();
    gameStateRef.current = createInitialState(currentLevel, persistentUpgrades, persistentFunding);
    gameStateRef.current.phase = 'playing';
    // Reset sound state tracking for new game
    prevStateRef.current = { carrying: 0, enrollments: 0, iceCount: 0, suspicionLevel: 0, phase: 'playing' };
    setDisplayState({ ...gameStateRef.current });
  }, [currentLevel, persistentUpgrades, persistentFunding, sfx]);

  const handleRestart = useCallback(() => {
    sfx.playClick();
    resetIceTimer();
    const currentLevel = gameStateRef.current.level;
    setPersistentFunding(gameStateRef.current.totalFunding);
    gameStateRef.current = createInitialState(currentLevel, persistentUpgrades, gameStateRef.current.totalFunding);
    gameStateRef.current.phase = 'playing';
    prevStateRef.current = { carrying: 0, enrollments: 0, iceCount: 0, suspicionLevel: 0, phase: 'playing' };
    setDisplayState({ ...gameStateRef.current });
  }, [persistentUpgrades, sfx]);

  const handleNextLevel = useCallback(() => {
    sfx.playClick();
    const nextLevel = Math.min(gameStateRef.current.level + 1, LEVEL_SPECS.length - 1);
    setCurrentLevel(nextLevel);
    resetIceTimer();
    setPersistentFunding(gameStateRef.current.totalFunding);
    gameStateRef.current = createInitialState(nextLevel, persistentUpgrades, gameStateRef.current.totalFunding);
    gameStateRef.current.phase = 'playing';
    prevStateRef.current = { carrying: 0, enrollments: 0, iceCount: 0, suspicionLevel: 0, phase: 'playing' };
    setDisplayState({ ...gameStateRef.current });
  }, [persistentUpgrades, sfx]);

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

    sfx.playPurchase();
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
  }, [persistentUpgrades, persistentFunding, currentLevel, sfx]);

  const handleBuySprint = useCallback(() => {
    if (gameStateRef.current.phase !== 'playing') return;
    if (gameStateRef.current.totalFunding < UPGRADE_COSTS.sprint) return;
    if (gameStateRef.current.sprintTimer > 0) return;
    sfx.playPurchase();
    sfx.playPowerUp();
    vfx.onPowerUp();
    gameStateRef.current.totalFunding -= UPGRADE_COSTS.sprint;
    gameStateRef.current.sprintTimer = SPRINT_DURATION;
    setPersistentFunding(gameStateRef.current.totalFunding);
    setDisplayState({ ...gameStateRef.current });
  }, [sfx, vfx]);

  const handleBuyNoIce = useCallback(() => {
    if (gameStateRef.current.phase !== 'playing') return;
    if (gameStateRef.current.totalFunding < UPGRADE_COSTS.noIce) return;
    if (gameStateRef.current.noIceTimer > 0) return;
    sfx.playPurchase();
    sfx.playPowerUp();
    vfx.onPowerUp();
    gameStateRef.current.totalFunding -= UPGRADE_COSTS.noIce;
    gameStateRef.current.noIceTimer = NO_ICE_DURATION;
    setPersistentFunding(gameStateRef.current.totalFunding);
    setDisplayState({ ...gameStateRef.current });
  }, [sfx, vfx]);

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
  }, [isPaused, displayState.phase]);

  const isWin = displayState.phase === 'win';
  const isLose = displayState.phase === 'lose';
  const suspicionPercent = Math.min(100, (displayState.suspicion / MAX_SUSPICION) * 100);

  const [isMobile, setIsMobile] = useState(false);
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);
  const [isMobileLandscape, setIsMobileLandscape] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const mobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isPortrait = window.innerHeight > window.innerWidth;
      const isLandscape = window.innerWidth > window.innerHeight;
      setIsMobile(mobile);
      // Portrait: mobile device in portrait orientation
      setIsMobilePortrait(mobile && isPortrait);
      // Landscape: mobile device in landscape orientation
      setIsMobileLandscape(mobile && isLandscape);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Virtual joystick state for mobile
  const joystickRef = useRef<HTMLDivElement>(null);
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });

  // Joystick customization settings
  const [joystickSettings, setJoystickSettings] = useState({
    side: 'right' as 'left' | 'right',
    size: 100, // pixels
    opacity: 0.6,
    offsetX: 20, // distance from edge
    offsetY: 24, // distance from bottom
  });
  const [showJoystickSettings, setShowJoystickSettings] = useState(false);

  // Load joystick settings from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('qlearn_joystick_settings');
      if (saved) {
        setJoystickSettings(prev => ({ ...prev, ...JSON.parse(saved) }));
      }
    } catch { /* ignore */ }
  }, []);

  // Save joystick settings to localStorage
  const saveJoystickSettings = useCallback((settings: typeof joystickSettings) => {
    setJoystickSettings(settings);
    try {
      localStorage.setItem('qlearn_joystick_settings', JSON.stringify(settings));
    } catch { /* ignore */ }
  }, []);

  const handleVirtualJoystickStart = useCallback((e: React.TouchEvent) => {
    if (!joystickRef.current) return;
    e.stopPropagation();
    setJoystickActive(true);
    const touch = e.touches[0];
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = (touch.clientX - centerX) / (rect.width / 2);
    const dy = (touch.clientY - centerY) / (rect.height / 2);
    const clampedX = Math.max(-1, Math.min(1, dx));
    const clampedY = Math.max(-1, Math.min(1, dy));
    setJoystickPos({ x: clampedX * 25, y: clampedY * 25 });
    handleJoystickMove(clampedX, clampedY);
  }, [handleJoystickMove]);

  const handleVirtualJoystickMove = useCallback((e: React.TouchEvent) => {
    if (!joystickActive || !joystickRef.current) return;
    e.stopPropagation();
    const touch = e.touches[0];
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = (touch.clientX - centerX) / (rect.width / 2);
    const dy = (touch.clientY - centerY) / (rect.height / 2);
    const clampedX = Math.max(-1, Math.min(1, dx));
    const clampedY = Math.max(-1, Math.min(1, dy));
    setJoystickPos({ x: clampedX * 25, y: clampedY * 25 });
    handleJoystickMove(clampedX, clampedY);
  }, [joystickActive, handleJoystickMove]);

  const handleVirtualJoystickEnd = useCallback(() => {
    setJoystickActive(false);
    setJoystickPos({ x: 0, y: 0 });
    handleJoystickEnd();
  }, [handleJoystickEnd]);

  return (
    <div
      className={`fixed inset-0 overflow-hidden select-none ${vfx.shake > 0 ? 'screen-shake' : ''}`}
      style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
      role="application"
      aria-label="Q-Learn Daycare Simulator Game"
    >
      {/* Game canvas */}
      {displayState.phase !== 'menu' && (
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Handheld overlay frame for mobile landscape */}
          {isMobileLandscape && (
            <div
              className="absolute inset-0 pointer-events-none z-10"
              style={{
                backgroundImage: 'url(/overlay/handheld-landscape.png)',
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            />
          )}
          <canvas
            ref={canvasRef}
            width={MAP_WIDTH}
            height={MAP_HEIGHT}
            className="max-w-full max-h-full shadow-2xl rounded-lg"
            style={{
              imageRendering: 'pixelated',
              height: isMobileLandscape ? '55%' : '100%',
            }}
            aria-label="Game canvas - use arrow keys or WASD to move"
            tabIndex={0}
          />
        </div>
      )}


      {/* === MENU === */}
      {displayState.phase === 'menu' && (
        <div className="absolute inset-0 flex items-center justify-center overflow-auto p-4"
             style={{ background: '#B8D4E8' }}>
          {/* Clipboard */}
          <div className="relative w-full max-w-[420px] fade-in">
            {/* Blackboard clips - circles that clip over the edge */}
            <div className="absolute -top-3 left-8 w-8 h-8 rounded-full z-10" style={{ background: '#5BA3E0', boxShadow: 'inset -2px -2px 4px rgba(0,0,0,0.2), inset 2px 2px 4px rgba(255,255,255,0.3)' }} />
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full z-10" style={{ background: '#5BA3E0', boxShadow: 'inset -2px -2px 4px rgba(0,0,0,0.2), inset 2px 2px 4px rgba(255,255,255,0.3)' }} />
            <div className="absolute -top-3 right-8 w-8 h-8 rounded-full bg-white z-10" style={{ boxShadow: 'inset -2px -2px 4px rgba(0,0,0,0.1), inset 2px 2px 4px rgba(255,255,255,0.5)' }} />
            {/* Crayon */}
            <div className="absolute top-24 -right-1 z-10 rotate-[30deg]" style={{ transformOrigin: 'center' }}>
              {/* Crayon body */}
              <div className="w-4 h-14 rounded-sm" style={{ background: 'linear-gradient(90deg, #d4a574 0%, #e8c9a0 30%, #d4a574 70%, #b8956a 100%)' }} />
              {/* Crayon tip */}
              <div className="w-4 h-4 mx-auto" style={{
                background: '#e74c3c',
                clipPath: 'polygon(0% 0%, 100% 0%, 50% 100%)',
                boxShadow: 'inset -1px 0 2px rgba(0,0,0,0.3)'
              }} />
            </div>
            {/* Star decoration */}
            <div className="absolute top-16 right-12 text-blue-300/30 text-sm">✦</div>

            {/* Clipboard board - cork board style */}
            <div className="rounded-2xl p-4 pt-6" style={{ background: '#C9A66B', border: '5px solid #A67B4B' }}>
              {/* Header Card - Blue */}
              <div className="rounded-xl p-4 mb-3 text-center relative" style={{ background: '#4A90D9' }}>
                <div className="absolute top-3 left-4 text-yellow-300 text-xs">★</div>
                <div className="absolute top-3 right-4 text-blue-200/30 text-xs">✦</div>
                <h1 className="text-4xl font-black text-white" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                  Learing™
                </h1>
                <p className="text-white text-base font-medium mt-1">Somali Daycare Simulator</p>
                <p className="text-white/60 text-sm mt-1">&quot;Nabad iyo caano&quot; ☆ Peace &amp; Prosperity</p>
              </div>

              {/* How to Play Card - Yellow */}
              <div className="rounded-xl p-4 mb-3" style={{ background: '#FFD93D' }}>
                <h2 className="text-gray-800 font-bold text-base mb-3 flex items-center justify-center gap-2">
                  <span className="text-lg">📋</span> How to Play
                </h2>
                <ul className="text-gray-700 text-sm space-y-1">
                  <li>• WASD / Arrows / Touch to move</li>
                  <li>• Collect enrollment forms from classrooms</li>
                  <li>• Drop forms at the Office desk</li>
                  <li>• HIDE in rooms when ICE patrols! 🚨</li>
                </ul>
              </div>

              {/* Pink Banner - with tilted text */}
              <div className="rounded-lg p-2 mb-3 text-center overflow-hidden" style={{ background: '#FFB6C1' }}>
                <p className="text-red-500 text-sm font-medium" style={{ transform: 'rotate(-2deg)' }}>
                  ❄️ ICE agents have NO jurisdiction over love ❄️
                </p>
              </div>

              {/* Level Card - Blue */}
              <div className="rounded-xl p-3 mb-3 text-center" style={{ background: '#4A90D9' }}>
                <p className="text-white font-bold text-xl flex items-center justify-center gap-2">
                  <span>🏫</span> {LEVEL_SPECS[currentLevel]?.name || 'Unknown'}
                </p>
                <p className="text-white/70 text-sm">Level {currentLevel + 1} of {LEVEL_SPECS.length}</p>
              </div>

              {/* Upgrades Card - Teal/Green */}
              <div className="rounded-xl p-3 mb-3" style={{ background: '#3CB371' }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-800 font-bold text-sm flex items-center gap-1">
                    <span>💰</span> Upgrades
                  </span>
                  <span className="px-3 py-1 rounded-lg text-white text-sm font-bold" style={{ background: '#4A90D9' }}>
                    ${persistentFunding}
                  </span>
                </div>
                <button
                  onClick={handleBuyCapacity}
                  disabled={persistentFunding < UPGRADE_COSTS.carryCapacity || CARRY_CAPACITY + persistentUpgrades.carryCapacity >= MAX_CARRY_CAPACITY}
                  className="w-full p-2.5 rounded-lg font-bold text-sm transition-all active:scale-[0.98]"
                  style={{
                    background: persistentFunding >= UPGRADE_COSTS.carryCapacity && CARRY_CAPACITY + persistentUpgrades.carryCapacity < MAX_CARRY_CAPACITY
                      ? '#5DECA5' : '#5DECA580',
                    color: persistentFunding >= UPGRADE_COSTS.carryCapacity && CARRY_CAPACITY + persistentUpgrades.carryCapacity < MAX_CARRY_CAPACITY
                      ? '#1a7a4c' : '#1a7a4c80',
                    cursor: persistentFunding >= UPGRADE_COSTS.carryCapacity && CARRY_CAPACITY + persistentUpgrades.carryCapacity < MAX_CARRY_CAPACITY
                      ? 'pointer' : 'not-allowed',
                  }}
                >
                  +1 Capacity (${UPGRADE_COSTS.carryCapacity}) — {CARRY_CAPACITY + persistentUpgrades.carryCapacity}/{MAX_CARRY_CAPACITY}
                </button>
              </div>

              {/* Start Button - Blue with border frame */}
              <div className="rounded-xl p-1.5" style={{ background: '#3A7BC8' }}>
                <button
                  onClick={handleStart}
                  className="w-full py-4 text-white text-2xl font-black rounded-lg transition-all hover:brightness-110 active:scale-[0.98]"
                  style={{ background: '#4A90D9' }}
                >
                  ▶ START SHIFT
                </button>
              </div>

              {/* Footer text */}
              <p className="text-white text-sm text-center mt-4 font-bold">
                Get suspicion below {LOSE_THRESHOLD}% to pass inspection!
              </p>
              <p className="text-white/60 text-xs text-center mt-1 italic">
                &quot;They can deport people, but they can&apos;t deport community&quot;
              </p>

              {/* Reset Progress link */}
              <button
                onClick={handleResetProgress}
                className="w-full mt-4 py-1 text-white/40 text-xs hover:text-white/70 transition-colors underline"
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
          {/* Unified Top HUD Bar */}
          <div className="absolute top-0 left-0 right-0 slide-down"
               style={{
                 paddingTop: 'max(6px, calc(env(safe-area-inset-top) + 2px))',
                 paddingLeft: 'max(6px, env(safe-area-inset-left))',
                 paddingRight: 'max(6px, env(safe-area-inset-right))',
               }}>
            {/* Single unified HUD container */}
            <div className="flex items-center justify-center">
              <div className={`glass-dark rounded-full flex items-center ${isMobileLandscape ? 'gap-1 px-2 py-1' : 'gap-2 px-3 py-1.5'}`}>
                {/* Pause button */}
                <button
                  onClick={() => setIsPaused(true)}
                  className={`text-white/80 hover:text-white transition-colors ${isMobileLandscape ? 'text-sm' : 'text-base'}`}
                >
                  ⏸
                </button>

                {/* Divider */}
                <div className="w-px h-4 bg-white/20" />

                {/* Timer */}
                <div className={`text-white font-bold font-mono tabular-nums ${isMobileLandscape ? 'text-sm' : 'text-base'}`}>
                  {Math.ceil(displayState.timeRemaining)}s
                </div>

                {/* Divider */}
                <div className="w-px h-4 bg-white/20" />

                {/* Money */}
                <div className={`text-green-400 font-bold ${isMobileLandscape ? 'text-sm' : 'text-base'}`}>
                  ${displayState.totalFunding}
                </div>

                {/* Divider */}
                <div className="w-px h-4 bg-white/20" />

                {/* Forms carried */}
                <div className={`text-white ${isMobileLandscape ? 'text-sm' : 'text-base'}`}>
                  📋{displayState.player.carrying}/{displayState.player.carryCapacity}
                </div>

                {/* Divider */}
                <div className="w-px h-4 bg-white/20" />

                {/* Suspicion - inline mini bar */}
                <div className="flex items-center gap-1">
                  <div className={`bg-black/40 rounded-full overflow-hidden relative ${isMobileLandscape ? 'w-12 h-2' : 'w-16 h-2.5'}`}>
                    <div
                      className="absolute inset-y-0 left-0 transition-all duration-300 rounded-full"
                      style={{
                        width: `${suspicionPercent}%`,
                        background: suspicionPercent > WARNING_THRESHOLD
                          ? '#ef4444'
                          : suspicionPercent > LOSE_THRESHOLD
                            ? '#f59e0b'
                            : '#22c55e',
                      }}
                    />
                    <div className="absolute inset-y-0 w-0.5 bg-white/40" style={{ left: `${LOSE_THRESHOLD}%` }} />
                  </div>
                  <span className={`font-bold tabular-nums ${isMobileLandscape ? 'text-xs' : 'text-sm'} ${
                    suspicionPercent > WARNING_THRESHOLD ? 'text-red-400' :
                    suspicionPercent > LOSE_THRESHOLD ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {Math.floor(displayState.suspicion)}%
                  </span>
                </div>

                {/* Divider */}
                <div className="w-px h-4 bg-white/20" />

                {/* Mute button */}
                <button
                  onClick={toggleMute}
                  className={`text-white/80 hover:text-white transition-colors ${isMobileLandscape ? 'text-sm' : 'text-base'}`}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? '🔇' : '🔊'}
                </button>

                {/* Active powerups */}
                {displayState.sprintTimer > 0 && (
                  <>
                    <div className="w-px h-4 bg-white/20" />
                    <div className={`text-yellow-400 font-bold animate-pulse ${isMobileLandscape ? 'text-xs' : 'text-sm'}`}>
                      ⚡{Math.ceil(displayState.sprintTimer)}
                    </div>
                  </>
                )}
                {displayState.noIceTimer > 0 && (
                  <>
                    <div className="w-px h-4 bg-white/20" />
                    <div className={`text-purple-400 font-bold animate-pulse ${isMobileLandscape ? 'text-xs' : 'text-sm'}`}>
                      🛡️{Math.ceil(displayState.noIceTimer)}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Level name - small label below */}
            {!isMobileLandscape && (
              <div className="text-center mt-1">
                <span className="text-white/40 text-xs">
                  {LEVEL_SPECS[displayState.level]?.name || 'Unknown'}
                </span>
              </div>
            )}
          </div>

          {/* Pause Menu */}
          {isPaused && !showShop && !showJoystickSettings && (
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
                  <button onClick={() => setShowJoystickSettings(true)} className="w-full py-3 font-bold rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors">
                    🎮 CONTROLS
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

          {/* Joystick Settings */}
          {isPaused && showJoystickSettings && (
            <div className="absolute inset-0 flex items-center justify-center p-4 fade-in"
                 style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
              <div className="card p-6 w-full max-w-[340px] bounce-in">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-black text-gray-800">CONTROLS</h2>
                  <span className="text-gray-500 text-sm">Mobile Only</span>
                </div>

                <div className="space-y-4 mb-4">
                  {/* Joystick Side Toggle */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Joystick Side</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveJoystickSettings({ ...joystickSettings, side: 'left' })}
                        className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                          joystickSettings.side === 'left'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        ← Left
                      </button>
                      <button
                        onClick={() => saveJoystickSettings({ ...joystickSettings, side: 'right' })}
                        className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                          joystickSettings.side === 'right'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        Right →
                      </button>
                    </div>
                  </div>

                  {/* Joystick Size Slider */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Size: {joystickSettings.size}px
                    </label>
                    <input
                      type="range"
                      min="64"
                      max="140"
                      value={joystickSettings.size}
                      onChange={(e) => saveJoystickSettings({ ...joystickSettings, size: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  {/* Joystick Opacity Slider */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Opacity: {Math.round(joystickSettings.opacity * 100)}%
                    </label>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      value={joystickSettings.opacity * 100}
                      onChange={(e) => saveJoystickSettings({ ...joystickSettings, opacity: parseInt(e.target.value) / 100 })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  {/* Position from Edge */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Distance from Edge: {joystickSettings.offsetX}px
                    </label>
                    <input
                      type="range"
                      min="8"
                      max="60"
                      value={joystickSettings.offsetX}
                      onChange={(e) => saveJoystickSettings({ ...joystickSettings, offsetX: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  {/* Position from Bottom */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Distance from Bottom: {joystickSettings.offsetY}px
                    </label>
                    <input
                      type="range"
                      min="8"
                      max="80"
                      value={joystickSettings.offsetY}
                      onChange={(e) => saveJoystickSettings({ ...joystickSettings, offsetY: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  {/* Reset to defaults */}
                  <button
                    onClick={() => saveJoystickSettings({ side: 'right', size: 100, opacity: 0.6, offsetX: 20, offsetY: 24 })}
                    className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors underline"
                  >
                    Reset to Defaults
                  </button>
                </div>

                <button onClick={() => setShowJoystickSettings(false)} className="w-full py-3 font-bold rounded-xl btn-primary text-white">
                  ← BACK
                </button>
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

      {/* === MOBILE PORTRAIT ROTATE MESSAGE === */}
      {isMobilePortrait && displayState.phase !== 'menu' && (
        <div className="absolute inset-0 flex items-center justify-center p-8 z-50"
             style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
          <div className="text-center">
            <div className="text-6xl mb-4">📱</div>
            <h2 className="text-white text-2xl font-bold mb-2">Rotate Your Device</h2>
            <p className="text-white/60">Please rotate to landscape mode to play</p>
            <div className="mt-6 text-4xl animate-pulse">↻</div>
          </div>
        </div>
      )}

      {/* === MOBILE LANDSCAPE JOYSTICK === */}
      {isMobileLandscape && displayState.phase === 'playing' && !isPaused && (
        <div
          ref={joystickRef}
          className="absolute z-40 rounded-full"
          style={{
            width: joystickSettings.size,
            height: joystickSettings.size,
            ...(joystickSettings.side === 'right'
              ? { right: `max(${joystickSettings.offsetX}px, env(safe-area-inset-right))` }
              : { left: `max(${joystickSettings.offsetX}px, env(safe-area-inset-left))` }
            ),
            bottom: `calc(${joystickSettings.offsetY}px + env(safe-area-inset-bottom))`,
            background: `rgba(255, 255, 255, ${joystickSettings.opacity * 0.3})`,
            border: `3px solid rgba(255, 255, 255, ${joystickSettings.opacity})`,
            touchAction: 'none',
          }}
          onTouchStart={handleVirtualJoystickStart}
          onTouchMove={handleVirtualJoystickMove}
          onTouchEnd={handleVirtualJoystickEnd}
        >
          {/* Inner knob */}
          <div
            className="absolute rounded-full"
            style={{
              width: joystickSettings.size * 0.4,
              height: joystickSettings.size * 0.4,
              background: `rgba(255, 255, 255, ${joystickSettings.opacity})`,
              left: '50%',
              top: '50%',
              transform: `translate(calc(-50% + ${joystickPos.x}px), calc(-50% + ${joystickPos.y}px))`,
              transition: joystickActive ? 'none' : 'transform 0.1s ease-out',
            }}
          />
        </div>
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

      {/* === VISUAL EFFECTS LAYER === */}
      {/* Flash overlay */}
      {vfx.flash && (
        <div
          className="fixed inset-0 pointer-events-none z-50"
          style={{
            backgroundColor: vfx.flash.color === 'red' ? '#ef4444'
              : vfx.flash.color === 'green' ? '#22c55e'
              : vfx.flash.color === 'yellow' ? '#f59e0b'
              : '#ffffff',
            opacity: vfx.flash.opacity,
            transition: 'opacity 0.1s ease-out',
          }}
        />
      )}

      {/* Particles */}
      {vfx.particles.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {vfx.particles.map((particle) => (
            <div
              key={particle.id}
              className={`particle ${particle.type === 'confetti' ? 'particle-confetti' : particle.type === 'sparkle' ? 'particle-sparkle' : 'particle'}`}
              style={{
                left: particle.x,
                top: particle.y,
                width: particle.size,
                height: particle.size,
                backgroundColor: particle.color,
                transform: `translate(${particle.vx * 30}px, ${particle.vy * 30}px)`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
