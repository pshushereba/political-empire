import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { activeHumans, applyAction, check, checkInBonus, createGame, reportFor, SAVE_VERSION, type Action, type Check, type Effect, type FoundingChoices, type GameSettings, type GameState, type LogEntry, type NationId } from '../game';
import { backendConfigured, supabase } from '../backend/client';
import { deleteSave, fetchEntitlements, fetchSave, pushSave, submitScore, type CloudSave } from '../backend/cloud';
import { recordLegacy } from './legacy';

/** The player's local calendar day, YYYY-MM-DD. */
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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
  /** One entry per person playing. More than one starts a pass-and-play game on this device. */
  newGame: (players: FoundingChoices[], settings?: Partial<GameSettings>, nations?: number) => void;
  abandon: () => void;
  /** The nation the person at this device is playing right now. */
  me: NationId | null;
  /** Pass-and-play: the nation whose player should take the device next. */
  handoff: NationId | null;
  acceptHandoff: () => void;
  /** What happened during the turn that just ended. */
  report: { turn: number; entries: LogEntry[] } | null;
  dismissReport: () => void;
  /** Set when the player comes back on a new day. */
  welcome: { streak: number; bonus: Effect[] } | null;
  dismissWelcome: () => void;
  account: Account;
  /** Product ids this account owns. Empty when signed out: free designs need no entry. */
  owned: readonly string[];
}

/** The player's online account. Everything works without one; signing in adds cloud saves and the world ranking. */
export interface Account {
  /** False when no backend is configured: the game is offline-only. */
  available: boolean;
  email: string | null;
  sync: 'idle' | 'saving' | 'saved' | 'error';
  /** Sends a sign-in link. Resolves to an error message, or null if the email was sent. */
  signIn: (email: string) => Promise<string | null>;
  signOut: () => void;
  /** Set when the account already holds a different game from the one in this browser. */
  conflict: CloudSave | null;
  resolveConflict: (keep: 'cloud' | 'local') => void;
}

/**
 * Development only: pretend to own products, to work on locked designs without a
 * payment system. Set localStorage 'political-empire.dev-owned' to a JSON list of
 * product ids. Ignored in a production build.
 */
function devOwned(): string[] {
  if (!import.meta.env.DEV) return [];
  try {
    const list = JSON.parse(localStorage.getItem('political-empire.dev-owned') ?? '[]');
    return Array.isArray(list) ? list.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** The first player still in the game who hasn't ended the current turn. */
function whoIsUp(s: GameState): NationId | null {
  const humans = activeHumans(s);
  return humans.find((id) => !s.nations[id].seat!.ready) ?? humans[0] ?? s.humans[0] ?? null;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState | null>(load);
  const [report, setReport] = useState<Store['report']>(null);
  const [welcome, setWelcome] = useState<Store['welcome']>(null);
  const ref = useRef(state);
  ref.current = state;
  // Whose turn it is at this device. In a solo game that never changes.
  const [me, setMe] = useState<NationId | null>(() => (state ? whoIsUp(state) : null));
  const meRef = useRef(me);
  meRef.current = me;
  const [handoff, setHandoff] = useState<NationId | null>(null);
  const handoffRef = useRef(handoff);
  handoffRef.current = handoff;
  /** The last turn each player has seen begin, so each gets their own report. */
  const seen = useRef<Record<NationId, number>>({});
  const begin = (s: GameState, id: NationId) => {
    const last = seen.current[id];
    if (last !== undefined && s.turn > last) setReport({ turn: s.turn - 1, entries: reportFor(s, id, s.turn - 1) });
    seen.current[id] = s.turn;
    meRef.current = id;
    setMe(id);
  };
  if (state && me && seen.current[me] === undefined) seen.current[me] = state.turn;

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
    const id = meRef.current!;
    const next = applyAction(prev, action, id, Date.now());
    if (next !== prev) {
      ref.current = next;
      setState(next);
      // My turn is over if I ended it, or a clock ended it for me.
      const over = next.turn > prev.turn || (next.nations[id].seat?.ready && !prev.nations[id].seat?.ready);
      if (over && next.status === 'playing') {
        const up = whoIsUp(next);
        // Alone at the device, carry straight on. With others, hand it over first.
        if (up === id) begin(next, id);
        else if (up) setHandoff(up);
      }
    }
    return next;
  }, []);

  // Clocks: when the question's minute or the turn's time runs out, tell the rules.
  // The rules decide whether anything is actually due.
  useEffect(() => {
    const timer = setInterval(() => {
      const s = ref.current;
      const id = meRef.current;
      if (!s || !id || handoffRef.current || s.status !== 'playing') return;
      if (check(s, { type: 'expire' }, id, Date.now()).ok) dispatch({ type: 'expire' });
    }, 500);
    return () => clearInterval(timer);
  }, [dispatch]);

  // The daily run: check in when the game opens and whenever the tab comes back into view.
  useEffect(() => {
    const checkIn = () => {
      const prev = ref.current;
      if (!prev || prev.status !== 'playing' || document.visibilityState !== 'visible') return;
      // The daily run belongs to solo play: one person, one device, one nation.
      const id = meRef.current;
      if (!id || prev.humans.length !== 1) return;
      const next = applyAction(prev, { type: 'checkIn', day: today() }, id);
      if (next === prev) return;
      ref.current = next;
      setState(next);
      const before = prev.nations[id].seat!.checkIn;
      const streak = next.nations[id].seat!.checkIn.streak;
      if (before.day) setWelcome({ streak, bonus: checkInBonus(prev, id, streak) });
    };
    checkIn();
    document.addEventListener('visibilitychange', checkIn);
    return () => document.removeEventListener('visibilitychange', checkIn);
  }, []);

  // ---- Account and cloud save ----
  const [user, setUser] = useState<{ id: string; email: string | null } | null>(null);
  const [sync, setSync] = useState<Account['sync']>('idle');
  const [conflict, setConflict] = useState<CloudSave | null>(null);
  /** The user id whose cloud save has been compared with the local one. Nothing is uploaded before that. */
  const [reconciled, setReconciled] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    const apply = (u: { id: string; email?: string } | undefined | null) => setUser((prev) => (u ? (prev?.id === u.id ? prev : { id: u.id, email: u.email ?? null }) : null));
    supabase.auth.getSession().then(({ data }) => apply(data.session?.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => apply(session?.user));
    return () => data.subscription.unsubscribe();
  }, []);

  // On sign-in, decide between the save in this browser and the one in the account.
  useEffect(() => {
    if (!user) { setReconciled(null); setConflict(null); setSync('idle'); return; }
    let cancelled = false;
    fetchSave().then((cloud) => {
      if (cancelled) return;
      const local = ref.current;
      if (cloud && (!local || (local.id === cloud.state.id && cloud.state.turn > local.turn))) {
        ref.current = cloud.state;
        setState(cloud.state);
        setMe(whoIsUp(cloud.state));
      } else if (cloud && local && local.id !== cloud.state.id) {
        setConflict(cloud);
      }
      setReconciled(user.id);
    }).catch(() => { if (!cancelled) setSync('error'); });
    return () => { cancelled = true; };
  }, [user]);

  // Upload shortly after each change, once the two saves have been reconciled.
  useEffect(() => {
    if (!user || reconciled !== user.id || conflict) return;
    const timer = setTimeout(() => {
      setSync('saving');
      // Pass-and-play games stay on the device they are played on.
      if (state && state.humans.length > 1) { setSync('idle'); return; }
      (state ? pushSave(state) : deleteSave()).then(() => setSync('saved'), () => setSync('error'));
    }, 1500);
    return () => clearTimeout(timer);
  }, [state, user, reconciled, conflict]);

  // What the account owns. Only the server can grant these; the client just reads them.
  const [owned, setOwned] = useState<readonly string[]>(devOwned);
  useEffect(() => {
    if (!user) { setOwned(devOwned()); return; }
    let cancelled = false;
    fetchEntitlements().then((list) => { if (!cancelled) setOwned([...devOwned(), ...list]); }, () => undefined);
    return () => { cancelled = true; };
  }, [user]);

  const account = useMemo<Account>(() => ({
    available: backendConfigured,
    email: user?.email ?? null,
    sync,
    signIn: async (email) => {
      if (!supabase) return 'Online accounts are not set up for this copy of the game.';
      try {
        const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + window.location.pathname } });
        if (!error) return null;
        return /fetch|network/i.test(error.message) ? 'Could not reach the server. Check your connection and try again.' : error.message;
      } catch {
        return 'Could not reach the server. Check your connection and try again.';
      }
    },
    signOut: () => { void supabase?.auth.signOut(); },
    conflict,
    resolveConflict: (keep) => {
      if (keep === 'cloud' && conflict) { ref.current = conflict.state; setState(conflict.state); setMe(whoIsUp(conflict.state)); setReport(null); }
      setConflict(null);
    },
  }), [user, sync, conflict]);

  const store = useMemo<Store>(() => ({
    state,
    dispatch,
    me,
    handoff,
    acceptHandoff: () => {
      let s = ref.current;
      if (s && handoff) {
        // The clock for a shared device starts when its player takes it, not while it is being passed.
        const started = applyAction(s, { type: 'startClock' }, handoff, Date.now());
        if (started !== s) { s = started; ref.current = s; setState(s); }
        begin(s, handoff);
      }
      setHandoff(null);
    },
    can: (action) => (ref.current && meRef.current ? check(ref.current, action, meRef.current, Date.now()) : { ok: false, reason: 'No game' }),
    newGame: (players, settings, nations) => {
      const game = createGame({
        players, nations, day: today(), id: crypto.randomUUID(), seed: (Math.random() * 2 ** 31) | 0, now: Date.now(),
        settings: { ...settings, clock: players.length > 1 ? 'inTurn' : 'together' },
      });
      seen.current = {};
      setReport(null);
      setHandoff(null);
      setState(game);
      setMe(game.humans[0]);
    },
    abandon: () => {
      const ended = ref.current;
      // Only solo games are scored: a shared device has no single player to credit.
      const record = ended && ended.humans.length === 1 ? recordLegacy(ended, ended.humans[0]) : null;
      // Signed-in players also enter the shared hall. Failure here must never block a new game.
      if (ended && record) submitScore(ended.id, record).catch(() => undefined);
      setReport(null); setWelcome(null); setHandoff(null); setMe(null); setState(null);
    },
    report,
    dismissReport: () => setReport(null),
    welcome,
    dismissWelcome: () => setWelcome(null),
    account,
    owned,
  }), [state, me, handoff, report, welcome, dispatch, account, owned]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}

/** For screens inside a running game. */
export function useGame(): Omit<Store, 'state' | 'me'> & { state: GameState; me: NationId } {
  const s = useStore();
  if (!s.state || !s.me) throw new Error('No game in progress');
  return s as Omit<Store, 'state' | 'me'> & { state: GameState; me: NationId };
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

/** The current time, refreshed a few times a second while `active`. For countdowns. */
export function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

/** 75 → "1:15". */
export function clockText(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
