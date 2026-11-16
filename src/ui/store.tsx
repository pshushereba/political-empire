import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { applyAction, check, createGame, SAVE_VERSION, type Action, type Check, type FoundingChoices, type GameState, type LogEntry } from '../game';

const SAVE_KEY = 'political-empire.save';

function load(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as GameState;
    return state.version === SAVE_VERSION ? state : null;
  } catch {
    return null;
  }
}

interface Store {
  state: GameState | null;
  /** Apply an action. Returns the new state (unchanged if the action isn't allowed). */
  dispatch: (action: Action) => GameState;
  can: (action: Action) => Check;
  newGame: (choices: FoundingChoices) => void;
  abandon: () => void;
  /** What happened during the turn that just ended. */
  report: { turn: number; entries: LogEntry[] } | null;
  dismissReport: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState | null>(load);
  const [report, setReport] = useState<Store['report']>(null);
  const ref = useRef(state);
  ref.current = state;

  useEffect(() => {
    try {
      if (state) localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      else localStorage.removeItem(SAVE_KEY);
    } catch {
      // Saving is best-effort (private windows, full storage).
    }
  }, [state]);

  const dispatch = useCallback((action: Action): GameState => {
    const prev = ref.current!;
    const next = applyAction(prev, action);
    if (next !== prev) {
      ref.current = next;
      setState(next);
      if (action.type === 'endTurn') setReport({ turn: prev.turn, entries: next.log.filter((l) => l.turn === prev.turn) });
    }
    return next;
  }, []);

  const store = useMemo<Store>(() => ({
    state,
    dispatch,
    can: (action) => (ref.current ? check(ref.current, action) : { ok: false, reason: 'No game' }),
    newGame: (choices) => { setReport(null); setState(createGame(choices)); },
    abandon: () => { setReport(null); setState(null); },
    report,
    dismissReport: () => setReport(null),
  }), [state, report, dispatch]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}

/** For screens inside a running game. */
export function useGame(): Omit<Store, 'state'> & { state: GameState } {
  const s = useStore();
  if (!s.state) throw new Error('No game in progress');
  return s as Omit<Store, 'state'> & { state: GameState };
}

// ---- Tiny hash router ------------------------------------------------------

export function useRoute(): string {
  const [route, setRoute] = useState(() => window.location.hash.replace(/^#/, '') || '/');
  useEffect(() => {
    const on = () => setRoute(window.location.hash.replace(/^#/, '') || '/');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function go(path: string): void {
  window.location.hash = path;
}
