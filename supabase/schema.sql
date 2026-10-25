create table if not exists public.aggie_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  restaurant_id text not null,
  author text not null,
  rating integer not null check (rating between 1 and 5),
  dish text not null,
  body text not null,
  spend integer not null check (spend between 1 and 500),
  visited_at date not null,
  updated_at timestamptz not null default now(),
  unique(user_id,restaurant_id)
);
create index if not exists aggie_reviews_restaurant_updated on public.aggie_reviews(restaurant_id,updated_at desc);
create table if not exists public.aggie_spots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  restaurant_id text not null,
  status text not null check (status in ('want','been')),
  unique(user_id,restaurant_id)
);
alter table public.aggie_reviews enable row level security;
alter table public.aggie_spots enable row level security;
revoke all on public.aggie_spots from anon;
grant select on public.aggie_reviews to anon, authenticated;
grant insert, update, delete on public.aggie_reviews to authenticated;
grant select, insert, update, delete on public.aggie_spots to authenticated;
create policy "Public Aggie reviews" on public.aggie_reviews for select to anon, authenticated using (true);
create policy "Verified Aggies insert reviews" on public.aggie_reviews for insert to authenticated
  with check ((select auth.uid())=user_id and lower(auth.jwt()->>'email') like '%@tamu.edu');
create policy "Verified Aggies edit own reviews" on public.aggie_reviews for update to authenticated
  using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id and lower(auth.jwt()->>'email') like '%@tamu.edu');
create policy "Aggies delete own reviews" on public.aggie_reviews for delete to authenticated using ((select auth.uid())=user_id);
create policy "Own saved spots" on public.aggie_spots for select to authenticated using ((select auth.uid())=user_id);
create policy "Aggies save own spots" on public.aggie_spots for insert to authenticated
  with check ((select auth.uid())=user_id and lower(auth.jwt()->>'email') like '%@tamu.edu');
create policy "Aggies edit own spots" on public.aggie_spots for update to authenticated
  using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id and lower(auth.jwt()->>'email') like '%@tamu.edu');
create policy "Aggies remove own spots" on public.aggie_spots for delete to authenticated using ((select auth.uid())=user_id);
