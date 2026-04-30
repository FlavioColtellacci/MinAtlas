"use client";

import { useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase";
import type { Tenement, TenementRow } from "@/types/mining";

async function fetchTenements(): Promise<Tenement[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("tenements_public").select("*").limit(500);

  if (error) {
    throw error;
  }

  return ((data ?? []) as TenementRow[]).map((tenement) => ({
    id: tenement.id,
    tenement_id: tenement.tenement_id,
    holder: tenement.holder,
    commodity: tenement.commodity ?? [],
    state: tenement.state,
    status: tenement.status,
    grant_date: tenement.grant_date,
    expiry_date: tenement.expiry_date,
    area_ha: tenement.area_ha,
    boundary: tenement.boundary_geojson,
  }));
}

export function useTenements() {
  return useQuery({
    queryKey: ["tenements"],
    queryFn: fetchTenements,
  });
}
