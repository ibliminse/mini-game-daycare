'use client';

import { useState, useCallback, useRef } from 'react';

export type FlashColor = 'red' | 'green' | 'yellow' | 'white';

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  type: 'confetti' | 'sparkle' | 'dust';
}

export interface VisualEffectsState {
  shakeIntensity: number;
  flashColor: FlashColor | null;
  flashOpacity: number;
  particles: Particle[];
  pulseElement: string | null;
}

export function useVisualEffects() {
  const [shake, setShake] = useState(0);
  const [flash, setFlash] = useState<{ color: FlashColor; opacity: number } | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [pulse, setPulse] = useState<string | null>(null);
  const particleIdRef = useRef(0);
  const shakeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Screen shake effect
  const triggerShake = useCallback((intensity: number = 5, duration: number = 300) => {
    setShake(intensity);

    if (shakeTimeoutRef.current) {
      clearTimeout(shakeTimeoutRef.current);
    }

    shakeTimeoutRef.current = setTimeout(() => {
      setShake(0);
    }, duration);
  }, []);

  // Screen flash effect
  const triggerFlash = useCallback((color: FlashColor, opacity: number = 0.3, duration: number = 150) => {
    setFlash({ color, opacity });

    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
    }

    flashTimeoutRef.current = setTimeout(() => {
      setFlash(null);
    }, duration);
  }, []);

  // Spawn particles at a position (relative to viewport)
  const spawnParticles = useCallback((
    x: number,
    y: number,
    count: number,
    type: 'confetti' | 'sparkle' | 'dust',
    colors: string[] = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']
  ) => {
    const newParticles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 4;

      newParticles.push({
        id: particleIdRef.current++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2, // Slight upward bias
        color: colors[Math.floor(Math.random() * colors.length)],
        size: type === 'sparkle' ? 4 + Math.random() * 4 : 6 + Math.random() * 6,
        life: 1,
        maxLife: 0.8 + Math.random() * 0.4,
        type,
      });
    }

    setParticles(prev => [...prev, ...newParticles]);

    // Auto-cleanup after animation
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 1000);
  }, []);

  // Trigger pulse animation on an element
  const triggerPulse = useCallback((elementId: string, duration: number = 300) => {
    setPulse(elementId);
    setTimeout(() => setPulse(null), duration);
  }, []);

  // Combined effect for common scenarios
  const onCollectForm = useCallback((x: number, y: number) => {
    spawnParticles(x, y, 6, 'confetti', ['#FFFFFF', '#F5F5DC', '#FFFAF0', '#FFF8DC']);
  }, [spawnParticles]);

  const onDropOff = useCallback((x: number, y: number) => {
    triggerFlash('green', 0.2, 200);
    spawnParticles(x, y, 12, 'sparkle', ['#FFD700', '#FFA500', '#32CD32', '#00FF00']);
  }, [triggerFlash, spawnParticles]);

  const onIceSpawn = useCallback(() => {
    triggerShake(8, 400);
    triggerFlash('red', 0.25, 300);
  }, [triggerShake, triggerFlash]);

  const onSuspicionCritical = useCallback(() => {
    triggerFlash('red', 0.15, 200);
    triggerShake(3, 200);
  }, [triggerFlash, triggerShake]);

  const onLose = useCallback(() => {
    triggerShake(12, 500);
    triggerFlash('red', 0.4, 400);
  }, [triggerShake, triggerFlash]);

  const onWin = useCallback((x: number, y: number) => {
    triggerFlash('green', 0.3, 300);
    spawnParticles(x, y, 20, 'sparkle', ['#FFD700', '#FFA500', '#32CD32', '#00CED1', '#FF69B4']);
  }, [triggerFlash, spawnParticles]);

  const onPowerUp = useCallback(() => {
    triggerFlash('yellow', 0.2, 150);
    triggerPulse('hud', 300);
  }, [triggerFlash, triggerPulse]);

  return {
    // State
    shake,
    flash,
    particles,
    pulse,

    // Low-level triggers
    triggerShake,
    triggerFlash,
    spawnParticles,
    triggerPulse,

    // High-level event triggers
    onCollectForm,
    onDropOff,
    onIceSpawn,
    onSuspicionCritical,
    onLose,
    onWin,
    onPowerUp,
  };
}
