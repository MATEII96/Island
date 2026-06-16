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
    insert into profiles (id, username)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8))
    );
    return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function spend_coins(amount integer)
returns void language plpgsql security definer as $$
declare
    uid uuid := auth.uid();
    cur integer;
begin
    if uid is null then raise exception 'not authenticated'; end if;
    select coins into cur from profiles where id = uid for update;
    if cur < amount then raise exception 'insufficient coins'; end if;
    update profiles set coins = coins - amount where id = uid;
end; $$;

create or replace function add_coins(amount integer)
returns void language plpgsql security definer as $$
begin
    if auth.uid() is null then raise exception 'not authenticated'; end if;
    update profiles set coins = coins + amount where id = auth.uid();
end; $$;

create or replace function increment_hearts(iid uuid)
returns void laguage sql security definer as $$
    update islands set hearts_count = hearts_count + 1 where id = iid;
$$;

create or replace function decrement_hearts(iid uuid)
returns void language sql security definer as $$
    update islands set hearts_count = greatest(0, hearts_count - 1) where id = iid;
$$;

alter table profiles enable row level security;
alter table islands enable row level security;
alter table decorations enable row level security;
alter table hearts enable row level security;

create policy "profiles_read_all" on islands for select using (true);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);



