create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique,
  created_at  timestamptz not null default now()
);

-- Stocks table
create table stocks (
  ticker          varchar primary key,
  current_price   decimal,
  prev_close      decimal,
  currency        varchar,
  last_fetched_at timestamptz,
  company_name    text
);

-- Watchlist stocks
create table watchlist_stocks (
  id           serial primary key,
  user_id      uuid not null references profiles(id) on delete cascade,
  stock_ticker varchar not null references stocks(ticker) on delete cascade,
  unique(user_id, stock_ticker)
);

-- Portfolios
create table portfolios (
  id         serial primary key,
  user_id    uuid not null references profiles(id) on delete cascade,
  name       text not null,
  is_default boolean default false
);

create type trade_side as enum ('buy', 'sell');

-- Trades
create table trades (
  id           serial primary key,
  portfolio_id integer not null references portfolios(id) on delete cascade,
  ticker       varchar not null references stocks(ticker),
  quantity     decimal not null,
  entry_cost   decimal not null,
  fees         decimal,
  notes        text,
  trade_date   timestamptz,
  side         trade_side,
  created_at   timestamptz default now()
);

-- Auto-create profile when user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table profiles         enable row level security;
alter table watchlist_stocks enable row level security;
alter table portfolios       enable row level security;
alter table trades           enable row level security;
alter table stocks           enable row level security;

create policy "profiles_read"   on profiles for select using (auth.uid() = id);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

create policy "stocks_read" on stocks for select using (true);

create policy "watchlist_read"   on watchlist_stocks for select using (auth.uid() = user_id);
create policy "watchlist_insert" on watchlist_stocks for insert with check (auth.uid() = user_id);
create policy "watchlist_delete" on watchlist_stocks for delete using (auth.uid() = user_id);

create policy "portfolios_read"   on portfolios for select using (auth.uid() = user_id);
create policy "portfolios_insert" on portfolios for insert with check (auth.uid() = user_id);
create policy "portfolios_update" on portfolios for update using (auth.uid() = user_id);
create policy "portfolios_delete" on portfolios for delete using (auth.uid() = user_id);

create policy "trades_read" on trades for select using (
  exists (
    select 1 from portfolios
    where portfolios.id = trades.portfolio_id
    and auth.uid() = portfolios.user_id
  )
);
create policy "trades_insert" on trades for insert with check (
  exists (
    select 1 from portfolios
    where portfolios.id = trades.portfolio_id
    and auth.uid() = portfolios.user_id
  )
);
create policy "trades_delete" on trades for delete using (
  exists (
    select 1 from portfolios
    where portfolios.id = trades.portfolio_id
    and auth.uid() = portfolios.user_id
  )
);
