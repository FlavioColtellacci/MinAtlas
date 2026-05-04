"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAllMineSites } from "@/lib/mineSiteModel";
import { getSupabaseClient } from "@/lib/supabase";
import type { MineSite } from "@/types/mining";

async function fetchMineSites(): Promise<MineSite[]> {
  return fetchAllMineSites(getSupabaseClient());
}

export function useMineSites() {
  return useQuery({
    queryKey: ["mine-sites"],
    queryFn: fetchMineSites,
  });
}
