'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { GameState, InputState, JoystickState } from '@/game/types';
import { createInitialState, createInputState, createJoystickState } from '@/game/init';
import { updateGame } from '@/game/update';
import { render } from '@/game/render';
import { setupKeyboardListeners } from '@/game/input';
import { MAP_WIDTH, MAP_HEIGHT, MAX_SUSPICION, WARNING_THRESHOLD } from '@/game/config';

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
    <div className="relative w-screen h-screen flex items-center justify-center bg-gray-900 overflow-hidden select-none">
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
          className="bg-white block"
          style={{ imageRendering: 'pixelated', width: '100%', height: '100%', objectFit: 'contain' }}
        />

        {/* Menu */}
        {displayState.phase === 'menu' && (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
            <div className="text-center p-8 max-w-md">
              <h1 className="text-5xl font-bold text-white mb-2">
                Q-Learn<span className="text-sm align-top">™</span>
              </h1>
              <p className="text-xl text-blue-200 mb-8">Quality Learning Centers</p>

              <div className="bg-white/10 rounded-lg p-6 mb-8 text-left">
                <h2 className="font-bold text-white mb-4 text-center">How to Play</h2>
                <ul className="space-y-2 text-sm text-blue-100">
                  <li>• <strong>Move:</strong> WASD / Arrow Keys / Touch drag</li>
                  <li>• <strong>Collect:</strong> Walk into Enrollment Forms</li>
                  <li>• <strong>Drop off:</strong> Enter the Enrollment Desk</li>
                  <li>• <strong>Goal:</strong> Survive until inspection ends</li>
                  <li>• <strong>Warning:</strong> Suspicion rises over time!</li>
                </ul>
              </div>

              <button
                onClick={handleStart}
                className="px-12 py-4 bg-green-500 hover:bg-green-400 text-white text-xl font-bold rounded-lg transform hover:scale-105 transition-all shadow-lg"
              >
                START
              </button>

              <p className="mt-6 text-xs text-blue-300">
                Carry up to 3 forms • Each drop increases suspicion
              </p>
            </div>
          </div>
        )}

        {/* HUD */}
        {displayState.phase === 'playing' && (
          <>
            {/* Top stats bar */}
            <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-black/70 to-transparent flex items-center justify-between px-4">
              <div className="flex gap-6 text-white text-sm">
                <div>
                  <span className="text-green-400 font-bold">{displayState.enrollments}</span>
                  <span className="text-white/60 ml-1">enrolled</span>
                </div>
                <div>
                  <span className="text-yellow-400 font-bold">${displayState.funding}</span>
                  <span className="text-white/60 ml-1">funding</span>
                </div>
                <div>
                  <span className="text-blue-400 font-bold">{displayState.player.carrying}/{displayState.player.carryCapacity}</span>
                  <span className="text-white/60 ml-1">forms</span>
                </div>
              </div>
              <div className="text-white font-mono text-lg">
                {Math.ceil(displayState.timeRemaining)}s
              </div>
            </div>

            {/* Suspicion meter (vertical, right side) */}
            <div className="absolute top-14 right-3 w-6 h-40 bg-black/50 rounded-full overflow-hidden border border-white/20">
              <div
                className="absolute bottom-0 left-0 right-0 transition-all duration-300"
                style={{
                  height: `${suspicionPercent}%`,
                  backgroundColor: suspicionPercent > WARNING_THRESHOLD ? '#ef4444' : suspicionPercent > 50 ? '#f59e0b' : '#22c55e',
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-xs font-bold [writing-mode:vertical-rl] rotate-180">
                  {Math.floor(displayState.suspicion)}%
                </span>
              </div>
            </div>
          </>
        )}

        {/* End Screen */}
        {(isWin || isLose) && (
          <div className={`absolute inset-0 flex items-center justify-center ${isWin ? 'bg-green-900/90' : 'bg-red-900/90'}`}>
            <div className="text-center p-8 max-w-md">
              <h1 className={`text-5xl font-bold mb-4 ${isWin ? 'text-green-300' : 'text-red-300'}`}>
                {isWin ? 'INSPECTION PASSED!' : 'BUSTED!'}
              </h1>

              <p className="text-xl text-white/80 mb-8">
                {isWin
                  ? 'You survived the inspection. Quality outcomes achieved.'
                  : 'Suspicion reached critical levels. Investigation initiated.'}
              </p>

              <div className="bg-black/30 rounded-lg p-6 mb-8">
                <h2 className="text-white font-bold mb-4">Final Stats</h2>
                <div className="grid grid-cols-2 gap-4 text-white/90">
                  <div>
                    <div className="text-2xl font-bold text-green-400">{displayState.enrollments}</div>
                    <div className="text-xs text-gray-400">Enrollments</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-400">${displayState.funding}</div>
                    <div className="text-xs text-gray-400">Funding</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-400">{Math.floor(displayState.suspicion)}%</div>
                    <div className="text-xs text-gray-400">Final Suspicion</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-400">{Math.ceil(displayState.timeRemaining)}s</div>
                    <div className="text-xs text-gray-400">Time Remaining</div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleRestart}
                className={`px-12 py-4 text-white text-xl font-bold rounded-lg transform hover:scale-105 transition-all shadow-lg ${
                  isWin ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                PLAY AGAIN
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls hint */}
      {displayState.phase === 'playing' && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white/50 text-xs hidden md:block">
          WASD / Arrows to move • Walk into forms to collect • Enter desk to drop
        </div>
      )}
    </div>
  );
}
