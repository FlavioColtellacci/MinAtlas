-- Mine sites: DMIRS admin / geology fields + ingest RPC + public view
alter table public.mine_sites
  add column if not exists lga text,
  add column if not exists district text,
  add column if not exists tectonic_unit text;

create or replace function public.ingest_mine_site_api(
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
set search_path to public, extensions, pg_temp
as $$
declare
  v_id uuid;
begin
  insert into public.mine_sites (
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
    location,
    raw,
    updated_at
  ) values (
    p_name,
    p_operator,
    p_commodity,
    p_state,
    p_status,
    p_production_type,
    p_annual_production_oz,
    p_roster,
    p_nearest_town,
    p_distance_to_perth_km,
    p_lga,
    p_district,
    p_tectonic_unit,
    st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
    p_raw,
    now()
  )
  returning id into v_id;

  return v_id;
end;
$$;

drop view if exists public.mine_sites_public;

create view public.mine_sites_public as
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

grant select on public.mine_sites_public to anon;
grant select on public.mine_sites_public to authenticated;
grant select on public.mine_sites_public to service_role;
