import { useState, useCallback, useEffect, useRef } from 'react';
import { useGameState } from './hooks/useGameState';
import { useAnnouncer } from './hooks/useAnnouncer';
import { ScorePanel } from './components/ScorePanel';
import { CourtDiagram } from './components/CourtDiagram';
import { SettingsModal } from './components/SettingsModal';
import type { PlayerNames } from './types/game';

function triggerHaptic() {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(40);
    } catch {
      // ignore haptics failures on unsupported browsers
    }
  }
}

export default function App() {
  const { state, dispatch } = useGameState();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const announcer = useAnnouncer();

  const { current, gameOver, winner, winScore, playerNames, history } = state;
  const { teamA, teamB, serve } = current;

  // Track previous state to detect changes for announcements
  const prevRef = useRef(current);

  const handleScoreA = useCallback(() => {
    triggerHaptic();
    dispatch({ type: 'SCORE_POINT', team: 'teamA' });
  }, [dispatch]);

  const handleScoreB = useCallback(() => {
    triggerHaptic();
    dispatch({ type: 'SCORE_POINT', team: 'teamB' });
  }, [dispatch]);

  const handleUndo = useCallback(() => {
    triggerHaptic();
    dispatch({ type: 'UNDO' });
  }, [dispatch]);

  const handleReset = useCallback(() => {
    const isGameFresh = teamA.score === 0 && teamB.score === 0 && history.length === 0;
    if (gameOver || isGameFresh || window.confirm('Reset the game? This cannot be undone.')) {
      triggerHaptic();
      dispatch({ type: 'RESET' });
    }
  }, [dispatch, gameOver, teamA.score, teamB.score, history.length]);

  // Screen Wake Lock API to prevent device sleeping during games
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      try {
        if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.warn('Wake Lock request failed:', err);
      }
    };

    const handleVisibilityChange = async () => {
      if (wakeLock !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };

    requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, []);

  // Global keyboard shortcuts for tabletop/referee control
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === '1' || key === 'a') {
        if (!gameOver) handleScoreA();
      } else if (key === '2' || key === 'b') {
        if (!gameOver) handleScoreB();
      } else if (key === 'u') {
        if (history.length > 0) handleUndo();
      } else if (key === 'r') {
        handleReset();
      } else if (key === 's') {
        setSettingsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver, history.length, handleScoreA, handleScoreB, handleUndo, handleReset]);

  const handleSaveSettings = useCallback(
    (names: PlayerNames, score: number) => {
      dispatch({ type: 'SET_NAMES', names });
      dispatch({ type: 'SET_WIN_SCORE', score });
    },
    [dispatch]
  );

  // Announce score changes
  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = current;

    // Skip the initial render
    if (prev === current) return;

    if (gameOver && winner) {
      const winnerLabel = winner === 'teamA' ? 'Team A' : 'Team B';
      announcer.announceGameOver(winnerLabel);
      return;
    }

    // Detect side-out: serving team changed
    const sideOut = prev.serve.servingTeam !== current.serve.servingTeam;

    if (sideOut) {
      announcer.announceSideOut();
      // Announce new score after a short delay
      setTimeout(() => {
        const servingScore = serve.servingTeam === 'teamA' ? teamA.score : teamB.score;
        const receivingScore = serve.servingTeam === 'teamA' ? teamB.score : teamA.score;
        announcer.announceScore(servingScore, receivingScore, serve.serverNumber, current.isFirstServe);
      }, 800);
    } else {
      // Score changed — announce immediately
      const servingScore = serve.servingTeam === 'teamA' ? teamA.score : teamB.score;
      const receivingScore = serve.servingTeam === 'teamA' ? teamB.score : teamA.score;
      announcer.announceScore(servingScore, receivingScore, serve.serverNumber, current.isFirstServe);
    }
  }, [current, gameOver, winner, serve, teamA, teamB, announcer]);

  const winnerLabel = winner === 'teamA' ? 'Team A' : 'Team B';
  const servingTeamData = serve.servingTeam === 'teamA' ? teamA : teamB;

  const serveInfo = (() => {
    const player =
      servingTeamData.player1.id === serve.servingPlayerId
        ? servingTeamData.player1
        : servingTeamData.player2;
    return serve.servingTeam === 'teamA'
      ? 'Team A — Server ' + String(serve.serverNumber) + ': ' + player.name
      : 'Team B — Server ' + String(serve.serverNumber) + ': ' + player.name;
  })();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col safe-area-bottom">
      <header className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 safe-area-top">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-7 h-7" aria-hidden="true">
              <circle cx="12" cy="12" r="10" fill="#16a34a" />
              <path d="M12 6 C9 6 6 9 6 12" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              <path d="M12 6 C15 6 18 9 18 12" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              <path d="M6 12 C6 15 9 18 12 18" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              <path d="M18 12 C18 15 15 18 12 18" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              <circle cx="12" cy="12" r="2" fill="white" />
            </svg>
            <span className="font-black text-lg tracking-tight text-white">Pickleball</span>
            <span className="text-zinc-500 text-sm font-medium hidden sm:inline">Scorekeeper</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-xs hidden sm:inline">
              {'Rally #' + String(current.rallyCount)}
            </span>

            {/* Announcer toggle button */}
            {announcer.isSupported && (
              <button
                type="button"
                onClick={announcer.toggle}
                className={`p-2 rounded-lg transition-colors ${
                  announcer.isEnabled
                    ? 'text-yellow-300 bg-yellow-950/60 hover:bg-yellow-900/60'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                }`}
                aria-label={announcer.isEnabled ? 'Disable announcer' : 'Enable announcer'}
                title={announcer.isEnabled ? 'Announcer ON' : 'Announcer OFF'}
              >
                {announcer.isEnabled ? (
                  /* Speaker on icon */
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                    <path d="M10 3.75a.75.75 0 00-1.264-.546L4.703 7H3.167a.75.75 0 00-.7.48A6.985 6.985 0 002 10c0 .887.165 1.737.468 2.52.111.29.39.48.7.48h1.535l4.033 3.796A.75.75 0 0010 16.25V3.75zM15.95 5.05a.75.75 0 00-1.06 1.06 5.5 5.5 0 010 7.78.75.75 0 001.06 1.06 7 7 0 000-9.9z" />
                    <path d="M13.829 7.172a.75.75 0 00-1.061 1.06 2.5 2.5 0 010 3.536.75.75 0 001.06 1.06 4 4 0 000-5.656z" />
                  </svg>
                ) : (
                  /* Speaker off icon */
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                    <path d="M10 3.75a.75.75 0 00-1.264-.546L4.703 7H3.167a.75.75 0 00-.7.48A6.985 6.985 0 002 10c0 .887.165 1.737.468 2.52.111.29.39.48.7.48h1.535l4.033 3.796A.75.75 0 0010 16.25V3.75z" />
                    <path d="M14.22 7.22a.75.75 0 011.06 0L17 8.94l1.72-1.72a.75.75 0 111.06 1.06L18.06 10l1.72 1.72a.75.75 0 11-1.06 1.06L17 11.06l-1.72 1.72a.75.75 0 11-1.06-1.06L15.94 10l-1.72-1.72a.75.75 0 010-1.06z" />
                  </svg>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length === 0}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Undo last point"
              title="Undo"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                <path fillRule="evenodd" d="M7.793 2.232a.75.75 0 01-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 010 10.75H10.75a.75.75 0 010-1.5h2.875a3.875 3.875 0 000-7.75H3.622l4.146 3.957a.75.75 0 01-1.036 1.085l-5.5-5.25a.75.75 0 010-1.085l5.5-5.25a.75.75 0 011.061.025z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
              aria-label="Reset game"
              title="Reset"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.389zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              aria-label="Open settings"
              title="Settings"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                <path fillRule="evenodd" d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {gameOver && (
        <div role="alert" className="bg-yellow-400 text-zinc-900 text-center py-3 font-black text-lg tracking-wide">
          {'🏆 ' + winnerLabel + ' wins ' + String(teamA.score) + '–' + String(teamB.score) + '! '}
          <button type="button" onClick={handleReset} className="underline ml-2 hover:no-underline">
            New Game
          </button>
        </div>
      )}

      <div className="bg-zinc-900 border-b border-zinc-800 py-2 px-4">
        <p className="text-center text-xs text-yellow-300 font-semibold max-w-2xl mx-auto">
          {'⚡ ' + serveInfo + (current.isFirstServe ? ' (First serve — no Server 1)' : '')}
        </p>
      </div>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-5 flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4">
          <ScorePanel
            team={teamA}
            serve={serve}
            isWinner={gameOver && winner === 'teamA'}
            gameOver={gameOver}
            onScore={handleScoreA}
          />
          <ScorePanel
            team={teamB}
            serve={serve}
            isWinner={gameOver && winner === 'teamB'}
            gameOver={gameOver}
            onScore={handleScoreB}
          />
        </div>

        <p className="text-center text-zinc-600 text-xs">
          {'Win at ' + String(winScore) + ' • win by 2'}
        </p>

        <section aria-label="Court positions">
          <h2 className="text-zinc-500 text-xs uppercase tracking-widest text-center mb-3 font-semibold">
            Court Positions
          </h2>
          <CourtDiagram teamA={teamA} teamB={teamB} serve={serve} />
        </section>

        <section aria-label="Quick rules reference" className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <h2 className="text-zinc-400 text-xs uppercase tracking-widest font-bold mb-3">
            Scoring Rules
          </h2>
          <ul className="text-zinc-400 text-xs space-y-1.5" role="list">
            <li>→ Points only scored by the serving team</li>
            <li>→ Win rally while serving: score + keep serve (switch sides)</li>
            <li>→ Win rally while receiving: side-out (no score)</li>
            <li>→ Side-out: Server 1 → Server 2 → opponent's Server 1</li>
            <li>→ Game starts at Team B, Server 2 (no Server 1 first)</li>
            <li>→ Players on right (even) side when team score is even</li>
          </ul>
        </section>

        <p className="text-center text-zinc-700 text-xs pb-4">Add to home screen for offline use</p>
      </main>

      <SettingsModal
        key={settingsOpen ? 'open' : 'closed'}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        currentNames={playerNames}
        winScore={winScore}
        onSave={handleSaveSettings}
      />
    </div>
  );
}
