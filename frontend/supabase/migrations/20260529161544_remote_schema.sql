drop extension if exists "pg_net";


  create table "public"."summaries" (
    "id" bigint generated always as identity not null,
    "ticker" text not null,
    "summary" text not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "summary_date" date default CURRENT_DATE
      );


alter table "public"."summaries" enable row level security;

alter table "public"."stocks" add column "company_name" text not null;

alter table "public"."stocks" add column "currency" text;

alter table "public"."stocks" add column "current_price" numeric;

alter table "public"."stocks" add column "open_price" numeric;

alter table "public"."stocks" add column "updated_at" timestamp with time zone;

CREATE INDEX idx_summaries_ticker ON public.summaries USING btree (ticker);

CREATE UNIQUE INDEX summaries_pkey ON public.summaries USING btree (id);

CREATE UNIQUE INDEX unique_ticker_date_pair ON public.summaries USING btree (ticker, summary_date);

alter table "public"."summaries" add constraint "summaries_pkey" PRIMARY KEY using index "summaries_pkey";

alter table "public"."summaries" add constraint "unique_ticker_date_pair" UNIQUE using index "unique_ticker_date_pair";

grant delete on table "public"."summaries" to "anon";

grant insert on table "public"."summaries" to "anon";

grant references on table "public"."summaries" to "anon";

grant select on table "public"."summaries" to "anon";

grant trigger on table "public"."summaries" to "anon";

grant truncate on table "public"."summaries" to "anon";

grant update on table "public"."summaries" to "anon";

grant delete on table "public"."summaries" to "authenticated";

grant insert on table "public"."summaries" to "authenticated";

grant references on table "public"."summaries" to "authenticated";

grant select on table "public"."summaries" to "authenticated";

grant trigger on table "public"."summaries" to "authenticated";

grant truncate on table "public"."summaries" to "authenticated";

grant update on table "public"."summaries" to "authenticated";

grant delete on table "public"."summaries" to "service_role";

grant insert on table "public"."summaries" to "service_role";

grant references on table "public"."summaries" to "service_role";

grant select on table "public"."summaries" to "service_role";

grant trigger on table "public"."summaries" to "service_role";

grant truncate on table "public"."summaries" to "service_role";

grant update on table "public"."summaries" to "service_role";


  create policy "Allow public read access to summaries"
  on "public"."summaries"
  as permissive
  for select
  to public
using (true);



