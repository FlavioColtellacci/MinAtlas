"use client";

import { useState } from "react";
import type { MapFilters, MapState, MineSite } from "@/types/mining";

const defaultFilters: MapFilters = {
  commodities: [],
  states: [],
  statuses: [],
};

export function useMapState() {
  const [selectedSite, setSelectedSite] = useState<MineSite | null>(null);
  const [filters, setFilters] = useState<MapFilters>(defaultFilters);
  const [isIntroComplete, setIsIntroComplete] = useState(false);
  const [is3DEnabled, setIs3DEnabled] = useState(true);

  const state: MapState = {
    selectedSite,
    filters,
    isIntroComplete,
    is3DEnabled,
  };

  return {
    state,
    setSelectedSite,
    setFilters,
    setIsIntroComplete,
    setIs3DEnabled,
  };
}
