"use client";

import { GeoJsonLayer, ScatterplotLayer } from "@deck.gl/layers";
import type { Layer } from "@deck.gl/core";
import type { MineSite, Tenement } from "@/types/mining";

interface MiningLayersOptions {
  mineSites: MineSite[];
  tenements: Tenement[];
  selectedSiteId: string | null;
  onSelectSite: (site: MineSite | null) => void;
  onHoverSite: (site: MineSite | null) => void;
}

export function createMiningLayers({
  mineSites,
  tenements,
  selectedSiteId,
  onSelectSite,
  onHoverSite,
}: MiningLayersOptions): Layer[] {
  const tenementFeatures: GeoJSON.Feature[] = tenements
    .filter((tenement) => tenement.boundary)
    .map((tenement) => ({
      type: "Feature",
      properties: {
        id: tenement.id,
        holder: tenement.holder,
        status: tenement.status,
      },
      geometry: tenement.boundary as GeoJSON.Geometry,
    }));

  return [
    new GeoJsonLayer({
      id: "tenements-boundary",
      data: {
        type: "FeatureCollection",
        features: tenementFeatures,
      } as GeoJSON.FeatureCollection,
      stroked: true,
      filled: true,
      lineWidthMinPixels: 1,
      getLineColor: [184, 125, 69, 170],
      getFillColor: [184, 125, 69, 20],
      pickable: false,
      visible: tenementFeatures.length > 0,
    }),
    new ScatterplotLayer<MineSite>({
      id: "mine-sites",
      data: mineSites,
      pickable: true,
      filled: true,
      radiusUnits: "pixels",
      radiusMinPixels: 3,
      radiusMaxPixels: 16,
      getPosition: (site) => site.location.coordinates,
      getRadius: (site) => (site.id === selectedSiteId ? 10 : 6),
      getFillColor: (site) => (site.id === selectedSiteId ? [184, 125, 69, 255] : [26, 24, 20, 190]),
      getLineColor: [255, 253, 250, 220],
      lineWidthMinPixels: 1,
      onClick: (info) => {
        const pickedSite = (info.object as MineSite | undefined) ?? null;
        onSelectSite(pickedSite);
      },
      onHover: (info) => {
        const pickedSite = (info.object as MineSite | undefined) ?? null;
        onHoverSite(pickedSite);
      },
      autoHighlight: true,
      highlightColor: [184, 125, 69, 120],
      updateTriggers: {
        getRadius: [selectedSiteId],
        getFillColor: [selectedSiteId],
      },
    }),
  ];
}
