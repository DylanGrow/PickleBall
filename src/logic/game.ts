/**
 * Pickleball Scoring Logic — Pure Functions
 *
 * Official rules implemented:
 * 1. Points scored ONLY by the serving team.
 * 2. Serving team wins rally: scores + retains serve + server rotates sides.
 * 3. Receiving team wins rally: side-out:
 *    - Server 1 → hand over to Server 2 (same team)
 *    - Server 2 → hand over to opponent team at Server 1
 *    - Exception: first service sequence starts at Server 2 only.
 * 4. Players rotate to even/odd court sides based on their team's score.
 * 5. Win at winScore (default 11), must win by 2.
 */

import type {
  GameSnapshot,
  PersistedGame,
  Player,
  PlayerNames,
  ServingTeam,
  ServeState,
  Team,
} from '../types/game';

const STORAGE_KEY = 'pickleball_v2' as const;
const DEFAULT_WIN_SCORE = 11 as const;

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function sideForScore(score: number): 'even' | 'odd' {
  return score % 2 === 0 ? 'even' : 'odd';
}

function makePlayer(id: string, name: string, side: 'even' | 'odd'): Player {
  return Object.freeze({ id, name, side });
}

function makeTeam(id: ServingTeam, p1: Player, p2: Player, score: number): Team {
  return Object.freeze({ id, player1: p1, player2: p2, score });
}

export function buildInitialSnapshot(names: PlayerNames): GameSnapshot {
  const aId1 = makeId();
  const aId2 = makeId();
  const bId1 = makeId();
  const bId2 = makeId();

  const teamA = makeTeam(
    'teamA',
    makePlayer(aId1, names.teamAPlayer1, 'even'),
    makePlayer(aId2, names.teamAPlayer2, 'odd'),
    0
  );

  const teamB = makeTeam(
    'teamB',
    makePlayer(bId1, names.teamBPlayer1, 'even'),
    makePlayer(bId2, names.teamBPlayer2, 'odd'),
    0
  );

  // First serve of game: Team B, Server 2 (starts on odd side)
  const serve: ServeState = Object.freeze({
    servingTeam: 'teamB',
    serverNumber: 2,
    servingPlayerId: bId2,
  });

  return Object.freeze({ teamA, teamB, serve, rallyCount: 0, isFirstServe: true });
}

export function buildInitialPersistedGame(
  names: PlayerNames,
  winScore: number = DEFAULT_WIN_SCORE
): PersistedGame {
  const now = new Date().toISOString();
  const snapshot = buildInitialSnapshot(names);
  return Object.freeze({
    version: 2,
    current: snapshot,
    history: Object.freeze([] as readonly GameSnapshot[]),
    winScore,
    playerNames: Object.freeze(names),
    gameOver: false,
    winner: null,
    createdAt: now,
    updatedAt: now,
  });
}

export function getServingPlayer(snap: GameSnapshot): Player {
  const team = snap.serve.servingTeam === 'teamA' ? snap.teamA : snap.teamB;
  return team.player1.id === snap.serve.servingPlayerId
    ? team.player1
    : team.player2;
}

function buildTeamWithSides(team: Team, serverPlayerId: string): Team {
  // Server goes to even side if team score is even, odd if score is odd
  const serverSide = sideForScore(team.score);
  const otherSide: 'even' | 'odd' = serverSide === 'even' ? 'odd' : 'even';

  const isP1Server = team.player1.id === serverPlayerId;
  return makeTeam(
    team.id,
    makePlayer(team.player1.id, team.player1.name, isP1Server ? serverSide : otherSide),
    makePlayer(team.player2.id, team.player2.name, isP1Server ? otherSide : serverSide),
    team.score
  );
}

function sideOut(snap: GameSnapshot): ServeState {
  const { serve } = snap;

  if (serve.serverNumber === 1) {
    // Hand to Server 2 of same team
    const team = serve.servingTeam === 'teamA' ? snap.teamA : snap.teamB;
    const server2Id = team.player1.id !== serve.servingPlayerId
      ? team.player1.id
      : team.player2.id;

    return Object.freeze({
      servingTeam: serve.servingTeam,
      serverNumber: 2,
      servingPlayerId: server2Id,
    });
  }

  // Server 2 → opponent team's Server 1
  const nextTeam: ServingTeam = serve.servingTeam === 'teamA' ? 'teamB' : 'teamA';
  const oppTeam = nextTeam === 'teamA' ? snap.teamA : snap.teamB;

  return Object.freeze({
    servingTeam: nextTeam,
    serverNumber: 1,
    servingPlayerId: oppTeam.player1.id,
  });
}

export function applyScorePoint(
  snap: GameSnapshot,
  scoringTeam: ServingTeam
): GameSnapshot {
  const { serve } = snap;
  const rallyCount = snap.rallyCount + 1;

  if (scoringTeam === serve.servingTeam) {
    // Serving team scores: increment score, keep serve, reposition
    const oldTeam = scoringTeam === 'teamA' ? snap.teamA : snap.teamB;
    const newScore = oldTeam.score + 1;
    const serverSide = sideForScore(newScore);
    const otherSide: 'even' | 'odd' = serverSide === 'even' ? 'odd' : 'even';

    const isP1Server = oldTeam.player1.id === serve.servingPlayerId;

    const updatedTeam = makeTeam(
      oldTeam.id,
      makePlayer(oldTeam.player1.id, oldTeam.player1.name, isP1Server ? serverSide : otherSide),
      makePlayer(oldTeam.player2.id, oldTeam.player2.name, isP1Server ? otherSide : serverSide),
      newScore
    );

    const otherOldTeam = scoringTeam === 'teamA' ? snap.teamB : snap.teamA;
    const otherScore = otherOldTeam.score;
    const otherSide2 = sideForScore(otherScore);
    const otherOtherSide: 'even' | 'odd' = otherSide2 === 'even' ? 'odd' : 'even';
    const otherUpdated = makeTeam(
      otherOldTeam.id,
      makePlayer(otherOldTeam.player1.id, otherOldTeam.player1.name, otherSide2),
      makePlayer(otherOldTeam.player2.id, otherOldTeam.player2.name, otherOtherSide),
      otherScore
    );

    const teamA = scoringTeam === 'teamA' ? updatedTeam : otherUpdated;
    const teamB = scoringTeam === 'teamB' ? updatedTeam : otherUpdated;

    return Object.freeze({
      teamA,
      teamB,
      serve: Object.freeze({ ...serve }),
      rallyCount,
      isFirstServe: false,
    });
  }

  // Receiving team wins rally: side-out, no score change
  const newServe = sideOut(snap);
  const nextTeamId = newServe.servingTeam;
  const nextTeamData = nextTeamId === 'teamA' ? snap.teamA : snap.teamB;
  const otherTeamData = nextTeamId === 'teamA' ? snap.teamB : snap.teamA;

  const updatedNextTeam = buildTeamWithSides(nextTeamData, newServe.servingPlayerId);

  const otherScore = otherTeamData.score;
  const otherSide: 'even' | 'odd' = sideForScore(otherScore);
  const otherOtherSide: 'even' | 'odd' = otherSide === 'even' ? 'odd' : 'even';
  const updatedOtherTeam = makeTeam(
    otherTeamData.id,
    makePlayer(otherTeamData.player1.id, otherTeamData.player1.name, otherSide),
    makePlayer(otherTeamData.player2.id, otherTeamData.player2.name, otherOtherSide),
    otherScore
  );

  const teamA = nextTeamId === 'teamA' ? updatedNextTeam : updatedOtherTeam;
  const teamB = nextTeamId === 'teamB' ? updatedNextTeam : updatedOtherTeam;

  return Object.freeze({
    teamA,
    teamB,
    serve: newServe,
    rallyCount,
    isFirstServe: false,
  });
}

export function checkWinner(snap: GameSnapshot, winScore: number): ServingTeam | null {
  const { teamA, teamB } = snap;
  const aWins = teamA.score >= winScore && teamA.score - teamB.score >= 2;
  const bWins = teamB.score >= winScore && teamB.score - teamA.score >= 2;
  if (aWins) return 'teamA';
  if (bWins) return 'teamB';
  return null;
}

export function loadFromStorage(names: PlayerNames): PersistedGame {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildInitialPersistedGame(names);
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'version' in parsed &&
      (parsed as Record<string, unknown>)['version'] === 2
    ) {
      return parsed as PersistedGame;
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return buildInitialPersistedGame(names);
}

export function saveToStorage(game: PersistedGame): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  } catch {
    // QuotaExceededError — silently ignore
  }
}

export function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
