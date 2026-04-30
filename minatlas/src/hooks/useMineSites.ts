"use client";

import { useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase";
import type { MineSite, MineSiteRow } from "@/types/mining";

const MINE_SITE_PAGE_SIZE = 1000;
const MINE_SITE_PAGE_COUNT = 4;
const MAIN_COMMODITY_CODES = new Set(["AG", "AU", "BI", "CO", "CU", "LI", "NI", "PB", "SB", "ZN"]);
const STATUS_IMPORTANCE: Record<MineSiteRow["status"], number> = {
  operating: 50,
  development: 38,
  care_maintenance: 28,
  exploration: 16,
  closed: 4,
};
const MAX_PRODUCTION_IMPORTANCE = 35;
const MAX_COMPLETENESS_IMPORTANCE = 15;
const COMMODITY_ALIASES: Record<string, string> = {
  SILVER: "AG",
  AG: "AG",
  GOLD: "AU",
  AU: "AU",
  BISMUTH: "BI",
  BI: "BI",
  COBALT: "CO",
  CO: "CO",
  COPPER: "CU",
  CU: "CU",
  LITHIUM: "LI",
  LI: "LI",
  NICKEL: "NI",
  NI: "NI",
  LEAD: "PB",
  PB: "PB",
  ANTIMONY: "SB",
  SB: "SB",
  ZINC: "ZN",
  ZN: "ZN",
};

function normalizeCommodity(value: string) {
  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return null;
  const mapped = COMMODITY_ALIASES[normalized];
  if (!mapped || !MAIN_COMMODITY_CODES.has(mapped)) return null;
  return mapped;
}

function getProductionImportance(annualProductionOz: number | null) {
  if (!annualProductionOz || annualProductionOz <= 0) return 0;

  return Math.min(
    MAX_PRODUCTION_IMPORTANCE,
    (Math.log10(annualProductionOz + 1) / 6) * MAX_PRODUCTION_IMPORTANCE,
  );
}

function getCompletenessImportance(site: MineSiteRow, commodity: string[]) {
  const completedFields = [
    site.operator,
    commodity.length > 0,
    site.state,
    site.production_type,
    site.annual_production_oz,
    site.roster,
    site.nearest_town,
    site.distance_to_perth_km,
  ].filter(Boolean).length;

  return (completedFields / 8) * MAX_COMPLETENESS_IMPORTANCE;
}

function getImportanceScore(site: MineSiteRow, commodity: string[]) {
  return Math.round(
    STATUS_IMPORTANCE[site.status] +
      getProductionImportance(site.annual_production_oz) +
      getCompletenessImportance(site, commodity),
  );
}

async function fetchMineSites(): Promise<MineSite[]> {
  const supabase = getSupabaseClient();
  const pages = await Promise.all(
    Array.from({ length: MINE_SITE_PAGE_COUNT }, (_, pageIndex) => {
      const from = pageIndex * MINE_SITE_PAGE_SIZE;
      const to = from + MINE_SITE_PAGE_SIZE - 1;
      return supabase.from("mine_sites_public").select("*").range(from, to);
    }),
  );

  const error = pages.find((page) => page.error)?.error;
  if (error) {
    throw error;
  }

  return pages.flatMap((page) => (page.data ?? []) as MineSiteRow[]).map((site) => {
    const commodity = Array.from(
      new Set(
        (site.commodity ?? []).map((value) => normalizeCommodity(value)).filter((value): value is string => Boolean(value)),
      ),
    );

    return {
      id: site.id,
      name: site.name,
      operator: site.operator,
      commodity,
      state: site.state,
      status: site.status,
      production_type: site.production_type,
      annual_production_oz: site.annual_production_oz,
      importanceScore: getImportanceScore(site, commodity),
      roster: site.roster,
      nearest_town: site.nearest_town,
      distance_to_perth_km: site.distance_to_perth_km,
      location: {
        coordinates: [site.lng, site.lat],
      },
    };
  });
}

export function useMineSites() {
  return useQuery({
    queryKey: ["mine-sites"],
    queryFn: fetchMineSites,
  });
}
