# Mine sites data quality baseline (Supabase + source crosswalk)

Generated from live queries on **MinAtlas** Supabase (`mine_sites_public`, `mine_sites`) and inspection of `mine_sites.raw` JSON. Seed GeoJSON/shapefiles are not committed in this repo; provenance below is inferred from stored `raw.records` and `source_layers`.

## Phase A — SQL baseline (`mine_sites_public`)

**Row count:** 624

**`sparse_summary`** (matches DetailCard when both `operator` and `locationLabel` inputs are empty: no operator, no nearest town string, no positive distance to Perth):

```sql
(operator is null or trim(operator) = '')
and (nearest_town is null or trim(nearest_town) = '')
and (distance_to_perth_km is null or distance_to_perth_km <= 0)
```

| Metric | Count | % of rows |
|--------|------:|----------:|
| `sparse_summary` | 577 | **92.47** |
| `sparse_card` (same + empty `commodity` + null `annual_production_oz` + null `production_type`) | 0 | 0.00 |

`sparse_card` is zero because every row has at least one normalized commodity from Mindex `site_commo` / shapefile merges; `production_type` is often still filled from Mindex `site_sub_t`.

### Null / empty rates (UI-relevant columns)

| Column | % null | Notes |
|--------|-------:|-------|
| `operator` | 100.00 | No column populated in current ingest |
| `nearest_town` | 92.47 | 47 rows (7.53%) have a value |
| `distance_to_perth_km` | 100.00 | Never computed in ingest |
| `annual_production_oz` | 100.00 | Never mapped |
| `roster` | 100.00 | Never mapped |
| `production_type` | 43.59 | % null |
| `commodity` empty | 0.00 | — |
| `status` empty | 0.00 | — |

### `source_layers` distribution (`mine_sites.raw`)

| `source_layers` | Sites |
|-----------------|------:|
| `["mindex_main"]` | 577 |
| `["mindex_main","operating_mines"]` | 28 |
| `["mindex_main","operating_mines","major_projects"]` | 10 |
| `["mindex_main","major_projects"]` | 9 |

577 **mindex-only** sites align exactly with **`sparse_summary` = true** (no Operating/Major polygon merge → no `LGA_NAME` / `DISTR_NAME` in ingest path for `nearest_town`).

### Deterministic sample rows for GeoJSON / MINEDEX cross-check (`sparse_summary`)

Use `site_code` to locate features in local Mindex GeoJSON (`site_code` / `SITE_CODE`).

| `id` | `name` | `site_code` | `proj_code` |
|------|--------|---------------|-------------|
| `71997f3c-8a62-4708-ad71-58ddb243ed55` | Pieces of Eight - Admiral Hill | S0000001 | J00238 |
| `afdd82f7-e847-4132-9f77-5cc50a188eb6` | Aspacia | S0000005 | J01011 |
| `757cc809-ccf5-47aa-997d-7514b6ecb20e` | Baden Powell | S0000006 | J05474 |
| `05be43c0-51b6-421e-973d-8bcc13b03a60` | Dingo - Southern Zone | S0000007 | J00007 |
| `4b5128b8-b9d3-4bce-ad9b-8c98deb6804e` | Bamboo Creek Plant | S0000009 | J00008 |
| `c903bd96-0456-4945-859f-1b80fff09bd8` | Bamboo Creek Tailings TSF | S0000010 | J00008 |
| `2adfc50f-cec5-492b-a968-f4020f254596` | Prophecy - Perseverance | S0000011 | J00008 |
| `1351f145-fa3b-4af0-b6cb-e17ce1918c9d` | Baneygo | S0000012 | J00009 |
| `2f5322c0-df7c-45b4-ba2d-fa5cee1bb0d7` | Moolart Well - Duketon Group Old | S0000013 | J00009 |
| `9c7b0127-9977-4486-8876-6435a70a2b52` | Christmas Well - Baneygo | S0000014 | J00009 |
| `6318df4a-ddcc-4395-aeb9-3ecdb0db2e9c` | McKenzie Well Group | S0000015 | J00009 |
| `6e8aa633-3a69-441e-bc30-48cf1d6f649a` | Reichelt Find | S0000016 | J00009 |
| `ad20f982-2187-40c2-b3e1-cd293824dc30` | Bannockburn Plant (Removed) | S0000017 | J04199 |
| `0c201aa5-27a1-42e3-9010-e1ce654088b9` | Bardoc - Davyhurst Group | S0000018 | J00084 |
| `ce99ba22-8f19-4d03-9154-0e63dd85b150` | Davyhurst Plant | S0000019 | J00084 |
| `f2354654-853c-4a44-85d7-ef9b9788aba6` | Excelsior - Bardoc | S0000020 | J02816 |
| `e13ad8bc-e66a-449d-ad27-9b0526943e00` | Lights of Israel Openpit | S0000021 | J00084 |
| `dc1984cf-394d-4034-8505-d2555df818e0` | Zoroastrian | S0000022 | J02816 |
| `b4304bb6-545f-4f3f-aae1-771bffdb4515` | Dohertys - Scheelite | S0000024 | J03201 |
| `0a770f94-a82d-478e-bd69-e8d4815e8701` | Errolls Legacy | S0000025 | J05889 |

**Base table:** use `mine_sites.raw` for full unparsed `records` (array of feature property objects). The public view does not expose `site_code`; join on `id` when auditing.

---

## Phase B — Source crosswalk (Mindex vs Operating/Major shapefiles)

### Mindex GeoJSON properties (`source_layers = ["mindex_main"]` only)

Every **577** mindex-only sites has **exactly one** record shape with these keys (all present on every row in DB sample):

`commodity`, `confidenti`, `extract_da`, `gid`, `latitude`, `longitude`, `point_conf`, `proj_code`, `proj_title`, `short_name`, `site_code`, `site_commo`, `site_stage`, `site_sub_t`, `site_title`, `site_type_`, `target_com`, `web_link`

**Not present on Mindex-only features:** `LGA_NAME`, `DISTR_NAME`, `operator`, `HOLDER*`, or any field matching `hold|oper|owner|company|roster|shift|work|prod|output|ounce|oz|gold_t|tonne` across **all** `raw.records` keys in the database (regex key scan returned no matches).

Implications:

- **`nearest_town`**: current `getFirst(..., ["LGA_NAME"])` never fires for mindex-only rows because `LGA_NAME` is absent. Add **`DISTR_NAME`** and **`LGA_NAME`** for merged Operating/Major records (see below); mindex-only rows still need **derived locality** (reverse geocode), **map sheet** fields (`MAPNA_100K`, `MAPNA_250K`), or **ArcGIS enrichment** if product requires a town string.
- **`operator`**: no literal operator/holder attribute in stored exports. **`proj_title`** often looks like `"Site / Company"` (e.g. `Telfer / Newcrest`, `Murchison / Westgold`) — optional **heuristic split** after `/` for display/ingest, with validation; otherwise operator stays null without live MINEDEX/API.
- **`annual_production_oz` / `roster`**: no candidate keys in `raw`; keep null unless a different DMIRS layer or MINEDEX field is added.
- **`distance_to_perth_km`**: derive from `(lat,lng)` in ingest (no upstream field required).

### Operating mines + Major resource projects (merged shapefile records)

Non-Mindex records in `raw.records` (detected as objects **without** `site_title`) appear **57** times total across the corpus and carry **uppercase** DMIRS-style attributes:

`ACTIVE_FLA`, `COMMOD_G_N`, `COMMODITIE`, `CONFIDENTI`, `DEVELOPMEN`, **`DISTR_NAME`**, `DISTR_NO`, `EASTING`, `EXTRACT_DA`, `INCL_COM_F`, `LABEL_NAME`, `LATITUDE`, **`LGA_NAME`**, `LONGITUDE`, `MAP_COMMOD`, `MAP_SERIES`, `MAPNA_100K`, `MAPNA_250K`, `MAPNO_100K`, `MAPNO_250K`, `MGA_ZONE`, `NORTHING`, `PROJ_CODE`, `PROJ_TITLE`, `SHORT_TITL`, `SITE_CODE`, `SITE_TYPE`, **`STAGE`**, **`SUB_TYPE`**, `SYMBOL`, `TARGET_G_N`, `TECTONIC_U`, **`TITLE`**, `SYMBOL_STA` (subset, 19 rows — Major projects marker)

**`SYMBOL_STA`** appears on Major-projects-style rows in samples (`"O"` for operating on map series).

### Recommended `getFirst` / `mergeMineCandidate` extensions

| Target field | Add keys / behavior | Notes |
|--------------|---------------------|-------|
| `nearestTown` | `["DISTR_NAME", "LGA_NAME"]` (before or after LGA depending on product: **DISTR_NAME** is closer to a field locality; **LGA_NAME** is LGA) | Fixes merged sites; **rename UI** to “Region” for LGA if kept. Mindex-only: still null without extra data source. |
| `status` / `normalizeStatus` | Already uses `STAGE`, `site_stage`; ensure merged record wins via existing merge | `STAGE` uppercase already in alternate keys path for some fields — verify `getFirst` lists include **`STAGE`** for shapefile-only passes (already in `baseMineCandidate` for status via `site_stage`, `STAGE`, …). |
| `productionType` | **`SUB_TYPE`** already used via `normalizeProductionType(getFirst(..., ["site_sub_t", "SUB_TYPE", "SITE_SUB_T"]))` — confirm shapefile values reach merged candidate | Merged rows use `SUB_TYPE`; if merge order leaves mindex null, ensure Operating/Major candidate merges after mindex. |
| `operator` | No reliable key; optional: parse **`proj_title`** / **`PROJ_TITLE`** after `/` | Treat as display-only until validated against MINEDEX. |
| `distanceToPerthKm` | Haversine to fixed Perth CBD from `lat`/`lng` | Per plan Phase C. |
| `commodity` | Shapefile **`COMMODITIE`**, **`MAP_COMMOD`**, **`COMMOD_G_N`** | `COMMODITIE` is space-separated codes (`Au Cu Ag`); extend `toCommodityList` or add a normalizer if gaps appear. |

### Files to match when cross-checking locally

Paths from [`scripts/ingest-mining-data.mjs`](../scripts/ingest-mining-data.mjs):

- Mindex: `src/data/seed/Mindex_DMIRS_001_WA_GDA2020_Public_GeoJSON/Mindex_DMIRS_001_WA_GDA2020_Public.geojson`
- Operating mines: `.../MINEDEX_Operating_Mines_GDA2020_SHP/ESRI/SHAPEFILES/Operating_Mines.shp`
- Major projects: `.../MINEDEX_Major_Resource_Projects_GDA2020_SHP/ESRI/SHAPEFILES/Major_Resource_Projects.shp`

---

## Re-run queries (copy-paste)

```sql
-- Rates + sparse_summary / sparse_card
with t as (
  select *,
    (operator is null or trim(operator) = '')
      and (nearest_town is null or trim(nearest_town) = '')
      and (distance_to_perth_km is null or distance_to_perth_km <= 0) as sparse_summary,
    (operator is null or trim(operator) = '')
      and (nearest_town is null or trim(nearest_town) = '')
      and (distance_to_perth_km is null or distance_to_perth_km <= 0)
      and (commodity is null or cardinality(commodity) = 0)
      and annual_production_oz is null
      and production_type is null as sparse_card
  from mine_sites_public
)
select count(*) as total,
  count(*) filter (where sparse_summary) as sparse_summary_n,
  round(100.0 * count(*) filter (where sparse_summary) / count(*), 2) as sparse_summary_pct,
  count(*) filter (where sparse_card) as sparse_card_n
from t;
```

```sql
-- Join public view to raw for site_code on sparse rows
select p.id, p.name, m.raw->>'site_code' as site_code, m.raw->>'proj_code' as proj_code
from mine_sites_public p
join mine_sites m on m.id = p.id
where (p.operator is null or trim(p.operator) = '')
  and (p.nearest_town is null or trim(p.nearest_town) = '')
  and (p.distance_to_perth_km is null or p.distance_to_perth_km <= 0)
order by m.raw->>'site_code', p.id
limit 25;
```
