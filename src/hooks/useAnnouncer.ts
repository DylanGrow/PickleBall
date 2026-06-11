/**
 * useAnnouncer — offline text-to-speech for pickleball score announcements.
 * Uses the browser's built-in speechSynthesis API (no network required).
 *
 * Edge-safe: guards against rapid cancel/speak calls that crash Edge's
 * speech engine. Announcer defaults to OFF — user must opt in.
 */

import { useState, useCallback, useEffect, useRef } from 'react';

type ServerNumber = 1 | 2;

const STORAGE_KEY = 'pickleball_announcer';

function getSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function loadEnabled(): boolean {
  try {
    // Default OFF — user must opt in
    return localStorage.getItem(STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
}

export function useAnnouncer() {
  const isSupported = getSupported();
  const [isEnabled, setIsEnabled] = useState(loadEnabled);
  const speakingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const safeSay = useCallback((text: string) => {
    if (!isSupported) return;

    // Debounce: don't overlap rapid calls (Edge crash prevention)
    if (speakingRef.current) return;

    try {
      const synth = window.speechSynthesis;
      // Cancel safely — some Edge versions throw on cancel()
      try { synth.cancel(); } catch { /* ignore */ }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      utterance.volume = 1;

      speakingRef.current = true;
      utterance.onend = () => { speakingRef.current = false; };
      utterance.onerror = () => { speakingRef.current = false; };

      // Small delay before speaking — Edge needs a tick after cancel()
      timeoutRef.current = setTimeout(() => {
        try { synth.speak(utterance); } catch { speakingRef.current = false; }
      }, 50);
    } catch {
      speakingRef.current = false;
    }
  }, [isSupported]);

  const toggle = useCallback(() => {
    setIsEnabled((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off'); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const announceScore = useCallback(
    (servingScore: number, receivingScore: number, serverNumber: ServerNumber, isFirstServe: boolean) => {
      if (!isEnabled) return;
      if (isFirstServe) {
        safeSay('Zero, zero, start');
      } else {
        safeSay(`${servingScore}, ${receivingScore}, ${serverNumber}`);
      }
    },
    [isEnabled, safeSay]
  );

  const announceGameOver = useCallback(
    (winnerName: string) => {
      if (!isEnabled) return;
      safeSay(`Game! ${winnerName} wins!`);
    },
    [isEnabled, safeSay]
  );

  const announceSideOut = useCallback(() => {
    if (!isEnabled) return;
    safeSay('Side out');
  }, [isEnabled, safeSay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      try { if (isSupported) window.speechSynthesis.cancel(); } catch { /* ignore */ }
    };
  }, [isSupported]);

  return { announceScore, announceGameOver, announceSideOut, isEnabled, toggle, isSupported };
}
