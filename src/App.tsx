import { useState, useCallback } from 'react';
import { useGameState } from './hooks/useGameState';
import { useVoiceControl } from './hooks/useVoiceControl';
import { ScorePanel } from './components/ScorePanel';
import { CourtDiagram } from './components/CourtDiagram';
import { SettingsModal } from './components/SettingsModal';
import { VoiceFeedback } from './components/VoiceFeedback';
import type { PlayerNames } from './types/game';

export default function App() {
  const { state, dispatch } = useGameState();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { current, gameOver, winner, winScore, playerNames, history } = state;
  const { teamA, teamB, serve } = current;

  const handleScoreA = useCallback(() => {
    dispatch({ type: 'SCORE_POINT', team: 'teamA' });
  }, [dispatch]);

  const handleScoreB = useCallback(() => {
    dispatch({ type: 'SCORE_POINT', team: 'teamB' });
  }, [dispatch]);

  const handleUndo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, [dispatch]);

  const handleReset = useCallback(() => {
    if (window.confirm('Reset the game? This cannot be undone.')) {
      dispatch({ type: 'RESET' });
    }
  }, [dispatch]);

  const handleSaveSettings = useCallback(
    (names: PlayerNames, score: number) => {
      dispatch({ type: 'SET_NAMES', names });
      dispatch({ type: 'SET_WIN_SCORE', score });
    },
    [dispatch]
  );

  // Voice control — pass team names so custom names can be spoken
  const voice = useVoiceControl({
    onScoreA: handleScoreA,
    onScoreB: handleScoreB,
    onUndo: handleUndo,
    onReset: () => { dispatch({ type: 'RESET' }); },
    teamAName: playerNames.teamAPlayer1,
    teamBName: playerNames.teamBPlayer1,
  });

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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800">
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

            {/* Mic / Voice toggle button */}
            {voice.isSupported && (
              <button
                type="button"
                onClick={voice.toggleListening}
                className={`p-2 rounded-lg transition-colors ${
                  voice.status === 'listening'
                    ? 'text-red-400 bg-red-950/60 hover:bg-red-900/60 ring-1 ring-red-500'
                    : voice.status === 'processing'
                    ? 'text-yellow-300 bg-yellow-950/60'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                }`}
                aria-label={voice.status === 'listening' ? 'Stop voice control' : 'Start voice control'}
                title={voice.status === 'listening' ? 'Stop listening' : 'Voice control'}
              >
                {voice.status === 'listening' ? (
                  /* Waveform / recording icon */
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                    <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
                    <path d="M5.5 9.643a.75.75 0 00-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-1.5v-1.546A6.001 6.001 0 0016 10v-.357a.75.75 0 00-1.5 0V10a4.5 4.5 0 01-9 0v-.357z" />
                  </svg>
                ) : (
                  /* Mic-off icon */
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                    <path d="M10 2a3 3 0 00-3 3v3.586l6.707 6.707A3 3 0 0013 8V5a3 3 0 00-3-3z" />
                    <path d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.793-1.793A5.972 5.972 0 0016 10v-.357a.75.75 0 00-1.5 0V10a4.5 4.5 0 01-7.146 3.647L5.857 12.15A4.483 4.483 0 005.5 10v-.357a.75.75 0 00-1.5 0V10c0 1.33.434 2.56 1.17 3.55L3.28 15.44a.75.75 0 101.06 1.06l.44-.439A5.972 5.972 0 004 10v-.357a.75.75 0 00-1.5 0V10c0 1.905.703 3.645 1.858 4.978l-1.079 1.08a.75.75 0 001.06 1.06l14.5-14.5a.75.75 0 00-1.06-1.06L17.5 3.28A5.972 5.972 0 0010 2.5V2zM7 5a3 3 0 015.854-.868L7 10.586V5z" />
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

      {/* Voice commands cheat-sheet — shown when listening */}
      {voice.status === 'listening' && (
        <div className="fixed bottom-4 right-4 z-40 bg-zinc-900/95 backdrop-blur border border-zinc-700 rounded-xl p-3 text-xs text-zinc-400 shadow-2xl max-w-[200px]">
          <p className="font-bold text-zinc-300 mb-1.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" />
            Voice commands
          </p>
          <ul className="space-y-0.5">
            <li>"point A" / "team A"</li>
            <li>"point B" / "team B"</li>
            <li>"undo" / "go back"</li>
            <li>"reset" / "new game"</li>
          </ul>
        </div>
      )}

      {/* Floating voice feedback toast */}
      <VoiceFeedback status={voice.status} lastCommand={voice.lastCommand} />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        currentNames={playerNames}
        winScore={winScore}
        onSave={handleSaveSettings}
      />
    </div>
  );
}
