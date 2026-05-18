alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.itinerary_days enable row level security;
alter table public.itinerary_items enable row level security;
alter table public.trip_revisions enable row level security;
alter table public.saved_places enable row level security;
alter table public.trip_chat_messages enable row level security;

create policy "Users can select own profile"
on public.profiles for select
using (id = auth.uid());

create policy "Users can insert own profile"
on public.profiles for insert
with check (id = auth.uid());

create policy "Users can update own profile"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "Users can select own trips"
on public.trips for select
using (user_id = auth.uid());

create policy "Public can read public trips"
on public.trips for select
using (is_public = true);

create policy "Users can insert own trips"
on public.trips for insert
with check (user_id = auth.uid());

create policy "Users can update own trips"
on public.trips for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete own trips"
on public.trips for delete
using (user_id = auth.uid());

create policy "Readable itinerary days through trip ownership or public share"
on public.itinerary_days for select
using (
  exists (
    select 1 from public.trips
    where trips.id = itinerary_days.trip_id
      and (trips.user_id = auth.uid() or trips.is_public = true)
  )
);

create policy "Owners can manage itinerary days"
on public.itinerary_days for all
using (
  exists (select 1 from public.trips where trips.id = itinerary_days.trip_id and trips.user_id = auth.uid())
)
with check (
  exists (select 1 from public.trips where trips.id = itinerary_days.trip_id and trips.user_id = auth.uid())
);

create policy "Readable itinerary items through trip ownership or public share"
on public.itinerary_items for select
using (
  exists (
    select 1 from public.trips
    where trips.id = itinerary_items.trip_id
      and (trips.user_id = auth.uid() or trips.is_public = true)
  )
);

create policy "Owners can manage itinerary items"
on public.itinerary_items for all
using (
  exists (select 1 from public.trips where trips.id = itinerary_items.trip_id and trips.user_id = auth.uid())
)
with check (
  exists (select 1 from public.trips where trips.id = itinerary_items.trip_id and trips.user_id = auth.uid())
);

create policy "Users can access own revisions"
on public.trip_revisions for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can access own saved places"
on public.saved_places for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can access own trip chat messages"
on public.trip_chat_messages for all
using (user_id = auth.uid())
with check (user_id = auth.uid());
