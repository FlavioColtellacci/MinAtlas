"use client";

import { GeoJsonLayer, ScatterplotLayer } from "@deck.gl/layers";
import type { Color, Layer } from "@deck.gl/core";
import type { MineSite, Tenement } from "@/types/mining";

interface MiningLayersOptions {
  mineSites: MineSite[];
  tenements: Tenement[];
  zoom: number;
  markerScale: number;
  markerOpacity: number;
  showTenementBoundaries: boolean;
  qualityMode: "high" | "performance";
  selectedSiteId: string | null;
  onSelectSite: (site: MineSite | null) => void;
  onHoverSite: (site: MineSite | null) => void;
}

export function createMiningLayers({
  mineSites,
  tenements,
  zoom,
  markerScale,
  markerOpacity,
  showTenementBoundaries,
  qualityMode,
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

  const baseRadius = (zoom < 4.2 ? 3.1 : zoom < 5 ? 3.8 : zoom < 5.8 ? 4.6 : zoom < 6.6 ? 5.3 : 6) * markerScale;
  const markerAlpha = Math.round(Math.max(80, Math.min(255, markerOpacity * 255)));

  const baseMarkerColor: Color = zoom < 4.5 ? [26, 24, 20, Math.min(markerAlpha, 190)] : [26, 24, 20, markerAlpha];

  return [
    new GeoJsonLayer({
      id: "tenements-boundary",
      data: {
        type: "FeatureCollection",
        features: tenementFeatures,
      } as GeoJSON.FeatureCollection,
      stroked: true,
      filled: true,
      lineWidthMinPixels: qualityMode === "performance" ? 0.5 : 1,
      getLineColor: [184, 125, 69, 170],
      getFillColor: [184, 125, 69, 20],
      pickable: false,
      visible: showTenementBoundaries && tenementFeatures.length > 0,
      wrapLongitude: true,
    }),
    new ScatterplotLayer<MineSite>({
      id: "mine-sites",
      data: mineSites,
      pickable: true,
      filled: true,
      radiusUnits: "pixels",
      radiusMinPixels: 2,
      radiusMaxPixels: qualityMode === "performance" ? 10 : 14,
      getPosition: (site) => site.location.coordinates,
      getRadius: (site) => (site.id === selectedSiteId ? baseRadius + 2.4 : baseRadius),
      getFillColor: (site): Color => (site.id === selectedSiteId ? [184, 125, 69, Math.min(255, markerAlpha + 35)] : baseMarkerColor),
      getLineColor: [255, 253, 250, 220] satisfies Color,
      lineWidthMinPixels: qualityMode === "performance" ? 0.5 : 1,
      onClick: (info) => {
        const pickedSite = (info.object as MineSite | undefined) ?? null;
        onSelectSite(pickedSite);
      },
      onHover: (info) => {
        const pickedSite = (info.object as MineSite | undefined) ?? null;
        onHoverSite(pickedSite);
      },
      autoHighlight: qualityMode === "high",
      wrapLongitude: true,
      highlightColor: [184, 125, 69, 120] satisfies Color,
      updateTriggers: {
        getRadius: [selectedSiteId, baseRadius, markerScale],
        getFillColor: [selectedSiteId, baseMarkerColor, markerAlpha],
      },
    }),
  ];
}
