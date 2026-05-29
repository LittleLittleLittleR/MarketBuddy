-- Remove unnecessary columns

alter table stocks
drop column current_price,
drop column prev_close,
drop column currency,
drop column last_fetched_at,
drop column company_name;

-- Seed ticker pool

insert into stocks (ticker)
values
  ('AAPL'),
  ('MSFT'),
  ('GOOGL'),
  ('AMZN'),
  ('TSLA'),
  ('NVDA'),
  ('META'),
  ('NFLX'),
  ('AMD'),
  ('INTC');