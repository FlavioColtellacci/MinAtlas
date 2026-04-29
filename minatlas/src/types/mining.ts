export interface MineSite {
  id: string;
  name: string;
  operator: string | null;
  commodity: string[];
  state: string | null;
  status: "operating" | "care_maintenance" | "exploration" | "development" | "closed";
  production_type: "open_cut" | "underground" | "both" | null;
  annual_production_oz: number | null;
  roster: string | null;
  nearest_town: string | null;
  distance_to_perth_km: number | null;
  location: { coordinates: [number, number] };
}

export interface MineSiteRow {
  id: string;
  name: string;
  operator: string | null;
  commodity: string[] | null;
  state: string | null;
  status: "operating" | "care_maintenance" | "exploration" | "development" | "closed";
  production_type: "open_cut" | "underground" | "both" | null;
  annual_production_oz: number | null;
  roster: string | null;
  nearest_town: string | null;
  distance_to_perth_km: number | null;
  lng: number;
  lat: number;
}

export interface Tenement {
  id: string;
  tenement_id: string | null;
  holder: string | null;
  commodity: string[];
  state: string | null;
  status: string | null;
  grant_date: string | null;
  expiry_date: string | null;
  area_ha: number | null;
  boundary: GeoJSON.MultiPolygon | null;
}

export interface TenementRow {
  id: string;
  tenement_id: string | null;
  holder: string | null;
  commodity: string[] | null;
  state: string | null;
  status: string | null;
  grant_date: string | null;
  expiry_date: string | null;
  area_ha: number | null;
  boundary_geojson: GeoJSON.MultiPolygon | null;
}

export interface MapFilters {
  commodities: string[];
  states: string[];
  statuses: string[];
}

export interface MapState {
  selectedSite: MineSite | null;
  filters: MapFilters;
  isIntroComplete: boolean;
  is3DEnabled: boolean;
}
