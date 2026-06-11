/**
 * Pickleball Scorekeeper — Core Types
 * All state objects are immutable at runtime (Object.freeze applied in reducer).
 * No `any` types — strict TypeScript throughout.
 */

/** Which side of the court a player occupies */
export type CourtSide = 'even' | 'odd'; // even=right, odd=left from server's perspective

/** Server number within a team's possession */
export type ServerNumber = 1 | 2;

/** Which team is currently serving */
export type ServingTeam = 'teamA' | 'teamB';

/** The two players on a team */
export type TeamSlot = 'player1' | 'player2';

/** Immutable snapshot of a single player */
export interface Player {
  readonly id: string;
  readonly name: string;
  readonly side: CourtSide;
}

/** Immutable snapshot of a team */
export interface Team {
  readonly id: ServingTeam;
  readonly player1: Player;
  readonly player2: Player;
  readonly score: number;
}

/** Who is currently serving — team + which server number */
export interface ServeState {
  readonly servingTeam: ServingTeam;
  readonly serverNumber: ServerNumber;
  /** ID of the player currently holding the paddle */
  readonly servingPlayerId: string;
}

/** Complete, immutable game snapshot stored in history */
export interface GameSnapshot {
  readonly teamA: Team;
  readonly teamB: Team;
  readonly serve: ServeState;
  readonly rallyCount: number;
  /** True only at very start of game (first serve is Team B, Server 2) */
  readonly isFirstServe: boolean;
}

export type TeamColor = 'green' | 'blue' | 'red' | 'purple' | 'orange' | 'amber' | 'rose' | 'indigo';

export interface CompletedMatch {
  readonly id: string;
  readonly date: string;
  readonly teamAPlayer1: string;
  readonly teamAPlayer2: string;
  readonly teamBPlayer1: string;
  readonly teamBPlayer2: string;
  readonly teamAScore: number;
  readonly teamBScore: number;
  readonly winner: ServingTeam;
}

/** Persisted shape written to localStorage */
export interface PersistedGame {
  readonly version: 2;
  readonly current: GameSnapshot;
  readonly history: readonly GameSnapshot[];
  readonly winScore: number;
  readonly playerNames: PlayerNames;
  readonly teamAColor?: TeamColor;
  readonly teamBColor?: TeamColor;
  readonly gameOver: boolean;
  readonly winner: ServingTeam | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Editable player name configuration */
export interface PlayerNames {
  readonly teamAPlayer1: string;
  readonly teamAPlayer2: string;
  readonly teamBPlayer1: string;
  readonly teamBPlayer2: string;
}

/** All possible game actions dispatched to the reducer */
export type GameAction =
  | { readonly type: 'SCORE_POINT'; readonly team: ServingTeam }
  | { readonly type: 'UNDO' }
  | { readonly type: 'RESET' }
  | { readonly type: 'SET_NAMES'; readonly names: PlayerNames }
  | { readonly type: 'SET_WIN_SCORE'; readonly score: number }
  | { readonly type: 'SET_COLORS'; readonly teamAColor: TeamColor; readonly teamBColor: TeamColor };

/** View-layer state derived from the reducer */
export interface GameView {
  readonly state: PersistedGame;
  readonly dispatch: (action: GameAction) => void;
  readonly servingPlayerName: string;
  readonly teamAServerName: string;
  readonly teamBServerName: string;
}
