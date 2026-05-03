"use client";

import { useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase";
import type { QuantizedViewportBBox, Tenement, TenementRow } from "@/types/mining";

/** Below this zoom, skip tenement RPC (continent / very wide views). */
export const MIN_ZOOM_FOR_TENEMENT_FETCH = 5;

function mapTenementRows(rows: TenementRow[]): Tenement[] {
  return rows.map((tenement) => ({
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

function isValidBboxForQuery(bbox: QuantizedViewportBBox | null, zoom: number): bbox is QuantizedViewportBBox {
  if (!bbox) return false;
  const { west, south, east, north } = bbox;
  if (![west, south, east, north].every((v) => Number.isFinite(v))) return false;
  if (!(west < east && south < north)) return false;
  if (zoom < MIN_ZOOM_FOR_TENEMENT_FETCH) return false;
  return true;
}

async function fetchTenementsInBbox(bbox: QuantizedViewportBBox, maxRows: number): Promise<Tenement[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("tenements_in_bbox", {
    min_lng: bbox.west,
    min_lat: bbox.south,
    max_lng: bbox.east,
    max_lat: bbox.north,
    max_rows: maxRows,
  });

  if (error) {
    throw error;
  }

  return mapTenementRows((data ?? []) as unknown as TenementRow[]);
}

export function useTenementsForBbox(
  bbox: QuantizedViewportBBox | null,
  zoom: number,
  options?: { layersEnabled?: boolean; maxRows?: number },
) {
  const layersEnabled = options?.layersEnabled ?? true;
  const maxRows = options?.maxRows ?? 5000;
  const canFetch = isValidBboxForQuery(bbox, zoom) && layersEnabled;

  return useQuery({
    queryKey: [
      "tenements",
      "bbox",
      bbox?.west,
      bbox?.south,
      bbox?.east,
      bbox?.north,
      Math.round(zoom * 10) / 10,
      maxRows,
    ],
    queryFn: () => fetchTenementsInBbox(bbox!, maxRows),
    enabled: canFetch,
  });
}
