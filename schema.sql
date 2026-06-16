create table profiles (
    id uuid refrences auth.users on delete, cascade primary key,
    username text unique not null,
    coins integer 100 not null check (coins >= 0),
    created_at timestamp with time zone default now() not null
);

create table islands (
    id uuid default gen_random_uuid() primary key,
    owner_id uuid refrences profiles(id) on delete cascade not null unique,
    x integer not null check (x >= and x < 30),
    y integer not null check ( y >= 0 and y < 30),
    name text default 'Insula mea' not null,
    hearts_count integer default 0 not null,
    visits_count integer default 0 not null,
    created_at timestamp with time zone default now() not null,
    unique(x, y)
);

create table decorations (
    id uuid default gen_random_uuid() primary key,
    island_id uuid refrences islands(id) on delete cascade not null,
    emoji text not null,
    px real not null check (px >= 0 and px <= 1),
    py real not null check (py >= 0 and py <= 1),
    scale real default 1 not null,
    created_at timestamp with time zone default now() not null
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    

