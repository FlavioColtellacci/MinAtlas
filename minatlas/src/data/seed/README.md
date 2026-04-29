# Seed Data Notes

Place raw source exports from DMIRS and Geoscience Australia in this folder for preprocessing and ingestion.

- `mine_sites.geojson` expected for point-based mine sites.
- `tenements.geojson` expected for polygon/multipolygon tenement boundaries.

Use the ingestion pipeline from `minatlas/`:

```bash
DRY_RUN=true npm run ingest:mining

# then run a real ingest
SUPABASE_URL="https://<project>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
npm run ingest:mining
```

Optional remote-source env vars:

- Current pipeline reads these files directly:
  - `Mindex_DMIRS_001_WA_GDA2020_Public_GeoJSON/Mindex_DMIRS_001_WA_GDA2020_Public.geojson`
  - `CurrentTenements_GDA2020_shp/CurrentTenements.shp`
  - `MINEDEX_Operating_Mines_GDA2020_SHP/ESRI/SHAPEFILES/Operating_Mines.shp`
  - `MINEDEX_Major_Resource_Projects_GDA2020_SHP/ESRI/SHAPEFILES/Major_Resource_Projects.shp`
  - `RES_EST_*_GDA2020_SHP/ESRI/SHAPEFILES/*.shp` (enrichment)
  - `EXACT_HistoricalExplorationAct_GDA2020_SHP/ESRI/SHAPEFILES/exactp.shp` (historical exploration polygons)
  - `wabmines_GDA2020_shp/wabmines.shp` (abandoned mine points)

Do not load large GeoJSON files directly in the browser. Data should be ingested into Supabase first.
