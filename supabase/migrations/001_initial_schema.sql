create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  home_city text,
  default_currency text default 'USD',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  destination_text text not null,
  destination_place_id text,
  destination_lat double precision,
  destination_lng double precision,
  start_date date,
  end_date date,
  days_count integer not null check (days_count between 1 and 21),
  budget_amount numeric,
  currency text default 'USD',
  travelers integer default 1 check (travelers > 0),
  travel_style text,
  pace text,
  interests text[] default '{}',
  food_preferences text[] default '{}',
  accessibility_needs text[] default '{}',
  must_see text[] default '{}',
  avoid text[] default '{}',
  status text default 'draft',
  is_public boolean default false,
  public_share_slug text unique,
  input_snapshot jsonb not null default '{}'::jsonb,
  itinerary_json jsonb not null default '{}'::jsonb,
  ai_model text,
  estimated_total_cost numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.itinerary_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade,
  day_number integer not null,
  date date,
  title text,
  summary text,
  weather_json jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade,
  day_id uuid references public.itinerary_days(id) on delete cascade,
  day_number integer not null,
  order_index integer not null,
  start_time text,
  end_time text,
  title text not null,
  description text,
  category text,
  place_name text,
  place_id text,
  address text,
  lat double precision,
  lng double precision,
  estimated_cost numeric,
  currency text default 'USD',
  booking_url text,
  source text default 'ai',
  confidence text default 'medium',
  ai_reason text,
  transit_notes text,
  created_at timestamptz default now()
);

create table if not exists public.trip_revisions (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  instruction text not null,
  previous_itinerary_json jsonb,
  revised_itinerary_json jsonb,
  created_at timestamptz default now()
);

create table if not exists public.saved_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  google_place_id text,
  name text not null,
  address text,
  lat double precision,
  lng double precision,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.trip_chat_messages (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz default now()
);

create index if not exists trips_user_id_idx on public.trips(user_id);
create index if not exists trips_public_share_slug_idx on public.trips(public_share_slug);
create index if not exists itinerary_items_trip_id_idx on public.itinerary_items(trip_id);
create index if not exists itinerary_items_place_id_idx on public.itinerary_items(place_id);
create index if not exists trip_revisions_trip_id_idx on public.trip_revisions(trip_id);
create index if not exists saved_places_user_id_idx on public.saved_places(user_id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trips_set_updated_at on public.trips;
create trigger trips_set_updated_at
before update on public.trips
for each row execute function public.set_updated_at();
