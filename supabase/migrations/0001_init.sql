-- Political Empire: cloud saves and the shared hall of nations.
-- Apply with `supabase db push`, or paste into the SQL editor.

-- One save per player: the whole GameState, as the client holds it.
create table public.saves (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  game_id text not null,
  turn integer not null check (turn >= 1),
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.saves enable row level security;

create policy "Players read their own save" on public.saves
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Players create their own save" on public.saves
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Players update their own save" on public.saves
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Players delete their own save" on public.saves
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Finished games. Anyone may read the ranking; a player may add one row per game.
-- No email or account detail is stored here: the nation's name is the public identity.
create table public.scores (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  game_id text not null,
  nation text not null check (char_length(nation) between 1 and 40),
  government text not null check (government in ('dictatorship', 'aristocracy', 'oneparty', 'council', 'democracy', 'merchant', 'commune')),
  outcome text not null check (outcome in ('won', 'lost', 'abandoned')),
  turns integer not null check (turns between 1 and 100000),
  hexes integer not null check (hexes between 0 and 140),
  score integer not null check (score between 0 and 100000),
  created_at timestamptz not null default now(),
  unique (user_id, game_id)
);

create index scores_by_score on public.scores (score desc);

alter table public.scores enable row level security;

create policy "Anyone can read the hall of nations" on public.scores
  for select to anon, authenticated using (true);
create policy "Players record their own games" on public.scores
  for insert to authenticated with check ((select auth.uid()) = user_id);
-- No update or delete policy: a recorded game is permanent.
