'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { GameState, InputState, JoystickState } from '@/game/types';
import { createInitialState, createInputState, createJoystickState } from '@/game/init';
import { updateGame } from '@/game/update';
import { render } from '@/game/render';
import { setupKeyboardListeners } from '@/game/input';
import { MAP_WIDTH, MAP_HEIGHT, MAX_SUSPICION, WARNING_THRESHOLD, COLORS } from '@/game/config';

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState>(createInitialState());
  const inputStateRef = useRef<InputState>(createInputState());
  const joystickStateRef = useRef<JoystickState>(createJoystickState());
  const lastTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const gameTimeRef = useRef<number>(0);

  const [displayState, setDisplayState] = useState<GameState>(gameStateRef.current);

  // Start game
  const handleStart = useCallback(() => {
    gameStateRef.current = createInitialState();
    gameStateRef.current.phase = 'playing';
    setDisplayState({ ...gameStateRef.current });
  }, []);

  // Restart game
  const handleRestart = useCallback(() => {
    gameStateRef.current = createInitialState();
    gameStateRef.current.phase = 'playing';
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

      // Update
      if (gameStateRef.current.phase === 'playing') {
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
  }, []);

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
         style={{ backgroundColor: '#2d3436' }}>
      <div
        className="relative"
        style={{ width: MAP_WIDTH, height: MAP_HEIGHT, maxWidth: '100vw', maxHeight: '100vh' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <canvas
          ref={canvasRef}
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          className="block"
          style={{ imageRendering: 'pixelated', width: '100%', height: '100%', objectFit: 'contain' }}
        />

        {/* Menu - Construction Paper Style */}
        {displayState.phase === 'menu' && (
          <div className="absolute inset-0 flex items-center justify-center"
               style={{ backgroundColor: COLORS.classroomFloor }}>
            {/* Bulletin board background */}
            <div className="relative p-8 rounded-lg shadow-2xl"
                 style={{
                   backgroundColor: COLORS.bulletinBoard,
                   border: '8px solid #8b4513',
                   maxWidth: '420px'
                 }}>
              {/* Pushpins */}
              <div className="absolute -top-2 left-8 w-4 h-4 rounded-full bg-red-500 border-2 border-red-700" />
              <div className="absolute -top-2 right-8 w-4 h-4 rounded-full bg-blue-500 border-2 border-blue-700" />

              {/* Title card */}
              <div className="text-center p-4 mb-4 -rotate-1"
                   style={{ backgroundColor: COLORS.uiPaper }}>
                <h1 className="text-4xl font-bold mb-1"
                    style={{ fontFamily: 'Comic Sans MS, cursive', color: COLORS.uiRed }}>
                  Q-Learn
                </h1>
                <p className="text-lg" style={{ fontFamily: 'Comic Sans MS, cursive', color: COLORS.uiBlue }}>
                  Quality Learning Centers
                </p>
              </div>

              {/* Instructions card */}
              <div className="p-4 mb-4 rotate-1"
                   style={{ backgroundColor: COLORS.uiYellow }}>
                <h2 className="font-bold mb-3 text-center"
                    style={{ fontFamily: 'Comic Sans MS, cursive', color: '#333' }}>
                  How to Play
                </h2>
                <ul className="space-y-1 text-sm" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#333' }}>
                  <li>* WASD / Arrows / Touch to move</li>
                  <li>* Walk into forms to collect them</li>
                  <li>* Bring forms to the Office desk</li>
                  <li>* Survive until inspection ends!</li>
                  <li>* Watch your suspicion meter!</li>
                </ul>
              </div>

              <button
                onClick={handleStart}
                className="w-full py-3 text-white text-xl font-bold rounded transform hover:scale-105 transition-all shadow-lg"
                style={{
                  fontFamily: 'Comic Sans MS, cursive',
                  backgroundColor: COLORS.uiGreen,
                  border: '3px solid #0a8a4d'
                }}
              >
                START!
              </button>

              <p className="mt-4 text-xs text-center" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#fff' }}>
                Carry up to 3 forms * Each drop increases suspicion
              </p>
            </div>
          </div>
        )}

        {/* HUD - Construction Paper Style */}
        {displayState.phase === 'playing' && (
          <>
            {/* Top stats - paper strips */}
            <div className="absolute top-2 left-2 flex gap-2">
              {/* Enrollments */}
              <div className="px-3 py-1 -rotate-1"
                   style={{ backgroundColor: COLORS.uiGreen, fontFamily: 'Comic Sans MS, cursive' }}>
                <span className="font-bold text-white">{displayState.enrollments}</span>
                <span className="text-white/80 ml-1 text-sm">enrolled</span>
              </div>

              {/* Funding */}
              <div className="px-3 py-1 rotate-1"
                   style={{ backgroundColor: COLORS.uiYellow, fontFamily: 'Comic Sans MS, cursive' }}>
                <span className="font-bold text-gray-800">${displayState.funding}</span>
                <span className="text-gray-700 ml-1 text-sm">funding</span>
              </div>

              {/* Forms carried */}
              <div className="px-3 py-1 -rotate-1"
                   style={{ backgroundColor: COLORS.uiBlue, fontFamily: 'Comic Sans MS, cursive' }}>
                <span className="font-bold text-white">{displayState.player.carrying}/{displayState.player.carryCapacity}</span>
                <span className="text-white/80 ml-1 text-sm">forms</span>
              </div>
            </div>

            {/* Timer */}
            <div className="absolute top-2 right-14 px-3 py-1"
                 style={{ backgroundColor: COLORS.uiPaper, fontFamily: 'Comic Sans MS, cursive' }}>
              <span className="font-bold text-xl" style={{ color: COLORS.uiCrayon }}>
                {Math.ceil(displayState.timeRemaining)}s
              </span>
            </div>

            {/* Suspicion meter - crayon thermometer style */}
            <div className="absolute top-12 right-2 w-8 h-44 rounded-full overflow-hidden border-4"
                 style={{ backgroundColor: COLORS.uiPaper, borderColor: COLORS.uiCrayon }}>
              <div
                className="absolute bottom-0 left-0 right-0 transition-all duration-300"
                style={{
                  height: `${suspicionPercent}%`,
                  backgroundColor: suspicionPercent > WARNING_THRESHOLD
                    ? COLORS.uiRed
                    : suspicionPercent > 50
                      ? COLORS.uiYellow
                      : COLORS.uiGreen,
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-bold text-xs [writing-mode:vertical-rl] rotate-180"
                      style={{ fontFamily: 'Comic Sans MS, cursive', color: COLORS.uiCrayon }}>
                  {Math.floor(displayState.suspicion)}%
                </span>
              </div>
            </div>
          </>
        )}

        {/* End Screen - Construction Paper Style */}
        {(isWin || isLose) && (
          <div className="absolute inset-0 flex items-center justify-center"
               style={{ backgroundColor: isWin ? 'rgba(29, 209, 161, 0.9)' : 'rgba(255, 107, 107, 0.9)' }}>
            <div className="p-8 rounded-lg shadow-2xl max-w-md"
                 style={{
                   backgroundColor: COLORS.uiPaper,
                   border: `6px solid ${isWin ? COLORS.uiGreen : COLORS.uiRed}`,
                   transform: 'rotate(-1deg)'
                 }}>
              <h1 className="text-4xl font-bold mb-4 text-center"
                  style={{
                    fontFamily: 'Comic Sans MS, cursive',
                    color: isWin ? COLORS.uiGreen : COLORS.uiRed
                  }}>
                {isWin ? 'INSPECTION PASSED!' : 'BUSTED!'}
              </h1>

              <p className="text-lg mb-6 text-center"
                 style={{ fontFamily: 'Comic Sans MS, cursive', color: COLORS.uiCrayon }}>
                {isWin
                  ? 'You survived! Quality outcomes achieved.'
                  : 'Suspicion too high! Investigation started.'}
              </p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-3 text-center -rotate-1" style={{ backgroundColor: COLORS.uiGreen }}>
                  <div className="text-2xl font-bold text-white">{displayState.enrollments}</div>
                  <div className="text-xs text-white/80" style={{ fontFamily: 'Comic Sans MS, cursive' }}>Enrollments</div>
                </div>
                <div className="p-3 text-center rotate-1" style={{ backgroundColor: COLORS.uiYellow }}>
                  <div className="text-2xl font-bold text-gray-800">${displayState.funding}</div>
                  <div className="text-xs text-gray-700" style={{ fontFamily: 'Comic Sans MS, cursive' }}>Funding</div>
                </div>
                <div className="p-3 text-center rotate-1" style={{ backgroundColor: COLORS.uiRed }}>
                  <div className="text-2xl font-bold text-white">{Math.floor(displayState.suspicion)}%</div>
                  <div className="text-xs text-white/80" style={{ fontFamily: 'Comic Sans MS, cursive' }}>Suspicion</div>
                </div>
                <div className="p-3 text-center -rotate-1" style={{ backgroundColor: COLORS.uiBlue }}>
                  <div className="text-2xl font-bold text-white">{Math.ceil(displayState.timeRemaining)}s</div>
                  <div className="text-xs text-white/80" style={{ fontFamily: 'Comic Sans MS, cursive' }}>Time Left</div>
                </div>
              </div>

              <button
                onClick={handleRestart}
                className="w-full py-3 text-white text-xl font-bold rounded transform hover:scale-105 transition-all shadow-lg"
                style={{
                  fontFamily: 'Comic Sans MS, cursive',
                  backgroundColor: isWin ? COLORS.uiGreen : COLORS.uiRed,
                  border: `3px solid ${isWin ? '#0a8a4d' : '#cc5555'}`
                }}
              >
                PLAY AGAIN!
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls hint */}
      {displayState.phase === 'playing' && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 text-xs hidden md:block"
             style={{
               backgroundColor: COLORS.uiPaper,
               fontFamily: 'Comic Sans MS, cursive',
               color: COLORS.uiCrayon
             }}>
          WASD / Arrows to move * Walk into forms * Go to Office to drop off
        </div>
      )}
    </div>
  );
}
