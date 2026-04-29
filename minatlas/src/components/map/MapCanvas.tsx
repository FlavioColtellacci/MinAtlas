"use client";

import { useMemo, useRef } from "react";
import DeckGL from "@deck.gl/react";
import mapboxgl from "mapbox-gl";
import Map, { type MapRef, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { GLOBE_CENTER, MAP_STYLE, WA_TARGET } from "@/lib/mapbox";
import { createMiningLayers } from "@/components/map/MiningLayers";
import type { MineSite, Tenement } from "@/types/mining";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

interface MapCanvasProps {
  mineSites: MineSite[];
  tenements: Tenement[];
  selectedSite: MineSite | null;
  onSelectSite: (site: MineSite | null) => void;
}

export default function MapCanvas({ mineSites, tenements, selectedSite, onSelectSite }: MapCanvasProps) {
  const mapRef = useRef<MapRef | null>(null);
  const hasPlayedIntro = useRef(false);

  const layers = useMemo(
    () =>
      createMiningLayers({
        mineSites,
        tenements,
        selectedSiteId: selectedSite?.id ?? null,
        onSelectSite,
      }),
    [mineSites, onSelectSite, selectedSite?.id, tenements],
  );

  const handleMapLoad = () => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    map.setFog({
      color: "rgb(235, 230, 220)",
      "high-color": "rgb(200, 215, 230)",
      "horizon-blend": 0.04,
      "space-color": "rgb(180, 195, 220)",
      "star-intensity": 0,
    });

    map.addSource("mapbox-dem", {
      type: "raster-dem",
      url: "mapbox://mapbox.mapbox-terrain-dem-v1",
      tileSize: 512,
      maxzoom: 14,
    });

    if (hasPlayedIntro.current) return;
    hasPlayedIntro.current = true;

    window.setTimeout(() => {
      map.flyTo({
        center: WA_TARGET,
        zoom: 5.8,
        pitch: 52,
        bearing: -15,
        duration: 4800,
        essential: true,
        curve: 1.4,
      });

      map.once("moveend", () => {
        map.setTerrain({ source: "mapbox-dem", exaggeration: 1.6 });
      });
    }, 2000);
  };

  return (
    <div className="absolute inset-0 h-full w-full">
      <DeckGL
        layers={layers}
        controller
        initialViewState={{
          longitude: GLOBE_CENTER[0],
          latitude: GLOBE_CENTER[1],
          zoom: 2,
          pitch: 0,
          bearing: 0,
        }}
        onClick={(info) => {
          if (!info.object) onSelectSite(null);
        }}
      >
        <Map
          ref={mapRef}
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          mapStyle={MAP_STYLE}
          projection="globe"
          reuseMaps
          mapLib={mapboxgl}
          onLoad={handleMapLoad}
        >
          <NavigationControl position="bottom-right" showCompass={false} />
        </Map>
      </DeckGL>
    </div>
  );
}
