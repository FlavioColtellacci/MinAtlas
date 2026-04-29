"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  terrainEnabled: boolean;
  selectedSite: MineSite | null;
  onSelectSite: (site: MineSite | null) => void;
  onControlsReady?: (controls: { zoomIn: () => void; zoomOut: () => void; flyToAustralia: () => void }) => void;
}

export default function MapCanvas({
  mineSites,
  tenements,
  terrainEnabled,
  selectedSite,
  onSelectSite,
  onControlsReady,
}: MapCanvasProps) {
  const mapRef = useRef<MapRef | null>(null);
  const hasPlayedIntro = useRef(false);
  const [hoveredSite, setHoveredSite] = useState<MineSite | null>(null);
  const INITIAL_AUSTRALIA_VIEW = useMemo(
    () => ({
      longitude: GLOBE_CENTER[0],
      latitude: GLOBE_CENTER[1],
      zoom: 2.9,
      pitch: 0,
      bearing: 0,
    }),
    [],
  );

  const layers = useMemo(
    () =>
      createMiningLayers({
        mineSites,
        tenements,
        selectedSiteId: selectedSite?.id ?? null,
        onSelectSite,
        onHoverSite: (site) => {
          if (!site) {
            setHoveredSite(null);
            return;
          }

          setHoveredSite(site);
        },
      }),
    [mineSites, onSelectSite, selectedSite?.id, tenements],
  );

  useEffect(() => {
    if (!selectedSite) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    if (!hasPlayedIntro.current) return;

    map.flyTo({
      center: selectedSite.location.coordinates,
      zoom: Math.max(map.getZoom(), 6.8),
      pitch: 48,
      bearing: map.getBearing(),
      duration: 1800,
      curve: 1.22,
      essential: true,
    });
  }, [selectedSite]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !map.getSource("mapbox-dem")) return;

    if (terrainEnabled) {
      map.setTerrain({ source: "mapbox-dem", exaggeration: 1.45 });
      return;
    }

    map.setTerrain(null);
  }, [terrainEnabled]);

  const handleMapLoad = () => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const flyToAustralia = () => {
      map.flyTo({
        center: WA_TARGET,
        zoom: 5.8,
        pitch: 46,
        bearing: -12,
        duration: 2200,
        essential: true,
        curve: 1.3,
      });
    };

    const smoothEaseToZoom = (delta: number) => {
      map.easeTo({
        zoom: Math.max(2, Math.min(14, map.getZoom() + delta)),
        duration: 850,
        essential: true,
        easing: (t) => 1 - (1 - t) ** 4,
      });
    };

    onControlsReady?.({
      zoomIn: () => smoothEaseToZoom(0.8),
      zoomOut: () => smoothEaseToZoom(-0.8),
      flyToAustralia,
    });

    map.setFog({
      color: "rgb(235, 230, 220)",
      "high-color": "rgb(200, 215, 230)",
      "horizon-blend": 0.04,
      "space-color": "rgb(180, 195, 220)",
      "star-intensity": 0,
    });

    if (!map.getSource("mapbox-dem")) {
      map.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      });
    }

    // Tune interaction inertia for a more premium, fluid map feel.
    map.scrollZoom.setWheelZoomRate(1 / 520);
    map.scrollZoom.setZoomRate(1 / 100);
    map.dragPan.enable({
      linearity: 0.25,
      easing: (t) => t,
      maxSpeed: 1800,
      deceleration: 3200,
    });

    if (hasPlayedIntro.current) return;
    hasPlayedIntro.current = true;

    if (terrainEnabled) {
      map.setTerrain({ source: "mapbox-dem", exaggeration: 1.45 });
    } else {
      map.setTerrain(null);
    }
    window.setTimeout(() => {
      flyToAustralia();
    }, 80);
  };

  return (
    <div className="absolute inset-0 h-full w-full">
      <DeckGL
        layers={layers}
        controller
        initialViewState={{
          longitude: INITIAL_AUSTRALIA_VIEW.longitude,
          latitude: INITIAL_AUSTRALIA_VIEW.latitude,
          zoom: INITIAL_AUSTRALIA_VIEW.zoom,
          pitch: INITIAL_AUSTRALIA_VIEW.pitch,
          bearing: INITIAL_AUSTRALIA_VIEW.bearing,
        }}
        onClick={(info) => {
          if (!info.object) {
            setHoveredSite(null);
            onSelectSite(null);
          }
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

      {hoveredSite && (
        <div className="glass pointer-events-none absolute left-4 top-28 z-30 rounded-xl px-3 py-2 text-xs">
          <p className="font-medium text-[color:var(--text-primary)]">{hoveredSite.name}</p>
          <p className="text-[color:var(--text-secondary)]">
            {hoveredSite.operator ?? "Unknown operator"} · {hoveredSite.state ?? "Australia"}
          </p>
        </div>
      )}
    </div>
  );
}
