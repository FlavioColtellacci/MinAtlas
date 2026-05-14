-- spatial_ref_sys is owned by supabase_admin (PostGIS in public). The dashboard postgres role
-- cannot ALTER ... ENABLE ROW LEVEL SECURITY on it (42501 must be owner).
-- Revoke Data API access for anon/authenticated instead — same workaround Supabase documents:
-- https://github.com/supabase/supabase/issues/29122
--
-- Note: Security advisors may still list "RLS disabled" until PostGIS is moved out of public;
-- the practical risk (anon reading SRID rows via REST) is removed by these revokes.

revoke all privileges on table public.spatial_ref_sys from anon, authenticated;
revoke all privileges on table public.spatial_ref_sys from public;
