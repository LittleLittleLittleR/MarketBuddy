-- Enable UUID extension (optional but recommended)
create extension if not exists "uuid-ossp";

-- Users table
create table users (
  id          serial primary key,
  username    varchar not null unique,
  email       varchar not null unique,
  password    varchar not null,
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

-- Watchlist stocks table
create table watchlist_stocks (
  id           serial primary key,
  user_id      integer not null references users(id) on delete cascade,
  stock_ticker varchar not null references stocks(ticker) on delete cascade,
  unique(user_id, stock_ticker)
);

-- Portfolios table
create table portfolios (
  id         serial primary key,
  user_id    integer not null references users(id) on delete cascade,
  name       text not null,
  is_default boolean default false
);

-- Trade side enum
create type trade_side as enum ('buy', 'sell');

-- Trades table
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

-- Enable RLS on all tables
alter table users            enable row level security;
alter table watchlist_stocks enable row level security;
alter table portfolios       enable row level security;
alter table trades           enable row level security;
alter table stocks           enable row level security;

-- STOCKS: anyone can read, only service role can write
create policy "stocks_read"  on stocks for select using (true);

-- USERS: users can only see/update themselves
create policy "users_read"   on users for select using (auth.uid()::text = id::text);
create policy "users_update" on users for update using (auth.uid()::text = id::text);

-- WATCHLIST: users can only see/manage their own
create policy "watchlist_read"   on watchlist_stocks for select using (auth.uid()::text = user_id::text);
create policy "watchlist_insert" on watchlist_stocks for insert with check (auth.uid()::text = user_id::text);
create policy "watchlist_delete" on watchlist_stocks for delete using (auth.uid()::text = user_id::text);

-- PORTFOLIOS: users can only see/manage their own
create policy "portfolios_read"   on portfolios for select using (auth.uid()::text = user_id::text);
create policy "portfolios_insert" on portfolios for insert with check (auth.uid()::text = user_id::text);
create policy "portfolios_update" on portfolios for update using (auth.uid()::text = user_id::text);
create policy "portfolios_delete" on portfolios for delete using (auth.uid()::text = user_id::text);

-- TRADES: users can only access trades in their own portfolios
create policy "trades_read" on trades for select using (
  exists (
    select 1 from portfolios
    where portfolios.id = trades.portfolio_id
    and auth.uid()::text = portfolios.user_id::text
  )
);
create policy "trades_insert" on trades for insert with check (
  exists (
    select 1 from portfolios
    where portfolios.id = trades.portfolio_id
    and auth.uid()::text = portfolios.user_id::text
  )
);
create policy "trades_delete" on trades for delete using (
  exists (
    select 1 from portfolios
    where portfolios.id = trades.portfolio_id
    and auth.uid()::text = portfolios.user_id::text
  )
);
