-- Expose only the application API schema through PostgREST.
-- Keeping `public` unexposed prevents extension-owned PostGIS objects such as
-- `spatial_ref_sys` and `st_estimatedextent` from being reachable via REST.

alter role authenticator set pgrst.db_schemas = 'api,graphql_public';
notify pgrst, 'reload config';
