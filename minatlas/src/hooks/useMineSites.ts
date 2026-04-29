"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { MineSite, MineSiteRow } from "@/types/mining";

const MINE_SITE_PAGE_SIZE = 1000;
const MINE_SITE_PAGE_COUNT = 4;

async function fetchMineSites(): Promise<MineSite[]> {
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

  return pages.flatMap((page) => (page.data ?? []) as MineSiteRow[]).map((site) => ({
    id: site.id,
    name: site.name,
    operator: site.operator,
    commodity: site.commodity ?? [],
    state: site.state,
    status: site.status,
    production_type: site.production_type,
    annual_production_oz: site.annual_production_oz,
    roster: site.roster,
    nearest_town: site.nearest_town,
    distance_to_perth_km: site.distance_to_perth_km,
    location: {
      coordinates: [site.lng, site.lat],
    },
  }));
}

export function useMineSites() {
  return useQuery({
    queryKey: ["mine-sites"],
    queryFn: fetchMineSites,
  });
}
