/**
 * Game Reducer — immutable state machine for pickleball scoring.
 */

import type { GameAction, PersistedGame, PlayerNames } from '../types/game';
import {
  applyScorePoint,
  buildInitialPersistedGame,
  checkWinner,
  buildInitialSnapshot,
} from './game';

const DEFAULT_NAMES: PlayerNames = Object.freeze({
  teamAPlayer1: 'Player 1',
  teamAPlayer2: 'Player 2',
  teamBPlayer1: 'Player 3',
  teamBPlayer2: 'Player 4',
});

export function gameReducer(
  state: PersistedGame,
  action: GameAction
): PersistedGame {
  const now = new Date().toISOString();

  switch (action.type) {
    case 'SCORE_POINT': {
      if (state.gameOver) return state;

      const newSnapshot = applyScorePoint(state.current, action.team);
      const winner = checkWinner(newSnapshot, state.winScore);

      const history = Object.freeze([
        ...state.history.slice(-49),
        state.current,
      ]);

      return Object.freeze({
        ...state,
        current: newSnapshot,
        history,
        gameOver: winner !== null,
        winner,
        updatedAt: now,
      });
    }

    case 'UNDO': {
      if (state.history.length === 0) return state;
      const prev = state.history[state.history.length - 1];
      if (!prev) return state;
      const history = Object.freeze(state.history.slice(0, -1));

      return Object.freeze({
        ...state,
        current: prev,
        history,
        gameOver: false,
        winner: null,
        updatedAt: now,
      });
    }

    case 'RESET': {
      const names = state.playerNames ?? DEFAULT_NAMES;
      return buildInitialPersistedGame(names, state.winScore);
    }

    case 'SET_NAMES': {
      const newSnapshot = buildInitialSnapshot(action.names);
      return Object.freeze({
        ...buildInitialPersistedGame(action.names, state.winScore),
        playerNames: Object.freeze(action.names),
        winScore: state.winScore,
        current: newSnapshot,
        history: Object.freeze([] as const),
        createdAt: now,
        updatedAt: now,
      });
    }

    case 'SET_WIN_SCORE': {
      const validScore = [11, 15, 21].includes(action.score) ? action.score : 11;
      return Object.freeze({
        ...state,
        winScore: validScore,
        updatedAt: now,
      });
    }

    default:
      return state;
  }
}

export { DEFAULT_NAMES };
