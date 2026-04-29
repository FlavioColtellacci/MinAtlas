"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { MineSite, MineSiteRow } from "@/types/mining";

async function fetchMineSites(): Promise<MineSite[]> {
  const { data, error } = await supabase.from("mine_sites_public").select("*").limit(500);

  if (error) {
    throw error;
  }

  return ((data ?? []) as MineSiteRow[]).map((site) => ({
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
