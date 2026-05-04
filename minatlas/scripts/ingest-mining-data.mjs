import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import shapefile from "shapefile";

const DRY_RUN = process.env.DRY_RUN === "true";
const DERIVE_PERTH_DISTANCE = process.env.DERIVE_PERTH_DISTANCE !== "false";
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PERTH_CBD = { lat: -31.9523, lng: 115.8613 };

const paths = {
  mindexGeoJson: "src/data/seed/Mindex_DMIRS_001_WA_GDA2020_Public_GeoJSON/Mindex_DMIRS_001_WA_GDA2020_Public.geojson",
  currentTenements: "src/data/seed/CurrentTenements_GDA2020_shp/CurrentTenements.shp",
  operatingMines: "src/data/seed/MINEDEX_Operating_Mines_GDA2020_SHP/ESRI/SHAPEFILES/Operating_Mines.shp",
  majorProjects: "src/data/seed/MINEDEX_Major_Resource_Projects_GDA2020_SHP/ESRI/SHAPEFILES/Major_Resource_Projects.shp",
  exactPolygons: "src/data/seed/EXACT_HistoricalExplorationAct_GDA2020_SHP/ESRI/SHAPEFILES/exactp.shp",
  abandonedMines: "src/data/seed/wabmines_GDA2020_shp/wabmines.shp",
  resourceShapes: [
    "src/data/seed/RES_EST_Gold_GDA2020_SHP/ESRI/SHAPEFILES/RES_EST_Gold.shp",
    "src/data/seed/RES_EST_Copper_GDA2020_SHP/ESRI/SHAPEFILES/RES_EST_Copper.shp",
    "src/data/seed/RES_EST_Lithium_GDA2020_SHP/ESRI/SHAPEFILES/RES_EST_Lithium.shp",
    "src/data/seed/RES_EST_Nickel_GDA2020_SHP/ESRI/SHAPEFILES/RES_EST_Nickel.shp",
    "src/data/seed/RES_EST_Silver_GDA2020_SHP/ESRI/SHAPEFILES/RES_EST_Silver.shp",
  ],
};

const statusPriority = ["operating", "care_maintenance", "development", "exploration", "closed"];
const MAIN_COMMODITY_CODES = new Set(["AG", "AU", "BI", "CO", "CU", "LI", "NI", "PB", "SB", "ZN"]);
const COMMODITY_ALIASES = new Map([
  ["SILVER", "AG"],
  ["AG", "AG"],
  ["GOLD", "AU"],
  ["AU", "AU"],
  ["BISMUTH", "BI"],
  ["BI", "BI"],
  ["COBALT", "CO"],
  ["CO", "CO"],
  ["COPPER", "CU"],
  ["CU", "CU"],
  ["LITHIUM", "LI"],
  ["LI", "LI"],
  ["NICKEL", "NI"],
  ["NI", "NI"],
  ["LEAD", "PB"],
  ["PB", "PB"],
  ["ANTIMONY", "SB"],
  ["SB", "SB"],
  ["ZINC", "ZN"],
  ["ZN", "ZN"],
]);

function getFirst(properties, keys, fallback = null) {
  for (const key of keys) {
    const value = properties[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return fallback;
}

function asNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeUnit(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, "_");
}

function toOunces(value, unit) {
  const qty = asNumber(value);
  if (qty === null) return null;
  const normalized = normalizeUnit(unit);
  if (!normalized) return qty;

  if (["oz", "ounce", "ounces", "troy_oz", "troz", "ozt"].includes(normalized)) return qty;
  if (["g", "gram", "grams"].includes(normalized)) return qty / 31.1034768;
  if (["kg", "kilogram", "kilograms"].includes(normalized)) return (qty * 1000) / 31.1034768;
  if (["t", "tonne", "tonnes", "metric_ton", "metric_tonne"].includes(normalized)) return (qty * 1_000_000) / 31.1034768;
  return null;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const earthRadiusKm = 6371;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function deriveDistanceToPerthKm(lat, lng) {
  if (!DERIVE_PERTH_DISTANCE) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const value = haversineKm(lat, lng, PERTH_CBD.lat, PERTH_CBD.lng);
  return Number.isFinite(value) ? Number(value.toFixed(1)) : null;
}

function extractAnnualProductionOz(properties) {
  const directOz = asNumber(
    getFirst(properties, [
      "annual_production_oz",
      "ANNUAL_PRODUCTION_OZ",
      "ANNUAL_PROD_OZ",
      "PRODUCTION_OZ",
      "PROD_OZ",
      "AU_PROD_OZ",
      "GOLD_OZ_PA",
      "OZ_PA",
    ]),
  );
  if (directOz !== null) return directOz;

  const quantity = getFirst(properties, [
    "annual_production",
    "ANNUAL_PRODUCTION",
    "ANNUAL_PROD",
    "PRODUCTION",
    "PROD_QTY",
  ]);
  const unit = getFirst(properties, [
    "annual_production_unit",
    "ANNUAL_PRODUCTION_UNIT",
    "ANNUAL_PROD_UNIT",
    "PRODUCTION_UNIT",
    "PROD_QTY_UNIT",
  ]);
  return toOunces(quantity, unit);
}

function normalizeCommodity(item) {
  const normalized = String(item ?? "")
    .trim()
    .toUpperCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return null;
  return COMMODITY_ALIASES.get(normalized) ?? null;
}

function toCommodityList(...values) {
  const merged = values
    .flatMap((value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      return String(value).split(/[;,/|]+|\band\b/gi);
    })
    .map((item) => normalizeCommodity(item))
    .filter((item) => Boolean(item) && MAIN_COMMODITY_CODES.has(item));

  return [...new Set(merged)];
}

function normalizeStatus(value, fallback = "exploration") {
  const source = String(value ?? "").toLowerCase().trim();
  if (source.includes("operat")) return "operating";
  if (source.includes("care")) return "care_maintenance";
  if (source.includes("develop")) return "development";
  if (source.includes("clos") || source.includes("abandon")) return "closed";
  if (source.includes("explor")) return "exploration";
  return fallback;
}

function normalizeProductionType(value) {
  const source = String(value ?? "").toLowerCase().trim();
  if (source.includes("open")) return "open_cut";
  if (source.includes("under")) return "underground";
  if (source.includes("both")) return "both";
  return null;
}

function pickPreferredStatus(a, b) {
  const rankA = statusPriority.indexOf(a);
  const rankB = statusPriority.indexOf(b);
  if (rankA === -1) return b;
  if (rankB === -1) return a;
  return rankA <= rankB ? a : b;
}

function normalizePolygonGeometry(geometry) {
  if (!geometry) return null;
  if (geometry.type === "MultiPolygon") return geometry;
  if (geometry.type === "Polygon") {
    return {
      type: "MultiPolygon",
      coordinates: [geometry.coordinates],
    };
  }
  return null;
}

async function readGeoJson(filePath) {
  const absolute = path.resolve(filePath);
  const content = await readFile(absolute, "utf8");
  return JSON.parse(content);
}

async function readShapefile(filePath) {
  const absolute = path.resolve(filePath);
  const data = await shapefile.read(absolute);
  return data.features ?? [];
}

function baseMineCandidate(properties, lat, lng, overrides = {}) {
  const name = getFirst(properties, ["site_title", "TITLE", "SHORT_TITL", "short_name", "PROJ_NAME", "WABMINES_N"]);
  if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    siteCode: getFirst(properties, ["site_code", "SITE_CODE", "LOC_SITE"]),
    projCode: getFirst(properties, ["proj_code", "PROJ_CODE"]),
    name: String(name),
    lat,
    lng,
    status: normalizeStatus(getFirst(properties, ["site_stage", "STAGE", "TENSTATUS", "SITE_TYPE"], "exploration")),
    productionType: normalizeProductionType(getFirst(properties, ["site_sub_t", "SUB_TYPE", "SITE_SUB_T"])),
    operator: getFirst(properties, ["operator", "OPERATOR", "HOLDER1", "HOLDER", "OWNER", "COMPANY"]),
    state: "Western Australia",
    roster: getFirst(properties, ["roster", "ROSTER", "SHIFT", "SHIFT_TYPE", "WORK_ROSTER", "WORK_PATTERN"]),
    nearestTown: getFirst(properties, [
      "nearest_town",
      "NEAREST_TOWN",
      "TOWN",
      "LOCALITY",
      "LOCALITY_NA",
      "DISTR_NAME",
      "LGA_NAME",
    ]),
    distanceToPerthKm: deriveDistanceToPerthKm(lat, lng),
    annualProductionOz: extractAnnualProductionOz(properties),
    commodities: new Set(
      toCommodityList(
        getFirst(properties, ["site_commo", "COMMODITIE", "TARGET_COM", "target_com", "EST_COM", "PRI_P_COM"]),
      ),
    ),
    sources: new Set([overrides.source ?? "unknown"]),
    raw: [properties],
    ...overrides,
  };
}

function mineKey(candidate) {
  if (candidate.siteCode) return `site:${candidate.siteCode}`;
  if (candidate.projCode) return `proj:${candidate.projCode}`;
  return `coord:${candidate.lat.toFixed(5)}:${candidate.lng.toFixed(5)}:${candidate.name.toLowerCase()}`;
}

function mergeMineCandidate(existing, incoming) {
  existing.status = pickPreferredStatus(existing.status, incoming.status);
  existing.productionType = existing.productionType ?? incoming.productionType;
  existing.operator = existing.operator ?? incoming.operator;
  existing.roster = existing.roster ?? incoming.roster;
  existing.nearestTown = existing.nearestTown ?? incoming.nearestTown;
  existing.distanceToPerthKm = existing.distanceToPerthKm ?? incoming.distanceToPerthKm;
  existing.annualProductionOz = existing.annualProductionOz ?? incoming.annualProductionOz;
  incoming.commodities.forEach((commodity) => existing.commodities.add(commodity));
  incoming.sources.forEach((source) => existing.sources.add(source));
  if (existing.raw.length < 12) existing.raw.push(...incoming.raw.slice(0, 2));
}

function buildMineRows({
  mindexFeatures,
  operatingFeatures,
  majorProjectFeatures,
  resourceFeatures,
}) {
  const mineMap = new Map();
  const bySiteCode = new Map();
  const byProjCode = new Map();

  const addMine = (candidate) => {
    if (!candidate) return;
    const key = mineKey(candidate);
    const existing = mineMap.get(key);
    if (existing) {
      mergeMineCandidate(existing, candidate);
      return;
    }
    mineMap.set(key, candidate);
    if (candidate.siteCode) bySiteCode.set(candidate.siteCode, key);
    if (candidate.projCode) byProjCode.set(candidate.projCode, key);
  };

  for (const feature of mindexFeatures) {
    if (feature.geometry?.type !== "Point") continue;
    const [lng, lat] = feature.geometry.coordinates ?? [];
    addMine(baseMineCandidate(feature.properties ?? {}, lat, lng, { source: "mindex_main" }));
  }

  for (const feature of operatingFeatures) {
    if (feature.geometry?.type !== "Point") continue;
    const [lng, lat] = feature.geometry.coordinates ?? [];
    addMine(
      baseMineCandidate(feature.properties ?? {}, lat, lng, {
        source: "operating_mines",
        status: "operating",
      }),
    );
  }

  for (const feature of majorProjectFeatures) {
    if (feature.geometry?.type !== "Point") continue;
    const [lng, lat] = feature.geometry.coordinates ?? [];
    addMine(baseMineCandidate(feature.properties ?? {}, lat, lng, { source: "major_projects" }));
  }

  for (const feature of resourceFeatures) {
    if (feature.geometry?.type !== "Point") continue;
    const props = feature.properties ?? {};
    const siteCode = getFirst(props, ["LOC_SITE"]);
    const projCode = getFirst(props, ["PROJ_CODE"]);
    const existingKey = (siteCode && bySiteCode.get(siteCode)) || (projCode && byProjCode.get(projCode));
    const resourceCommodity = toCommodityList(getFirst(props, ["EST_COM", "EST_COM_AB", "PRI_P_COM"]));

    if (existingKey) {
      const existing = mineMap.get(existingKey);
      resourceCommodity.forEach((commodity) => existing.commodities.add(commodity));
      const estimates = existing.resourceEstimates ?? [];
      estimates.push({
        commodity: getFirst(props, ["EST_COM"]),
        grade: asNumber(getFirst(props, ["RES_QTY_G"])),
        gradeUnit: getFirst(props, ["RES_QTY_GU"]),
        quantity: asNumber(getFirst(props, ["RES_QTY"])),
        quantityUnit: getFirst(props, ["RES_QTY_U"]),
      });
      existing.resourceEstimates = estimates.slice(0, 15);
      continue;
    }

    const [lng, lat] = feature.geometry.coordinates ?? [];
    addMine(
      baseMineCandidate(props, lat, lng, {
        source: "resource_estimate",
        status: "exploration",
      }),
    );
  }

  return [...mineMap.values()].map((mine) => ({
    p_name: mine.name,
    p_operator: mine.operator,
    p_commodity: [...mine.commodities],
    p_state: mine.state,
    p_status: mine.status,
    p_production_type: mine.productionType,
    p_annual_production_oz: mine.annualProductionOz,
    p_roster: mine.roster,
    p_nearest_town: mine.nearestTown,
    p_distance_to_perth_km: mine.distanceToPerthKm,
    p_lat: mine.lat,
    p_lng: mine.lng,
    p_raw: {
      source_layers: [...mine.sources],
      site_code: mine.siteCode,
      proj_code: mine.projCode,
      resource_estimates: mine.resourceEstimates ?? [],
      records: mine.raw,
    },
  }));
}

function buildTenementRows({ tenementFeatures, exactPolygonFeatures }) {
  const rows = [];

  for (const feature of tenementFeatures) {
    const geometry = normalizePolygonGeometry(feature.geometry);
    if (!geometry) continue;
    const props = feature.properties ?? {};
    rows.push({
      p_tenement_id: getFirst(props, ["TENID", "FMT_TENID"]),
      p_holder: getFirst(props, ["HOLDER1"]),
      p_commodity: toCommodityList(getFirst(props, ["TYPE"])),
      p_state: "Western Australia",
      p_status: getFirst(props, ["TENSTATUS"], "LIVE"),
      p_grant_date: getFirst(props, ["GRANTDATE"]),
      p_expiry_date: getFirst(props, ["ENDDATE"]),
      p_area_ha: null,
      p_boundary_geojson: geometry,
      p_raw: {
        source_layer: "current_tenements",
        record: props,
      },
    });
  }

  for (const feature of exactPolygonFeatures) {
    const geometry = normalizePolygonGeometry(feature.geometry);
    if (!geometry) continue;
    const props = feature.properties ?? {};
    rows.push({
      p_tenement_id: `EXACT-${getFirst(props, ["ACTIVITYID"], "unknown")}`,
      p_holder: null,
      p_commodity: [],
      p_state: "Western Australia",
      p_status: "historical_exploration",
      p_grant_date: null,
      p_expiry_date: null,
      p_area_ha: null,
      p_boundary_geojson: geometry,
      p_raw: {
        source_layer: "exact_historical_exploration",
        record: props,
      },
    });
  }

  return rows;
}

async function clearTables(supabase) {
  const impossibleId = "00000000-0000-0000-0000-000000000000";
  const { error: mineDeleteError } = await supabase.from("mine_sites").delete().neq("id", impossibleId);
  if (mineDeleteError) throw mineDeleteError;
  const { error: tenementDeleteError } = await supabase.from("tenements").delete().neq("id", impossibleId);
  if (tenementDeleteError) throw tenementDeleteError;
}

async function ingestRows(supabase, fnName, rows, label) {
  const chunkSize = 50;
  let inserted = 0;
  let failed = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const results = await Promise.all(chunk.map((payload) => supabase.rpc(fnName, payload)));
    for (const result of results) {
      if (result.error) {
        failed += 1;
      } else {
        inserted += 1;
      }
    }
    if ((i / chunkSize + 1) % 20 === 0) {
      console.log(`${label}: processed ${Math.min(i + chunkSize, rows.length)} / ${rows.length}`);
    }
  }
  return { inserted, failed };
}

async function run() {
  const mindexGeoJson = await readGeoJson(paths.mindexGeoJson);
  const currentTenements = await readShapefile(paths.currentTenements);
  const operatingMines = await readShapefile(paths.operatingMines);
  const majorProjects = await readShapefile(paths.majorProjects);
  const exactPolygons = await readShapefile(paths.exactPolygons);
  const abandonedMines = await readShapefile(paths.abandonedMines);
  const resourceCollections = await Promise.all(paths.resourceShapes.map((filePath) => readShapefile(filePath)));
  const resourceFeatures = resourceCollections.flat();

  const mineRows = buildMineRows({
    mindexFeatures: mindexGeoJson.features ?? [],
    operatingFeatures: operatingMines,
    majorProjectFeatures: majorProjects,
    resourceFeatures,
  });

  const tenementRows = buildTenementRows({
    tenementFeatures: currentTenements,
    exactPolygonFeatures: exactPolygons,
  });

  console.log(
    `Prepared rows: ${mineRows.length} mine sites, ${tenementRows.length} tenements. wabmines features available for later layer: ${abandonedMines.length}.`,
  );
  if (DRY_RUN) {
    console.log("DRY_RUN=true, skipping database writes.");
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for ingestion.");
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await clearTables(supabase);
  const mineResult = await ingestRows(supabase, "ingest_mine_site_api", mineRows, "mine_sites");
  const tenementResult = await ingestRows(supabase, "ingest_tenement_api", tenementRows, "tenements");

  console.log(
    `Ingestion complete. mine_sites inserted=${mineResult.inserted}, failed=${mineResult.failed}; tenements inserted=${tenementResult.inserted}, failed=${tenementResult.failed}`,
  );
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
