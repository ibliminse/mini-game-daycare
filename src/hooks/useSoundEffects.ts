'use client';

import { useRef, useCallback, useEffect } from 'react';

type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle';

// Haptic feedback utility - vibrates on supported devices
const vibrate = (pattern: number | number[]) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Vibration not supported or failed
    }
  }
};

export function useSoundEffects(isMuted: boolean) {
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize AudioContext on first user interaction
  const getContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    // Resume if suspended (browser autoplay policy)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  // Base function to play a tone
  const playTone = useCallback((
    frequency: number,
    duration: number,
    type: OscillatorType = 'square',
    volume: number = 0.3,
    fadeOut: boolean = true
  ) => {
    if (isMuted) return;

    const ctx = getContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);

    if (fadeOut) {
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    }

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }, [isMuted, getContext]);

  // Play a sequence of tones (for melodies)
  const playSequence = useCallback((
    notes: { freq: number; duration: number; delay: number }[],
    type: OscillatorType = 'square',
    volume: number = 0.2
  ) => {
    if (isMuted) return;

    const ctx = getContext();

    notes.forEach(({ freq, duration, delay }) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      gainNode.gain.setValueAtTime(volume, ctx.currentTime + delay);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + duration);

      oscillator.start(ctx.currentTime + delay);
      oscillator.stop(ctx.currentTime + delay + duration);
    });
  }, [isMuted, getContext]);

  // === SOUND EFFECTS ===

  // Collect form - quick paper shuffle sound
  const playCollect = useCallback(() => {
    vibrate(15); // Light tap
    if (isMuted) return;
    const ctx = getContext();

    // White noise burst for paper sound
    const bufferSize = ctx.sampleRate * 0.05;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noise = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    noise.buffer = buffer;
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2000, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();

    // Add a subtle pitch bend
    playTone(800, 0.05, 'sine', 0.1);
  }, [isMuted, getContext, playTone]);

  // Drop off forms - cash register / cha-ching
  const playDropOff = useCallback(() => {
    vibrate([20, 40, 30]); // Double tap - success feeling
    playSequence([
      { freq: 1200, duration: 0.08, delay: 0 },
      { freq: 1600, duration: 0.08, delay: 0.08 },
      { freq: 2000, duration: 0.15, delay: 0.16 },
    ], 'square', 0.15);

    // Add a bell-like sine wave
    playSequence([
      { freq: 2400, duration: 0.3, delay: 0.16 },
    ], 'sine', 0.1);
  }, [playSequence]);

  // ICE spawns - alert siren
  const playIceAlert = useCallback(() => {
    vibrate([50, 30, 50, 30, 100]); // Alert pattern
    if (isMuted) return;

    const ctx = getContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sawtooth';
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);

    // Siren sweep up and down
    oscillator.frequency.setValueAtTime(400, ctx.currentTime);
    oscillator.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.15);
    oscillator.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.3);
    oscillator.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.45);

    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
  }, [isMuted, getContext]);

  // Suspicion warning (50%+) - tension sound
  const playSuspicionWarning = useCallback(() => {
    vibrate(30); // Warning tap
    playSequence([
      { freq: 200, duration: 0.15, delay: 0 },
      { freq: 250, duration: 0.15, delay: 0.2 },
    ], 'sawtooth', 0.12);
  }, [playSequence]);

  // Suspicion critical (75%+) - heartbeat
  const playSuspicionCritical = useCallback(() => {
    vibrate([40, 80, 60]); // Heartbeat pattern
    // Double beat like a heartbeat
    playTone(80, 0.1, 'sine', 0.3);
    setTimeout(() => {
      if (!isMuted) playTone(60, 0.15, 'sine', 0.25);
    }, 120);
  }, [isMuted, playTone]);

  // Win - victory fanfare
  const playWin = useCallback(() => {
    vibrate([30, 50, 30, 50, 30, 50, 100]); // Celebration pattern
    playSequence([
      { freq: 523, duration: 0.15, delay: 0 },      // C5
      { freq: 659, duration: 0.15, delay: 0.15 },   // E5
      { freq: 784, duration: 0.15, delay: 0.3 },    // G5
      { freq: 1047, duration: 0.4, delay: 0.45 },   // C6
    ], 'square', 0.15);

    // Add harmonics
    playSequence([
      { freq: 1047, duration: 0.5, delay: 0.45 },
    ], 'sine', 0.1);
  }, [playSequence]);

  // Lose - failure sound
  const playLose = useCallback(() => {
    vibrate([100, 50, 200]); // Heavy thud
    playSequence([
      { freq: 400, duration: 0.2, delay: 0 },
      { freq: 350, duration: 0.2, delay: 0.2 },
      { freq: 300, duration: 0.2, delay: 0.4 },
      { freq: 200, duration: 0.4, delay: 0.6 },
    ], 'sawtooth', 0.15);
  }, [playSequence]);

  // Buy power-up - purchase confirmation
  const playPurchase = useCallback(() => {
    vibrate([15, 30, 25]); // Quick confirmation
    playSequence([
      { freq: 600, duration: 0.08, delay: 0 },
      { freq: 800, duration: 0.08, delay: 0.08 },
      { freq: 1000, duration: 0.12, delay: 0.16 },
    ], 'triangle', 0.2);
  }, [playSequence]);

  // Power-up activated - boost sound
  const playPowerUp = useCallback(() => {
    vibrate([20, 20, 30, 20, 50]); // Rising intensity
    if (isMuted) return;

    const ctx = getContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);

    // Rising sweep
    oscillator.frequency.setValueAtTime(300, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.2);

    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.25);
  }, [isMuted, getContext]);

  // Button click - UI feedback
  const playClick = useCallback(() => {
    vibrate(10); // Micro tap
    playTone(800, 0.05, 'square', 0.1);
  }, [playTone]);

  // Menu navigation
  const playMenuSelect = useCallback(() => {
    vibrate(8); // Subtle tap
    playTone(600, 0.08, 'triangle', 0.15);
  }, [playTone]);

  return {
    playCollect,
    playDropOff,
    playIceAlert,
    playSuspicionWarning,
    playSuspicionCritical,
    playWin,
    playLose,
    playPurchase,
    playPowerUp,
    playClick,
    playMenuSelect,
  };
}
