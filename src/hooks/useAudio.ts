'use client';

import { useRef, useCallback, useEffect, useState } from 'react';

export type MusicTrack = 'menu' | 'gameplay' | 'none';

// Free music sources (royalty-free from Pixabay)
const MUSIC_URLS = {
  // Somali-inspired/African rhythmic music for menu
  menu: 'https://cdn.pixabay.com/audio/2024/02/14/audio_08e717c8b5.mp3', // African drums
  // Action/USA style music for gameplay
  gameplay: 'https://cdn.pixabay.com/audio/2022/10/25/audio_b58b39f06e.mp3', // Upbeat action
};

export function useAudio() {
  const menuAudioRef = useRef<HTMLAudioElement | null>(null);
  const gameAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(true); // Start muted for browser autoplay
  const [currentTrack, setCurrentTrack] = useState<MusicTrack>('none');
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize audio elements
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check saved mute preference
    const savedMute = localStorage.getItem('qlearn_muted');
    if (savedMute !== null) {
      setIsMuted(savedMute === 'true');
    }

    // Create audio elements
    menuAudioRef.current = new Audio(MUSIC_URLS.menu);
    menuAudioRef.current.loop = true;
    menuAudioRef.current.volume = 0.3;

    gameAudioRef.current = new Audio(MUSIC_URLS.gameplay);
    gameAudioRef.current.loop = true;
    gameAudioRef.current.volume = 0.25;

    // Preload
    menuAudioRef.current.load();
    gameAudioRef.current.load();

    setIsLoaded(true);

    return () => {
      menuAudioRef.current?.pause();
      gameAudioRef.current?.pause();
    };
  }, []);

  // Save mute preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('qlearn_muted', String(isMuted));
    }
  }, [isMuted]);

  const playTrack = useCallback((track: MusicTrack) => {
    if (!isLoaded) return;

    // Stop all tracks first
    if (menuAudioRef.current) {
      menuAudioRef.current.pause();
      menuAudioRef.current.currentTime = 0;
    }
    if (gameAudioRef.current) {
      gameAudioRef.current.pause();
      gameAudioRef.current.currentTime = 0;
    }

    setCurrentTrack(track);

    if (isMuted || track === 'none') return;

    // Play the requested track
    const audio = track === 'menu' ? menuAudioRef.current : gameAudioRef.current;
    if (audio) {
      audio.play().catch(() => {
        // Autoplay blocked - user needs to interact first
      });
    }
  }, [isLoaded, isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev;

      // If unmuting, try to play current track
      if (!newMuted && currentTrack !== 'none') {
        const audio = currentTrack === 'menu' ? menuAudioRef.current : gameAudioRef.current;
        if (audio) {
          audio.play().catch(() => {});
        }
      } else {
        // Muting - pause all
        menuAudioRef.current?.pause();
        gameAudioRef.current?.pause();
      }

      return newMuted;
    });
  }, [currentTrack]);

  const setVolume = useCallback((volume: number) => {
    if (menuAudioRef.current) menuAudioRef.current.volume = volume * 0.3;
    if (gameAudioRef.current) gameAudioRef.current.volume = volume * 0.25;
  }, []);

  return {
    playTrack,
    toggleMute,
    setVolume,
    isMuted,
    currentTrack,
    isLoaded,
  };
}
