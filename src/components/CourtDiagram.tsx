import type { Team, ServeState } from '../types/game';

interface CourtDiagramProps {
  readonly teamA: Team;
  readonly teamB: Team;
  readonly serve: ServeState;
}

/** Secure SVG court diagram — zero innerHTML, all text via React nodes */
export function CourtDiagram({ teamA, teamB, serve }: CourtDiagramProps) {
  const isAServing = serve.servingTeam === 'teamA';

  // From net-viewer perspective: left = odd, right = even
  const aP1Side = teamA.player1.side === 'even' ? 'right' : 'left';
  const aP2Side = teamA.player2.side === 'even' ? 'right' : 'left';
  const bP1Side = teamB.player1.side === 'even' ? 'right' : 'left';
  const bP2Side = teamB.player2.side === 'even' ? 'right' : 'left';

  const servingId = serve.servingPlayerId;

  function playerCircle(
    name: string,
    id: string,
    xPct: number,
    yPct: number,
    team: 'a' | 'b'
  ) {
    const isServing = id === servingId;
    const fill = team === 'a' ? '#16a34a' : '#1d4ed8';
    const stroke = isServing ? '#fbbf24' : 'transparent';
    const initials = name
      .split(' ')
      .map((w) => w[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return (
      <g key={id} transform={`translate(${xPct}, ${yPct})`}>
        <circle r={14} fill={fill} stroke={stroke} strokeWidth={isServing ? 3 : 0} />
        {isServing && (
          <circle r={18} fill="none" stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="4 2" opacity={0.8}>
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0"
              to="360"
              dur="3s"
              repeatCount="indefinite"
            />
          </circle>
        )}
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={10}
          fontWeight="bold"
          fill="white"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          {initials}
        </text>
        {isServing && (
          <text
            textAnchor="middle"
            y={-22}
            fontSize={8}
            fill="#fbbf24"
            fontWeight="bold"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
          >
            {'SERVE'}
          </text>
        )}
      </g>
    );
  }

  // Court layout: Team A at bottom, Team B at top
  // Width 200, Height 140 viewBox units
  const aP1X = aP1Side === 'right' ? 150 : 50;
  const aP2X = aP2Side === 'right' ? 150 : 50;
  const bP1X = bP1Side === 'right' ? 150 : 50;
  const bP2X = bP2Side === 'right' ? 150 : 50;

  return (
    <svg
      viewBox="0 0 200 150"
      aria-label="Court position diagram"
      role="img"
      className="w-full max-w-xs mx-auto select-none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Court background */}
      <rect x={10} y={5} width={180} height={140} rx={4} fill="#064e3b" />

      {/* Kitchen (NVZ) lines */}
      <rect x={10} y={50} width={180} height={15} fill="#065f46" opacity={0.6} />
      <rect x={10} y={85} width={180} height={15} fill="#065f46" opacity={0.6} />

      {/* Net */}
      <line x1={10} y1={75} x2={190} y2={75} stroke="#6ee7b7" strokeWidth={2} />
      <text x={100} y={73} textAnchor="middle" fontSize={7} fill="#6ee7b7" fontFamily="ui-sans-serif, system-ui, sans-serif">
        NET
      </text>

      {/* Center line */}
      <line x1={100} y1={5} x2={100} y2={145} stroke="#047857" strokeWidth={1} strokeDasharray="4 3" />

      {/* Side labels */}
      <text x={37} y={18} textAnchor="middle" fontSize={7} fill="#6ee7b7" opacity={0.6} fontFamily="ui-sans-serif, system-ui, sans-serif">LEFT</text>
      <text x={163} y={18} textAnchor="middle" fontSize={7} fill="#6ee7b7" opacity={0.6} fontFamily="ui-sans-serif, system-ui, sans-serif">RIGHT</text>

      {/* Team labels */}
      <text x={18} y={125} fontSize={7} fill={isAServing ? '#fbbf24' : '#6ee7b7'} fontFamily="ui-sans-serif, system-ui, sans-serif" fontWeight="bold">
        {isAServing ? '★ A' : 'A'}
      </text>
      <text x={18} y={35} fontSize={7} fill={!isAServing ? '#fbbf24' : '#6ee7b7'} fontFamily="ui-sans-serif, system-ui, sans-serif" fontWeight="bold">
        {!isAServing ? '★ B' : 'B'}
      </text>

      {/* Players */}
      {playerCircle(teamA.player1.name, teamA.player1.id, aP1X, 118, 'a')}
      {playerCircle(teamA.player2.name, teamA.player2.id, aP2X, 118, 'a')}
      {playerCircle(teamB.player1.name, teamB.player1.id, bP1X, 32, 'b')}
      {playerCircle(teamB.player2.name, teamB.player2.id, bP2X, 32, 'b')}
    </svg>
  );
}
