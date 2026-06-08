/**
 * useGameState — React hook wrapping the game reducer.
 * - Hydrates from localStorage on mount
 * - Persists every state change to localStorage
 * - Exposes stable dispatch and computed derived values
 */

import { useReducer, useEffect, useCallback, useMemo } from 'react';
import type { GameAction, PersistedGame, GameView } from '../types/game';
import { gameReducer, DEFAULT_NAMES } from '../logic/reducer';
import {
  loadFromStorage,
  saveToStorage,
  getServingPlayer,
} from '../logic/game';

function initState(): PersistedGame {
  return loadFromStorage(DEFAULT_NAMES);
}

export function useGameState(): GameView {
  const [state, dispatchRaw] = useReducer(gameReducer, undefined, initState);

  // Persist on every state change
  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  const dispatch = useCallback((action: GameAction) => {
    dispatchRaw(action);
  }, []);

  const derived = useMemo(() => {
    const servingPlayer = getServingPlayer(state.current);
    const teamA = state.current.teamA;
    const teamB = state.current.teamB;

    // Server names for display
    const teamAServerName =
      state.current.serve.servingTeam === 'teamA'
        ? servingPlayer.name
        : `${state.current.serve.serverNumber === 1
            ? teamA.player1.name
            : teamA.player2.name}`;

    const teamBServerName =
      state.current.serve.servingTeam === 'teamB'
        ? servingPlayer.name
        : `${state.current.serve.serverNumber === 1
            ? teamB.player1.name
            : teamB.player2.name}`;

    return {
      servingPlayerName: servingPlayer.name,
      teamAServerName,
      teamBServerName,
    };
  }, [state]);

  return {
    state,
    dispatch,
    ...derived,
  };
}
