/**
 * useAnnouncer — offline text-to-speech for pickleball score announcements.
 * Uses the browser's built-in speechSynthesis API (no network required).
 */

import { useState, useCallback, useEffect } from 'react';

type ServerNumber = 1 | 2;

const STORAGE_KEY = 'pickleball_announcer';

function getSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function loadEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

function speak(text: string): void {
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  utterance.pitch = 1.1;
  utterance.volume = 1;
  synth.speak(utterance);
}

export function useAnnouncer() {
  const isSupported = getSupported();
  const [isEnabled, setIsEnabled] = useState(loadEnabled);

  const toggle = useCallback(() => {
    setIsEnabled((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off'); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const announceScore = useCallback(
    (servingScore: number, receivingScore: number, serverNumber: ServerNumber, isFirstServe: boolean) => {
      if (!isSupported || !isEnabled) return;
      if (isFirstServe) {
        speak('Zero, zero, start');
      } else {
        speak(`${servingScore}, ${receivingScore}, ${serverNumber}`);
      }
    },
    [isSupported, isEnabled]
  );

  const announceGameOver = useCallback(
    (winnerName: string) => {
      if (!isSupported || !isEnabled) return;
      speak(`Game! ${winnerName} wins!`);
    },
    [isSupported, isEnabled]
  );

  const announceSideOut = useCallback(() => {
    if (!isSupported || !isEnabled) return;
    speak('Side out');
  }, [isSupported, isEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isSupported) window.speechSynthesis.cancel();
    };
  }, [isSupported]);

  return { announceScore, announceGameOver, announceSideOut, isEnabled, toggle, isSupported };
}
