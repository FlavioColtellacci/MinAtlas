-- Reduce advisor security findings for user-owned database objects.

-- Make view obey caller permissions/RLS instead of creator privileges.
alter view public.mine_sites_public
set (security_invoker = true);

-- Fix mutable search_path warning on RPC function.
alter function public.tenements_in_bbox(
  double precision,
  double precision,
  double precision,
  double precision,
  integer
)
set search_path = public, extensions, pg_temp;
