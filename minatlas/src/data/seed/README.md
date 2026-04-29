# Seed Data Notes

Place raw source exports from DMIRS and Geoscience Australia in this folder only for preprocessing.

- Do not load large GeoJSON files directly in the browser.
- Transform and ingest them into Supabase (`mine_sites`, `tenements`) via server-side scripts.
- Keep this folder for reference samples and ingestion workfiles.
