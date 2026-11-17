-- What each account owns. The record of truth for purchases.
--
-- Players may read their own rows. Nobody can write from the client: there is
-- deliberately no insert, update or delete policy. Rows are written only by a
-- server function using the service role, after a payment provider confirms a
-- purchase (or by an administrator, as a grant).

create table public.entitlements (
  user_id uuid not null references auth.users on delete cascade,
  -- A product id from src/commerce/catalog.ts.
  product_id text not null check (char_length(product_id) between 1 and 64),
  -- How it was obtained. Entitlements don't care which shop sold them, so web
  -- payments and app-store purchases can both end up here.
  source text not null check (source in ('purchase', 'grant', 'promo')),
  provider text,
  -- The provider's own id for the purchase, so a repeated webhook cannot grant twice.
  provider_ref text unique,
  -- Null for things owned outright; set for a membership that runs out.
  expires_at timestamptz,
  granted_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

alter table public.entitlements enable row level security;

create policy "Players read their own entitlements" on public.entitlements
  for select to authenticated using ((select auth.uid()) = user_id);
