-- Hardening the Data API: move user-facing objects from public into a dedicated `api` schema.
-- After this migration is applied, the Supabase Dashboard Exposed Schemas must be flipped
-- from `public` -> `api`. Base tables (public.mine_sites, public.tenements) keep RLS and stay
-- in public; they are no longer reachable through the Data API once `public` is unexposed.

create schema if not exists api;

grant usage on schema api to anon, authenticated, service_role;

-- mine_sites view ---------------------------------------------------------
drop view if exists api.mine_sites_public;
create view api.mine_sites_public
  with (security_invoker = true)
as
select
  id,
  name,
  operator,
  commodity,
  state,
  status,
  production_type,
  annual_production_oz,
  roster,
  nearest_town,
  distance_to_perth_km,
  lga,
  district,
  tectonic_unit,
  st_x(location::geometry) as lng,
  st_y(location::geometry) as lat,
  created_at,
  updated_at
from public.mine_sites;

grant select on api.mine_sites_public to anon, authenticated, service_role;

-- tenements view ----------------------------------------------------------
drop view if exists api.tenements_public;
create view api.tenements_public
  with (security_invoker = true)
as
select
  id,
  tenement_id,
  holder,
  commodity,
  state,
  status,
  grant_date,
  expiry_date,
  area_ha,
  st_asgeojson(boundary::geometry)::jsonb as boundary_geojson,
  created_at
from public.tenements;

grant select on api.tenements_public to anon, authenticated, service_role;

-- tenements_in_bbox RPC ---------------------------------------------------
-- Read directly from public.tenements to use the GIST index on boundary,
-- and project columns to match api.tenements_public exactly.
create or replace function api.tenements_in_bbox(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision,
  max_rows integer default 5000
)
returns setof api.tenements_public
language plpgsql
stable
security invoker
set search_path = public, extensions, pg_temp
as $$
declare
  envelope geometry;
begin
  if not (
    min_lng is not null
    and min_lat is not null
    and max_lng is not null
    and max_lat is not null
    and min_lng < max_lng
    and min_lat < max_lat
  ) then
    raise exception 'Invalid bbox: (% %, % %)', min_lng, min_lat, max_lng, max_lat
      using errcode = '22023';
  end if;

  envelope := st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326);

  return query
  select
    t.id,
    t.tenement_id,
    t.holder,
    t.commodity,
    t.state,
    t.status,
    t.grant_date,
    t.expiry_date,
    t.area_ha,
    st_asgeojson(t.boundary::geometry)::jsonb as boundary_geojson,
    t.created_at
  from public.tenements t
  where t.boundary::geometry && envelope
    and st_intersects(t.boundary::geometry, envelope)
  order by t.area_ha asc nulls last, t.id
  limit greatest(coalesce(max_rows, 5000), 1);
end;
$$;

grant execute on function api.tenements_in_bbox(
  double precision, double precision, double precision, double precision, integer
) to anon, authenticated, service_role;

-- mining_news table -------------------------------------------------------
create table if not exists api.mining_news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null unique,
  description text,
  source_name text,
  source_favicon_url text,
  thumbnail_url text,
  published_at timestamptz,
  category text not null check (category in ('australia', 'global', 'relevant')),
  created_at timestamptz not null default now()
);

create index if not exists mining_news_category_published_at_idx
  on api.mining_news (category, published_at desc nulls last, created_at desc);

alter table api.mining_news enable row level security;

drop policy if exists "Public read mining_news" on api.mining_news;
create policy "Public read mining_news"
  on api.mining_news
  for select
  to anon, authenticated
  using (true);

grant select on api.mining_news to anon, authenticated;
grant all on api.mining_news to service_role;

insert into api.mining_news (
  id, title, url, description, source_name, source_favicon_url,
  thumbnail_url, published_at, category, created_at
)
select id, title, url, description, source_name, source_favicon_url,
       thumbnail_url, published_at, category, created_at
from public.mining_news
on conflict (url) do nothing;

-- Ingest RPCs (service role) ----------------------------------------------
create or replace function api.ingest_mine_site_api(
  p_name text,
  p_operator text,
  p_commodity text[],
  p_state text,
  p_status text,
  p_production_type text,
  p_annual_production_oz numeric,
  p_roster text,
  p_nearest_town text,
  p_distance_to_perth_km numeric,
  p_lat double precision,
  p_lng double precision,
  p_lga text,
  p_district text,
  p_tectonic_unit text,
  p_raw jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public, extensions, pg_temp
as $$
declare
  v_id uuid;
begin
  insert into public.mine_sites (
    name, operator, commodity, state, status, production_type,
    annual_production_oz, roster, nearest_town, distance_to_perth_km,
    lga, district, tectonic_unit, location, raw, updated_at
  ) values (
    p_name, p_operator, p_commodity, p_state, p_status, p_production_type,
    p_annual_production_oz, p_roster, p_nearest_town, p_distance_to_perth_km,
    p_lga, p_district, p_tectonic_unit,
    st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
    p_raw, now()
  ) returning id into v_id;

  return v_id;
end;
$$;

revoke all on function api.ingest_mine_site_api(
  text, text, text[], text, text, text, numeric, text, text, numeric,
  double precision, double precision, text, text, text, jsonb
) from public;
grant execute on function api.ingest_mine_site_api(
  text, text, text[], text, text, text, numeric, text, text, numeric,
  double precision, double precision, text, text, text, jsonb
) to service_role;

create or replace function api.ingest_tenement_api(
  p_tenement_id text,
  p_holder text,
  p_commodity text[],
  p_state text,
  p_status text,
  p_grant_date date,
  p_expiry_date date,
  p_area_ha numeric,
  p_boundary_geojson jsonb,
  p_raw jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public, extensions, pg_temp
as $$
declare
  v_id uuid;
begin
  insert into public.tenements (
    tenement_id, holder, commodity, state, status,
    grant_date, expiry_date, area_ha, boundary, raw
  ) values (
    p_tenement_id, p_holder, p_commodity, p_state, p_status,
    p_grant_date, p_expiry_date, p_area_ha,
    case
      when p_boundary_geojson is null then null
      else st_setsrid(st_geomfromgeojson(p_boundary_geojson::text), 4326)::geography
    end,
    p_raw
  ) returning id into v_id;

  return v_id;
end;
$$;

revoke all on function api.ingest_tenement_api(
  text, text, text[], text, text, date, date, numeric, jsonb, jsonb
) from public;
grant execute on function api.ingest_tenement_api(
  text, text, text[], text, text, date, date, numeric, jsonb, jsonb
) to service_role;

-- Clear RPCs replace the previous PostgREST `from(table).delete().neq(...)` pattern
-- which only worked while `public` was an exposed schema.
create or replace function api.clear_mine_sites()
returns bigint
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_count bigint;
begin
  delete from public.mine_sites;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function api.clear_mine_sites() from public;
grant execute on function api.clear_mine_sites() to service_role;

create or replace function api.clear_tenements()
returns bigint
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_count bigint;
begin
  delete from public.tenements;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function api.clear_tenements() from public;
grant execute on function api.clear_tenements() to service_role;
