create extension if not exists postgis;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tenements'
      and column_name = 'geom'
  ) then
    execute 'create index if not exists tenements_geom_gist_idx on public.tenements using gist (geom)';
  end if;
end
$$;

create or replace function public.tenements_in_bbox(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision,
  max_rows integer default 5000
)
returns setof public.tenements_public
language plpgsql
stable
security invoker
as $$
declare
  envelope geometry;
  geom_expr text;
  sql text;
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

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tenements_public'
      and column_name = 'geom'
  ) then
    geom_expr := 't.geom';
  else
    geom_expr := 'st_setsrid(st_geomfromgeojson(t.boundary_geojson::text), 4326)';
  end if;

  sql := format(
    'select t.*
     from public.tenements_public t
     where %1$s && $1
       and st_intersects(%1$s, $1)
     order by t.area_ha asc nulls last, t.id
     limit $2',
    geom_expr
  );

  return query execute sql using envelope, greatest(coalesce(max_rows, 5000), 1);
end;
$$;

grant execute on function public.tenements_in_bbox(double precision, double precision, double precision, double precision, integer)
to anon, authenticated;
