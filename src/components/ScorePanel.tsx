import type { Team, ServeState } from '../types/game';

interface ScorePanelProps {
  readonly team: Team;
  readonly serve: ServeState;
  readonly isWinner: boolean;
  readonly gameOver: boolean;
  readonly onScore: () => void;
}

/** Large, sunlight-readable score panel. No innerHTML — all text via JSX. */
export function ScorePanel({
  team,
  serve,
  isWinner,
  gameOver,
  onScore,
}: ScorePanelProps) {
  const isServing = serve.servingTeam === team.id;
  const servingPlayer =
    isServing
      ? team.player1.id === serve.servingPlayerId
        ? team.player1
        : team.player2
      : null;

  const teamLabel = team.id === 'teamA' ? 'Team A' : 'Team B';
  const colorClass = team.id === 'teamA'
    ? 'bg-green-900/40 border-green-600'
    : 'bg-blue-900/40 border-blue-600';
  const accentClass = team.id === 'teamA' ? 'text-green-400' : 'text-blue-400';
  const btnClass = team.id === 'teamA'
    ? 'bg-green-600 hover:bg-green-500 active:bg-green-700 focus-visible:ring-green-400'
    : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 focus-visible:ring-blue-400';

  const hoverClass = team.id === 'teamA'
    ? 'hover:bg-green-900/50 hover:border-green-500'
    : 'hover:bg-blue-900/50 hover:border-blue-500';

  return (
    <button
      type="button"
      onClick={onScore}
      disabled={gameOver}
      className={`
        relative flex flex-col items-center gap-3 p-4 rounded-2xl border-2 w-full text-center
        transition-all duration-75 active:scale-95 cursor-pointer
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900
        disabled:cursor-not-allowed disabled:active:scale-100
        ${colorClass}
        ${hoverClass}
        ${isServing ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-zinc-900' : ''}
        ${isWinner ? 'ring-4 ring-yellow-300' : ''}
      `}
      aria-label={`Score point for ${teamLabel}. Current score: ${String(team.score)}`}
    >
      {/* Serving indicator */}
      {isServing && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-yellow-400 text-zinc-900 text-xs font-black px-2 py-0.5 rounded-full tracking-wide">
            {'★ SERVING'}
          </span>
        </div>
      )}

      {/* Winner badge */}
      {isWinner && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-yellow-300 text-zinc-900 text-sm font-black px-3 py-1 rounded-full tracking-wide animate-bounce">
            {'🏆 WINNER!'}
          </span>
        </div>
      )}

      {/* Team header */}
      <div className="text-center">
        <p className={`text-xs font-bold uppercase tracking-widest ${accentClass}`}>
          {teamLabel}
        </p>
        <p className="text-zinc-300 text-xs mt-0.5 truncate max-w-[120px]">
          {team.player1.name}
          {' & '}
          {team.player2.name}
        </p>
      </div>

      {/* Score — huge, sunlight-readable */}
      <div
        className="text-8xl font-black tabular-nums text-white leading-none select-none"
        aria-hidden="true"
      >
        {String(team.score)}
      </div>

      {/* Server info */}
      <div className="h-8 flex items-center justify-center">
        {isServing && servingPlayer ? (
          <p className="text-yellow-300 text-xs font-semibold text-center">
            {'Server '}
            {String(serve.serverNumber)}
            {': '}
            {servingPlayer.name}
            {' ('}
            {servingPlayer.side}
            {')'}
          </p>
        ) : (
          <p className="text-zinc-500 text-xs">receiving</p>
        )}
      </div>

      {/* Players + sides */}
      <div className="w-full grid grid-cols-2 gap-1 text-center text-xs">
        <div className="bg-zinc-800/60 rounded-lg p-1.5">
          <p className="text-zinc-400 text-[10px] uppercase tracking-wider">Left</p>
          <p className="text-zinc-200 font-medium truncate">
            {team.player1.side === 'odd' ? team.player1.name : team.player2.name}
          </p>
        </div>
        <div className="bg-zinc-800/60 rounded-lg p-1.5">
          <p className="text-zinc-400 text-[10px] uppercase tracking-wider">Right</p>
          <p className="text-zinc-200 font-medium truncate">
            {team.player1.side === 'even' ? team.player1.name : team.player2.name}
          </p>
        </div>
      </div>

      {/* Score button representation */}
      <div
        className={`
          w-full py-4 rounded-xl font-black text-white text-lg uppercase tracking-widest text-center
          disabled:opacity-30 transition-colors
          ${btnClass}
          ${gameOver ? 'opacity-30' : ''}
        `}
      >
        {'+1 Point'}
      </div>
    </button>
  );
}
