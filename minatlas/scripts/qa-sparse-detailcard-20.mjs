/**
 * QA sample: 20 pseudo-random mine sites vs sparse DetailCard heuristics.
 * Run from minatlas/: node scripts/qa-sparse-detailcard-20.mjs
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const COMMODITY_NAMES = {
  AG: "Silver",
  AU: "Gold",
  BI: "Bismuth",
  CO: "Cobalt",
  CU: "Copper",
  LI: "Lithium",
  NI: "Nickel",
  PB: "Lead",
  SB: "Antimony",
  ZN: "Zinc",
};

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  const raw = fs.readFileSync(envPath, "utf8");
  const out = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function hasNonEmptyTrim(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isSparseSummarySite(site) {
  return (
    !hasNonEmptyTrim(site.operator) &&
    !hasNonEmptyTrim(site.nearest_town) &&
    !(site.distance_to_perth_km != null && site.distance_to_perth_km > 0)
  );
}

function haversineKm(a, b) {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const la1 = (lat1 * Math.PI) / 180;
  const la2 = (lat2 * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(la1) * Math.cos(la2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main() {
  const env = loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const pageSize = 1000;
  const pageCount = 4;
  const pages = [];
  for (let i = 0; i < pageCount; i += 1) {
    const from = i * pageSize;
    const to = from + pageSize - 1;
    pages.push(
      supabase
        .from("mine_sites_public")
        .select(
          "id,name,operator,nearest_town,distance_to_perth_km,lat,lng,commodity,production_type,annual_production_oz,roster,status,state",
        )
        .range(from, to),
    );
  }

  const results = await Promise.all(pages);
  const err = results.find((r) => r.error)?.error;
  if (err) {
    console.error(err);
    process.exit(1);
  }
  const rows = results.flatMap((r) => r.data ?? []);
  if (rows.length === 0) {
    console.error("No rows returned");
    process.exit(1);
  }

  const sparsePool = rows.filter(isSparseSummarySite);
  const pool = sparsePool.length > 0 ? sparsePool : rows;
  const poolLabel = sparsePool.length > 0 ? `sparse subset (${sparsePool.length} of ${rows.length})` : `full table (no sparse rows)`;

  const rnd = mulberry32(0x05032026);
  const indices = new Set();
  const targetN = Math.min(20, pool.length);
  while (indices.size < targetN) {
    indices.add(Math.floor(rnd() * pool.length));
  }
  const sample = [...indices].map((i) => pool[i]);

  console.log("QA sparse DetailCard — 20 random sites (seed 0x05032026), pool=%s\n", poolLabel);
  console.log("Definitions: sparse_summary = no operator, no nearest_town, no distance_to_perth_km>0.");
  console.log(
    "FAIL (strict): sparse AND zero stat tiles after dedupe AND no commodity AND no production_type AND no other site with coordinates.",
  );
  console.log(
    "FAIL (plan soft): sparse AND lead line would be only status·state (no commodity, no production_type) AND zero stat tiles after dedupe (nearby can still save the card).\n",
  );

  let failures = 0;
  let softQualityFails = 0;
  for (let n = 0; n < sample.length; n += 1) {
    const site = sample[n];
    const commodity = site.commodity ?? [];
    const commodityNames =
      commodity.length > 0 ? commodity.map((code) => COMMODITY_NAMES[code] ?? code).join(", ") : null;
    const productionType = site.production_type ? String(site.production_type).replace("_", " ") : null;
    const annualProduction =
      site.annual_production_oz && site.annual_production_oz > 0
        ? String(Math.round(site.annual_production_oz))
        : null;
    const rosterLabel = site.roster ?? null;

    const statItems = [
      annualProduction ? { id: "production" } : null,
      productionType ? { id: "type" } : null,
      commodity.length ? { id: "commodity" } : null,
      rosterLabel ? { id: "roster" } : null,
    ].filter(Boolean);

    const sparse = isSparseSummarySite(site);
    const statItemsForDisplay = sparse
      ? statItems.filter((item) => {
          if (item.id === "commodity" && commodityNames) return false;
          if (item.id === "type" && productionType) return false;
          return true;
        })
      : statItems;

    const others = rows.filter((r) => r.id !== site.id);
    const nearestPreview = others
      .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng))
      .map((r) => ({
        id: r.id,
        km: haversineKm([site.lng, site.lat], [r.lng, r.lat]),
      }))
      .sort((a, b) => a.km - b.km)
      .slice(0, 5).length;

    const strictFail =
      sparse &&
      statItemsForDisplay.length === 0 &&
      !commodityNames &&
      !productionType &&
      nearestPreview === 0;

    const softQualityFail =
      sparse &&
      statItemsForDisplay.length === 0 &&
      !commodityNames &&
      !productionType;

    if (strictFail) failures += 1;
    if (softQualityFail) softQualityFails += 1;

    console.log(
      `${n + 1}. ${site.name.slice(0, 48)} | sparse=${sparse} | stats=${statItemsForDisplay.length} | nearby=${nearestPreview} | strictFAIL=${strictFail} | softFAIL=${softQualityFail}`,
    );
    console.log(`   id=${site.id}`);
  }

  console.log(`\nTotal strict FAIL: ${failures} / ${sample.length} (target < 3)`);
  console.log(`Total plan-soft FAIL (sparse thin lead + no stats): ${softQualityFails} / ${sample.length} (target < 3)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
