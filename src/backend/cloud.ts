import { SAVE_VERSION, type GameState } from '../game';
import type { LegacyRecord } from '../ui/legacy';
import { supabase } from './client';

// Every call here is safe to make with no backend and no session: it resolves
// to "nothing" instead of throwing, so the game never depends on the network.

export interface CloudSave {
  state: GameState;
  updatedAt: string;
}

export async function fetchSave(): Promise<CloudSave | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('saves').select('state, updated_at').maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const state = data.state as GameState;
  return state?.version === SAVE_VERSION ? { state, updatedAt: data.updated_at as string } : null;
}

export async function pushSave(state: GameState): Promise<void> {
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) return;
  const { error } = await supabase.from('saves').upsert({ user_id: uid, game_id: state.id, turn: state.turn, state, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function deleteSave(): Promise<void> {
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) return;
  const { error } = await supabase.from('saves').delete().eq('user_id', uid);
  if (error) throw error;
}

export interface RankedScore extends Omit<LegacyRecord, 'date' | 'name'> {
  nation: string;
}

/** Add a finished game to the shared hall. Needs a signed-in player; one row per game. */
export async function submitScore(gameId: string, r: LegacyRecord): Promise<void> {
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return;
  const { error } = await supabase.from('scores').upsert(
    { game_id: gameId, nation: r.name.slice(0, 40), government: r.government, outcome: r.outcome, turns: r.turns, hexes: r.hexes, score: r.score },
    { onConflict: 'user_id,game_id', ignoreDuplicates: true },
  );
  if (error) throw error;
}

export async function fetchRanking(limit = 10): Promise<RankedScore[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('scores').select('nation, government, outcome, turns, hexes, score').order('score', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as RankedScore[];
}
