import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useGameState } from './hooks/useGameState';
import { useAnnouncer } from './hooks/useAnnouncer';
import { ScorePanel } from './components/ScorePanel';
import { CourtDiagram } from './components/CourtDiagram';
import { SettingsModal } from './components/SettingsModal';
import { HelpModal } from './components/HelpModal';
import type { PlayerNames, TeamColor, CompletedMatch } from './types/game';
import { COLOR_THEMES, loadMatchHistory, saveMatchHistory } from './logic/game';

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
  const [helpOpen, setHelpOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'scorer' | 'history' | 'stats'>('scorer');
  const [matches, setMatches] = useState<readonly CompletedMatch[]>(() => loadMatchHistory());
  const announcer = useAnnouncer();
  const [isScreenAwake, setIsScreenAwake] = useState(false);
  const [statsSort, setStatsSort] = useState<'winRate' | 'games' | 'wins'>('winRate');

  const { current, gameOver, winner, winScore, playerNames, history } = state;
  const { teamA, teamB, serve } = current;
  const teamAColor = state.teamAColor ?? 'green';
  const teamBColor = state.teamBColor ?? 'blue';

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

  // Auto-save completed match to history list
  useEffect(() => {
    if (gameOver && winner) {
      const matchExists = matches.some((m) => m.id === state.createdAt);
      if (!matchExists) {
        const durationMs = Date.now() - new Date(state.createdAt).getTime();
        const durationMinutes = Math.max(1, Math.round(durationMs / 60000));
        const newMatch: CompletedMatch = {
          id: state.createdAt,
          date: new Date(state.createdAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          teamAPlayer1: playerNames.teamAPlayer1,
          teamAPlayer2: playerNames.teamAPlayer2,
          teamBPlayer1: playerNames.teamBPlayer1,
          teamBPlayer2: playerNames.teamBPlayer2,
          teamAScore: teamA.score,
          teamBScore: teamB.score,
          winner,
          durationMinutes,
        };
        const updated = Object.freeze([...matches, newMatch]);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMatches(updated);
        saveMatchHistory(updated);
      }
    }
  }, [gameOver, winner, state.createdAt, playerNames, teamA.score, teamB.score, matches]);

  const handleDeleteMatch = useCallback((id: string) => {
    if (window.confirm('Delete this match from history?')) {
      const updated = Object.freeze(matches.filter((m) => m.id !== id));
      setMatches(updated);
      saveMatchHistory(updated);
    }
  }, [matches]);

  const handleClearHistory = useCallback(() => {
    if (window.confirm('Clear ALL match history? This cannot be undone.')) {
      setMatches([]);
      saveMatchHistory([]);
    }
  }, []);

  const handleSaveSettings = useCallback(
    (names: PlayerNames, score: number, aColor: TeamColor, bColor: TeamColor) => {
      dispatch({ type: 'SET_NAMES', names });
      dispatch({ type: 'SET_WIN_SCORE', score });
      dispatch({ type: 'SET_COLORS', teamAColor: aColor, teamBColor: bColor });
      announcer.announceConfig(score);
    },
    [dispatch, announcer]
  );

  const handleShareMatch = useCallback((m: CompletedMatch) => {
    const text = `🏓 Pickleball Match Result!\nTeam A (${m.teamAPlayer1} & ${m.teamAPlayer2}): ${m.teamAScore}\nTeam B (${m.teamBPlayer1} & ${m.teamBPlayer2}): ${m.teamBScore}\nWinner: ${m.winner === 'teamA' ? 'Team A' : 'Team B'} 🏆\n${m.durationMinutes ? `Duration: ${m.durationMinutes} min\n` : ''}Scored with Pickleball Scorekeeper.`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: 'Pickleball Match Result',
        text: text,
      }).catch((err) => {
        console.warn('Web Share failed:', err);
      });
    } else {
      try {
        navigator.clipboard.writeText(text);
        alert('Match results copied to clipboard!');
      } catch {
        alert('Failed to copy to clipboard.');
      }
    }
  }, []);

  const handleExportHistoryCSV = useCallback(() => {
    if (matches.length === 0) return;

    const headers = ['Date', 'Duration (min)', 'Team A Player 1', 'Team A Player 2', 'Team B Player 1', 'Team B Player 2', 'Team A Score', 'Team B Score', 'Winner'];
    const rows = matches.map((m) => [
      m.date,
      m.durationMinutes || '',
      m.teamAPlayer1,
      m.teamAPlayer2,
      m.teamBPlayer1,
      m.teamBPlayer2,
      m.teamAScore,
      m.teamBScore,
      m.winner === 'teamA' ? 'Team A' : 'Team B',
    ]);

    const csvContent = [headers, ...rows]
      .map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pickleball_history_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [matches]);

  // Screen Wake Lock API to prevent device sleeping during games
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      try {
        if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          wakeLock = await (navigator as any).wakeLock.request('screen');
          setIsScreenAwake(true);
          wakeLock.addEventListener('release', () => {
            setIsScreenAwake(false);
          });
        }
      } catch (err) {
        console.warn('Wake Lock request failed:', err);
        setIsScreenAwake(false);
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

  // Compute stats on match history dynamically
  const playerStats = useMemo(() => {
    const statsMap: Record<string, { wins: number; losses: number; games: number; points: number }> = {};

    const addPlayerStats = (name: string, isWinner: boolean, points: number) => {
      const cleanName = name.trim();
      if (!cleanName) return;
      if (!statsMap[cleanName]) {
        statsMap[cleanName] = { wins: 0, losses: 0, games: 0, points: 0 };
      }
      statsMap[cleanName].games += 1;
      statsMap[cleanName].points += points;
      if (isWinner) {
        statsMap[cleanName].wins += 1;
      } else {
        statsMap[cleanName].losses += 1;
      }
    };

    matches.forEach((m) => {
      addPlayerStats(m.teamAPlayer1, m.winner === 'teamA', m.teamAScore);
      addPlayerStats(m.teamAPlayer2, m.winner === 'teamA', m.teamAScore);
      addPlayerStats(m.teamBPlayer1, m.winner === 'teamB', m.teamBScore);
      addPlayerStats(m.teamBPlayer2, m.winner === 'teamB', m.teamBScore);
    });

    return Object.entries(statsMap)
      .map(([name, data]) => ({
        name,
        ...data,
        winRate: data.games > 0 ? (data.wins / data.games) * 100 : 0,
        avgPoints: data.games > 0 ? data.points / data.games : 0,
      }))
      .sort((a, b) => {
        if (statsSort === 'games') {
          return b.games - a.games || b.winRate - a.winRate;
        } else if (statsSort === 'wins') {
          return b.wins - a.wins || b.winRate - a.winRate;
        } else {
          return b.winRate - a.winRate || b.wins - a.wins;
        }
      });
  }, [matches, statsSort]);

  // Dynamic live rules helper values
  const rulesCheck = useMemo(() => {
    const servingTeamData = serve.servingTeam === 'teamA' ? teamA : teamB;
    const serverPlayer =
      servingTeamData.player1.id === serve.servingPlayerId
        ? servingTeamData.player1
        : servingTeamData.player2;

    const correctSide = servingTeamData.score % 2 === 0 ? 'right' : 'left';

    return {
      serverName: serverPlayer.name,
      side: correctSide,
      isFirstServeRule: current.isFirstServe,
    };
  }, [serve, teamA, teamB, current.isFirstServe]);

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
            {isScreenAwake && (
              <span className="text-[10px] font-bold text-yellow-400 bg-yellow-950/80 border border-yellow-800/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                Keep Screen On
              </span>
            )}

            {/* Announcer toggle button */}
            {announcer.isSupported && (
              <button
                type="button"
                onClick={announcer.toggle}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${
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
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
              className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors cursor-pointer"
              aria-label="Reset game"
              title="Reset"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.389zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
              aria-label="Open rules and FAQ help"
              title="Rules & FAQ"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5A1 1 0 117.465 6.4 3 3 0 1112 9a1.5 1.5 0 00-.75 1.3v.2a1 1 0 11-2 0v-.2A3.5 3.5 0 0113 6.8a3 3 0 01-3.003.2zM11 13a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
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
          <button type="button" onClick={handleReset} className="underline ml-2 hover:no-underline cursor-pointer">
            New Game
          </button>
        </div>
      )}

      {activeTab === 'scorer' && (
        <div className="bg-zinc-900 border-b border-zinc-800 py-2 px-4">
          <p className="text-center text-xs text-yellow-300 font-semibold max-w-2xl mx-auto">
            {'⚡ ' + serveInfo + (current.isFirstServe ? ' (First serve — no Server 1)' : '')}
          </p>
        </div>
      )}

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-5 flex flex-col gap-5">
        {/* Navigation tabs */}
        <div className="flex justify-center border-b border-zinc-800 pb-2" role="tablist">
          {(['scorer', 'history', 'stats'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-center text-xs font-black uppercase tracking-wider transition-colors border-b-2 cursor-pointer ${
                activeTab === tab
                  ? 'border-yellow-400 text-yellow-300'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'scorer' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <ScorePanel
                team={teamA}
                serve={serve}
                isWinner={gameOver && winner === 'teamA'}
                gameOver={gameOver}
                colorTheme={COLOR_THEMES[teamAColor]}
                onScore={handleScoreA}
              />
              <ScorePanel
                team={teamB}
                serve={serve}
                isWinner={gameOver && winner === 'teamB'}
                gameOver={gameOver}
                colorTheme={COLOR_THEMES[teamBColor]}
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
              <CourtDiagram
                teamA={teamA}
                teamB={teamB}
                serve={serve}
                teamAColorHex={COLOR_THEMES[teamAColor].hex}
                teamBColorHex={COLOR_THEMES[teamBColor].hex}
              />
            </section>

            {/* Interactive Rules Assistant */}
            <section aria-label="Interactive Rules Assistant" className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
              <h3 className="text-yellow-400 text-xs uppercase tracking-widest font-black flex items-center gap-1.5 mb-2.5">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                </svg>
                Live Court Rules Check
              </h3>
              <div className="text-zinc-300 text-xs space-y-2">
                <p>
                  📢 <strong>Position Check:</strong> <span className="text-white font-bold">{rulesCheck.serverName}</span> must serve from the <span className="text-yellow-400 font-bold">{rulesCheck.side}</span> side.
                </p>
                <p>
                  💡 <strong>Double-Bounce Rule:</strong> The receiving team must let the serve bounce once. The serving team must let the returned ball bounce once. Volleys are only allowed after these two bounces!
                </p>
                {rulesCheck.isFirstServeRule && (
                  <p className="text-yellow-300/90 italic">
                    ℹ️ <strong>First Serve Exception:</strong> To balance the game, the team serving first only gets one server (Server 2). A side-out will occur immediately on their first fault.
                  </p>
                )}
              </div>
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
          </>
        )}

        {activeTab === 'history' && (
          <section aria-label="Match History" className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Completed Matches</h2>
              <div className="flex items-center gap-3">
                {matches.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handleExportHistoryCSV}
                      className="text-xs text-yellow-400 hover:text-yellow-300 font-bold hover:underline cursor-pointer"
                    >
                      Export CSV
                    </button>
                    <button
                      type="button"
                      onClick={handleClearHistory}
                      className="text-xs text-red-400 hover:text-red-300 font-bold hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  </>
                )}
              </div>
            </div>

            {matches.length === 0 ? (
              <div className="text-center py-10 bg-zinc-900 rounded-xl border border-zinc-800">
                <p className="text-zinc-500 text-sm">No matches in history yet.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('scorer')}
                  className="mt-3 px-4 py-2 rounded-xl bg-yellow-400 text-zinc-900 font-black text-xs hover:bg-yellow-300 cursor-pointer"
                >
                  Play First Match
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {[...matches].reverse().map((m) => (
                  <div
                    key={m.id}
                    className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3 relative"
                  >
                    <div className="flex justify-between items-center text-[10px] text-zinc-500 border-b border-zinc-800/60 pb-1.5">
                      <span>
                        {m.date}
                        {m.durationMinutes ? ` • ${m.durationMinutes} min` : ''}
                      </span>
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleShareMatch(m)}
                          className="text-yellow-400 hover:text-yellow-300 font-bold cursor-pointer"
                          aria-label="Share match results"
                        >
                          Share
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMatch(m.id)}
                          className="text-red-500 hover:text-red-400 font-bold cursor-pointer"
                          aria-label="Delete match from history"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 items-center">
                      <div className="flex flex-col gap-1">
                        <span className={`text-[10px] uppercase font-black tracking-wider ${COLOR_THEMES[teamAColor].text}`}>
                          Team A {m.winner === 'teamA' && '🏆'}
                        </span>
                        <span className="text-zinc-200 text-xs font-semibold truncate">
                          {m.teamAPlayer1} & {m.teamAPlayer2}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 text-right">
                        <span className={`text-[10px] uppercase font-black tracking-wider ${COLOR_THEMES[teamBColor].text}`}>
                          Team B {m.winner === 'teamB' && '🏆'}
                        </span>
                        <span className="text-zinc-200 text-xs font-semibold truncate">
                          {m.teamBPlayer1} & {m.teamBPlayer2}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-4 py-1">
                      <span className={`text-3xl font-black ${m.winner === 'teamA' ? COLOR_THEMES[teamAColor].text : 'text-zinc-500'}`}>
                        {m.teamAScore}
                      </span>
                      <span className="text-zinc-600 font-bold text-sm">—</span>
                      <span className={`text-3xl font-black ${m.winner === 'teamB' ? COLOR_THEMES[teamBColor].text : 'text-zinc-500'}`}>
                        {m.teamBScore}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'stats' && (
          <section aria-label="Player Statistics" className="flex flex-col gap-4">
            <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-wider border-b border-zinc-800 pb-2">
              Leaderboard & Stats
            </h2>

            {playerStats.length === 0 ? (
              <div className="text-center py-10 bg-zinc-900 rounded-xl border border-zinc-800">
                <p className="text-zinc-500 text-sm">Play matches to calculate player stats!</p>
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-zinc-800/50 text-zinc-400 font-bold uppercase tracking-wider border-b border-zinc-800 select-none">
                        <th className="p-3">Player</th>
                        <th
                          onClick={() => setStatsSort('games')}
                          className={`p-3 text-center cursor-pointer hover:text-zinc-200 ${statsSort === 'games' ? 'text-yellow-300 font-black' : ''}`}
                          role="columnheader"
                          aria-sort={statsSort === 'games' ? 'descending' : 'none'}
                        >
                          Played {statsSort === 'games' && '▼'}
                        </th>
                        <th
                          onClick={() => setStatsSort('wins')}
                          className={`p-3 text-center cursor-pointer hover:text-zinc-200 ${statsSort === 'wins' ? 'text-yellow-300 font-black' : ''}`}
                          role="columnheader"
                          aria-sort={statsSort === 'wins' ? 'descending' : 'none'}
                        >
                          Wins {statsSort === 'wins' && '▼'}
                        </th>
                        <th className="p-3 text-center">Losses</th>
                        <th
                          onClick={() => setStatsSort('winRate')}
                          className={`p-3 text-center cursor-pointer hover:text-zinc-200 ${statsSort === 'winRate' ? 'text-yellow-300 font-black' : ''}`}
                          role="columnheader"
                          aria-sort={statsSort === 'winRate' ? 'descending' : 'none'}
                        >
                          Win Rate {statsSort === 'winRate' && '▼'}
                        </th>
                        <th className="p-3 text-center">Avg Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {playerStats.map((stat, idx) => (
                        <tr key={stat.name} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="p-3 font-bold text-white flex items-center gap-1.5">
                            {idx === 0 && <span aria-hidden="true">👑</span>}
                            {stat.name}
                          </td>
                          <td className="p-3 text-center text-zinc-300">{stat.games}</td>
                          <td className="p-3 text-center text-green-400 font-semibold">{stat.wins}</td>
                          <td className="p-3 text-center text-red-400">{stat.losses}</td>
                          <td className="p-3 text-center font-black text-yellow-300">
                            {stat.winRate.toFixed(0)}%
                          </td>
                          <td className="p-3 text-center text-zinc-400">{stat.avgPoints.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}

        <p className="text-center text-zinc-700 text-xs pb-4">Add to home screen for offline use</p>
      </main>

      <SettingsModal
        key={settingsOpen ? 'open' : 'closed'}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        currentNames={playerNames}
        winScore={winScore}
        teamAColor={teamAColor}
        teamBColor={teamBColor}
        onSave={handleSaveSettings}
      />

      <HelpModal
        key={helpOpen ? 'open' : 'closed'}
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      />
    </div>
  );
}
