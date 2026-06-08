/**
 * useVoiceControl — Web Speech API hook for hands-free pickleball scoring.
 *
 * Commands recognised (case-insensitive, partial match):
 *   Score Team A  → "point a" | "team a" | "score a" | "green" | "a point" | "a score"
 *   Score Team B  → "point b" | "team b" | "score b" | "blue"  | "b point" | "b score"
 *   Undo          → "undo" | "back" | "cancel"
 *   Reset         → "reset" | "new game" | "restart"
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export type VoiceStatus = 'idle' | 'listening' | 'processing' | 'error' | 'unsupported';

export interface VoiceCommand {
  transcript: string;
  action: 'SCORE_A' | 'SCORE_B' | 'UNDO' | 'RESET' | 'UNKNOWN';
}

interface UseVoiceControlOptions {
  onScoreA: () => void;
  onScoreB: () => void;
  onUndo: () => void;
  onReset: () => void;
  /** Player/team names to aid recognition (optional) */
  teamAName?: string;
  teamBName?: string;
}

export interface UseVoiceControlReturn {
  status: VoiceStatus;
  lastCommand: VoiceCommand | null;
  isListening: boolean;
  isSupported: boolean;
  toggleListening: () => void;
  stopListening: () => void;
}

// Minimal typed interface for the browser Speech Recognition API
interface ISpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}

type ISpeechRecognitionCtor = new () => ISpeechRecognition;

function getSpeechRecognitionCtor(): ISpeechRecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as ISpeechRecognitionCtor | undefined;
}

function classify(raw: string, teamAName = '', teamBName = ''): VoiceCommand['action'] {
  const t = raw.toLowerCase().trim();

  // Reset / new game
  if (/reset|new game|restart/.test(t)) return 'RESET';

  // Undo
  if (/undo|go back|take back|cancel|remove point/.test(t)) return 'UNDO';

  // Team A scoring — generic + custom name support
  const aPatterns = ['point a', 'team a', 'score a', 'a point', 'a score', 'green'];
  if (teamAName) aPatterns.push(teamAName.toLowerCase());
  if (aPatterns.some(p => t.includes(p))) return 'SCORE_A';

  // Team B scoring — generic + custom name support
  const bPatterns = ['point b', 'team b', 'score b', 'b point', 'b score', 'blue'];
  if (teamBName) bPatterns.push(teamBName.toLowerCase());
  if (bPatterns.some(p => t.includes(p))) return 'SCORE_B';

  return 'UNKNOWN';
}

export function useVoiceControl({
  onScoreA,
  onScoreB,
  onUndo,
  onReset,
  teamAName = '',
  teamBName = '',
}: UseVoiceControlOptions): UseVoiceControlReturn {
  const Ctor = getSpeechRecognitionCtor();
  const isSupported = !!Ctor;

  const [status, setStatus] = useState<VoiceStatus>(isSupported ? 'idle' : 'unsupported');
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
  const recogRef = useRef<ISpeechRecognition | null>(null);
  const listeningRef = useRef(false);

  const handleResult = useCallback(
    (transcript: string) => {
      const action = classify(transcript, teamAName, teamBName);
      setLastCommand({ transcript, action });
      setStatus('processing');

      switch (action) {
        case 'SCORE_A': onScoreA(); break;
        case 'SCORE_B': onScoreB(); break;
        case 'UNDO':    onUndo();   break;
        case 'RESET':   onReset();  break;
        default: break;
      }

      // Brief processing flash, then back to listening
      setTimeout(() => {
        if (listeningRef.current) setStatus('listening');
      }, 600);
    },
    [onScoreA, onScoreB, onUndo, onReset, teamAName, teamBName]
  );

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    recogRef.current?.abort();
    recogRef.current = null;
    setStatus('idle');
  }, []);

  const startListening = useCallback(() => {
    if (!Ctor) return;

    listeningRef.current = true;
    setStatus('listening');

    const recognition = new Ctor();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const idx = event.results.length - 1;
      const result = event.results[idx];
      if (result?.isFinal) {
        const alt = result[0];
        if (alt) handleResult(alt.transcript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      console.warn('[VoiceControl] error:', event.error);
      setStatus('error');
      listeningRef.current = false;
    };

    recognition.onend = () => {
      // Auto-restart while listening is active (browser stops after silence)
      if (listeningRef.current) {
        try {
          recognition.start();
        } catch {
          // ignore "already started" race
        }
      }
    };

    recognition.start();
    recogRef.current = recognition;
  }, [Ctor, handleResult]);

  const toggleListening = useCallback(() => {
    if (listeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      listeningRef.current = false;
      recogRef.current?.abort();
    };
  }, []);

  return {
    status,
    lastCommand,
    isListening: listeningRef.current,
    isSupported,
    toggleListening,
    stopListening,
  };
}
