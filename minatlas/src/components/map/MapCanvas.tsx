"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import Map, { Marker, type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { GLOBE_CENTER, MAP_STYLE, WA_TARGET } from "@/lib/mapbox";
import type { MineSite, Tenement } from "@/types/mining";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
const DEM_SOURCE_ID = "mapbox-dem";
const HILLSHADE_LAYER_ID = "terrain-hillshade";
const MINE_SITES_SOURCE_ID = "mine-sites-source";
const MINE_SITES_LAYER_ID = "mine-sites-layer";
const TENEMENTS_SOURCE_ID = "tenements-source";
const TENEMENTS_FILL_LAYER_ID = "tenements-fill-layer";
const TENEMENTS_LINE_LAYER_ID = "tenements-line-layer";
const EARTH_RADIUS_KM = 6371;

interface MapTelemetry {
  viewDistanceKm: number;
  bearingDeg: number;
  zoomLevel: number;
}

interface MapCanvasProps {
  mineSites: MineSite[];
  tenements: Tenement[];
  mapStyleUrl: string;
  labelDensity: "clean" | "detailed";
  autoRotate: boolean;
  terrainEnabled: boolean;
  terrainExaggeration: number;
  pitchLimit: number;
  smoothness: "normal" | "cinematic";
  markerScale: number;
  markerOpacity: number;
  showTenementBoundaries: boolean;
  qualityMode: "high" | "performance";
  selectedSite: MineSite | null;
  onSelectSite: (site: MineSite | null) => void;
  onControlsReady?: (controls: {
    zoomIn: () => void;
    zoomOut: () => void;
    flyToAustralia: () => void;
    resetBearing: () => void;
    fitToVisibleSites: () => void;
    setBearing: (bearing: number) => void;
    zoomToSiteWithFocus: (site: MineSite) => void;
  }) => void;
  onTelemetryUpdate?: (telemetry: MapTelemetry) => void;
}

export default function MapCanvas({
  mineSites,
  tenements,
  mapStyleUrl,
  labelDensity,
  autoRotate,
  terrainEnabled,
  terrainExaggeration,
  pitchLimit,
  smoothness,
  markerScale,
  markerOpacity,
  showTenementBoundaries,
  qualityMode,
  selectedSite,
  onSelectSite,
  onControlsReady,
  onTelemetryUpdate,
}: MapCanvasProps) {
  const mapRef = useRef<MapRef | null>(null);
  const autoRotateFrameRef = useRef<number | null>(null);
  const activeStyleUrlRef = useRef(mapStyleUrl);
  const mineSitesRef = useRef<MineSite[]>(mineSites);
  const tenementsRef = useRef<Tenement[]>(tenements);
  const selectedSiteIdRef = useRef<string | null>(selectedSite?.id ?? null);
  const markerScaleRef = useRef(markerScale);
  const markerOpacityRef = useRef(markerOpacity);
  const showTenementBoundariesRef = useRef(showTenementBoundaries);
  const qualityModeRef = useRef(qualityMode);
  const hasPlayedIntro = useRef(false);
  const hasLoadedMap = useRef(false);
  const hasAttachedMapHandlers = useRef(false);
  const mapHandlerCleanupRef = useRef<(() => void) | null>(null);
  const telemetryFrameRef = useRef<number | null>(null);
  const lastTelemetryRef = useRef<MapTelemetry | null>(null);
  const temporaryAutoRotateRef = useRef(false);
  const userInteractionCleanupRef = useRef<(() => void) | null>(null);
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
  const smoothnessMultiplier = smoothness === "cinematic" ? 1.35 : 1;
  const isSatelliteStyle = mapStyleUrl.includes("satellite");
  const markerSize = Math.round((qualityMode === "performance" ? 8 : 10) * markerScale);

  const getDefaultMarkerColor = (opacity: number) =>
    isSatelliteStyle
      ? `rgba(24,22,20,${Math.min(1, Math.max(0.78, opacity)).toFixed(3)})`
      : `rgba(14,14,14,${Math.min(1, Math.max(0.82, opacity)).toFixed(3)})`;

  const getSelectedMarkerColor = () => (isSatelliteStyle ? "rgba(184,125,69,1)" : "rgba(184,125,69,1)");

  const getMarkerStrokeColor = () => (isSatelliteStyle ? "rgba(255,253,250,0.7)" : "rgba(255,253,250,0.74)");

  const ensureTerrainSource = (map: mapboxgl.Map) => {
    if (!map.isStyleLoaded()) return false;
    if (map.getSource(DEM_SOURCE_ID)) return true;
    try {
      map.addSource(DEM_SOURCE_ID, {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      });
    } catch {
      return false;
    }
    return true;
  };

  const haversineDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRadians = (value: number) => (value * Math.PI) / 180;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const emitTelemetry = (map: mapboxgl.Map) => {
    const center = map.getCenter();
    const bounds = map.getBounds();
    if (!bounds) return;
    const telemetry: MapTelemetry = {
      viewDistanceKm: Math.max(
      1,
      Math.round(haversineDistanceKm(center.lat, bounds.getWest(), center.lat, bounds.getEast())),
      ),
      // Rounded bearing prevents excessive React updates during drag/rotate.
      bearingDeg: Math.round(((map.getBearing() % 360) + 360) % 360),
      zoomLevel: Math.round(map.getZoom() * 10) / 10,
    };
    const lastTelemetry = lastTelemetryRef.current;
    if (
      lastTelemetry &&
      lastTelemetry.viewDistanceKm === telemetry.viewDistanceKm &&
      lastTelemetry.bearingDeg === telemetry.bearingDeg &&
      lastTelemetry.zoomLevel === telemetry.zoomLevel
    ) {
      return;
    }
    lastTelemetryRef.current = telemetry;
    onTelemetryUpdate?.(telemetry);
  };

  const scheduleTelemetry = (map: mapboxgl.Map) => {
    if (telemetryFrameRef.current !== null) return;
    telemetryFrameRef.current = window.requestAnimationFrame(() => {
      telemetryFrameRef.current = null;
      emitTelemetry(map);
    });
  };

  const getZoomForHorizontalDistanceKm = (targetDistanceKm: number, latitudeDeg: number, viewportWidthPx: number) => {
    const safeWidth = Math.max(320, viewportWidthPx);
    const latRadians = (latitudeDeg * Math.PI) / 180;
    const metersPerPixelAtZoom0 = 156543.03392 * Math.cos(latRadians);
    const targetMetersPerPixel = (targetDistanceKm * 1000) / safeWidth;
    if (!Number.isFinite(targetMetersPerPixel) || targetMetersPerPixel <= 0) return 10.5;
    const zoom = Math.log2(metersPerPixelAtZoom0 / targetMetersPerPixel);
    return Math.max(2, Math.min(16, zoom));
  };

  const stopTemporaryAutoRotate = () => {
    temporaryAutoRotateRef.current = false;
    if (userInteractionCleanupRef.current) {
      userInteractionCleanupRef.current();
      userInteractionCleanupRef.current = null;
    }
  };

  const armTemporaryAutoRotateCancellation = () => {
    const stopOnInteraction = () => stopTemporaryAutoRotate();

    const registerListeners = () => {
      window.addEventListener("pointerdown", stopOnInteraction, { passive: true });
      window.addEventListener("wheel", stopOnInteraction, { passive: true });
      window.addEventListener("keydown", stopOnInteraction);
      userInteractionCleanupRef.current = () => {
        window.removeEventListener("pointerdown", stopOnInteraction);
        window.removeEventListener("wheel", stopOnInteraction);
        window.removeEventListener("keydown", stopOnInteraction);
      };
    };

    window.setTimeout(registerListeners, 0);
  };

  const startTemporaryAutoRotate = (map: mapboxgl.Map) => {
    if (autoRotateFrameRef.current) {
      window.cancelAnimationFrame(autoRotateFrameRef.current);
      autoRotateFrameRef.current = null;
    }

    const speed = smoothness === "cinematic" ? 0.02 : 0.03;
    const spin = () => {
      if (!temporaryAutoRotateRef.current) return;
      if (!map.isMoving() || map.isRotating()) {
        map.setBearing(map.getBearing() + speed);
      }
      autoRotateFrameRef.current = window.requestAnimationFrame(spin);
    };

    autoRotateFrameRef.current = window.requestAnimationFrame(spin);
  };

  const ensureHillshadeLayer = (map: mapboxgl.Map) => {
    if (!map.isStyleLoaded()) return;
    if (!map.getSource(DEM_SOURCE_ID)) return;
    if (map.getLayer(HILLSHADE_LAYER_ID)) return;
    const beforeLayerId = map.getLayer(TENEMENTS_FILL_LAYER_ID)
      ? TENEMENTS_FILL_LAYER_ID
      : map.getLayer(MINE_SITES_LAYER_ID)
        ? MINE_SITES_LAYER_ID
        : undefined;
    try {
      map.addLayer(
        {
          id: HILLSHADE_LAYER_ID,
          type: "hillshade",
          source: DEM_SOURCE_ID,
          layout: {
            visibility: "none",
          },
          paint: {
            "hillshade-shadow-color": "rgba(40, 28, 18, 0.5)",
            "hillshade-highlight-color": "rgba(255, 245, 225, 0.35)",
            "hillshade-accent-color": "rgba(120, 90, 60, 0.25)",
            "hillshade-exaggeration": 0.9,
          },
        },
        beforeLayerId,
      );
    } catch {
      // Layer can race with style reloads.
    }
  };

  const applyLabelDensity = (map: mapboxgl.Map) => {
    const isClean = labelDensity === "clean";
    const style = map.getStyle();
    if (!style?.layers) return;
    for (const layer of style.layers) {
      if (layer.type !== "symbol") continue;
      try {
        map.setLayoutProperty(layer.id, "visibility", isClean ? "none" : "visible");
      } catch {
        // Some style layers can be transient during style reloads.
      }
    }
  };

  const applyTerrainMode = (map: mapboxgl.Map, options: { animateCamera?: boolean } = {}) => {
    const animateCamera = options.animateCamera ?? true;
    if (!ensureTerrainSource(map)) return;
    ensureHillshadeLayer(map);

    if (terrainEnabled) {
      map.setTerrain({ source: DEM_SOURCE_ID, exaggeration: terrainExaggeration });
      if (map.getLayer(HILLSHADE_LAYER_ID)) {
        map.setLayoutProperty(HILLSHADE_LAYER_ID, "visibility", "visible");
      }
      if (map.getLayer(MINE_SITES_LAYER_ID)) {
        map.moveLayer(MINE_SITES_LAYER_ID);
      }
      if (!animateCamera) return;
      map.easeTo({
        pitch: Math.min(Math.max(map.getPitch(), 78), pitchLimit),
        zoom: Math.max(map.getZoom(), 8.2),
        bearing: map.getBearing() - 10,
        duration: 1300 * smoothnessMultiplier,
        essential: true,
      });
      return;
    }

    map.setTerrain(null);
    if (map.getLayer(HILLSHADE_LAYER_ID)) {
      map.setLayoutProperty(HILLSHADE_LAYER_ID, "visibility", "none");
    }
    if (!animateCamera) return;
    map.easeTo({
      pitch: Math.min(map.getPitch(), Math.min(24, pitchLimit)),
      duration: 950 * smoothnessMultiplier,
      essential: true,
    });
  };

  const ensureDataLayers = (map: mapboxgl.Map) => {
    if (!map.isStyleLoaded()) return;

    if (!map.getSource(MINE_SITES_SOURCE_ID)) {
      map.addSource(MINE_SITES_SOURCE_ID, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });
    }

    if (!map.getSource(TENEMENTS_SOURCE_ID)) {
      map.addSource(TENEMENTS_SOURCE_ID, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });
    }

    if (!map.getLayer(MINE_SITES_LAYER_ID)) {
      map.addLayer({
        id: MINE_SITES_LAYER_ID,
        type: "circle",
        source: MINE_SITES_SOURCE_ID,
        paint: {
          "circle-pitch-alignment": "viewport",
          "circle-pitch-scale": "viewport",
          "circle-radius": [
            "max",
            5,
            [
              "*",
              ["interpolate", ["linear"], ["zoom"], 2, 4.5, 4.2, 6, 5, 7, 5.8, 8, 6.6, 9.5],
              markerScaleRef.current,
            ],
          ],
          "circle-color": [
            "case",
            ["==", ["get", "id"], selectedSiteIdRef.current ?? ""],
            getSelectedMarkerColor(),
            getDefaultMarkerColor(markerOpacityRef.current),
          ],
          "circle-stroke-color": getMarkerStrokeColor(),
          "circle-stroke-width": qualityModeRef.current === "performance" ? 0.9 : 1.2,
          "circle-opacity": 1,
          "circle-emissive-strength": 1,
        },
      });
    }
    map.moveLayer(MINE_SITES_LAYER_ID);

    if (!map.getLayer(TENEMENTS_FILL_LAYER_ID)) {
      map.addLayer({
        id: TENEMENTS_FILL_LAYER_ID,
        type: "fill",
        source: TENEMENTS_SOURCE_ID,
        layout: {
          visibility: showTenementBoundariesRef.current ? "visible" : "none",
        },
        paint: {
          "fill-color": "rgba(184,125,69,0.08)",
        },
      });
    }

    if (!map.getLayer(TENEMENTS_LINE_LAYER_ID)) {
      map.addLayer({
        id: TENEMENTS_LINE_LAYER_ID,
        type: "line",
        source: TENEMENTS_SOURCE_ID,
        layout: {
          visibility: showTenementBoundariesRef.current ? "visible" : "none",
        },
        paint: {
          "line-color": "rgba(184,125,69,0.75)",
          "line-width": qualityModeRef.current === "performance" ? 0.7 : 1.1,
        },
      });
    }

    const mineSource = map.getSource(MINE_SITES_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (mineSource) {
      mineSource.setData({
        type: "FeatureCollection",
        features: mineSitesRef.current.map((site) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: site.location.coordinates,
          },
          properties: {
            id: site.id,
            name: site.name,
            operator: site.operator ?? "",
            state: site.state ?? "",
          },
        })),
      });
    }

    const tenementSource = map.getSource(TENEMENTS_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (tenementSource) {
      tenementSource.setData({
        type: "FeatureCollection",
        features: tenementsRef.current
          .filter((tenement) => tenement.boundary)
          .map((tenement) => ({
            type: "Feature",
            geometry: tenement.boundary as GeoJSON.Geometry,
            properties: {
              id: tenement.id,
            },
          })),
      });
    }
  };

  const buildMapControls = (map: mapboxgl.Map) => {
    const flyToAustralia = () => {
      map.flyTo({
        center: WA_TARGET,
        zoom: 5.8,
        pitch: Math.min(46, pitchLimit),
        bearing: -12,
        duration: 2200 * smoothnessMultiplier,
        essential: true,
        curve: 1.3,
      });
    };

    const smoothEaseToZoom = (delta: number) => {
      map.easeTo({
        zoom: Math.max(2, Math.min(14, map.getZoom() + delta)),
        duration: 850 * smoothnessMultiplier,
        essential: true,
        easing: (t) => 1 - (1 - t) ** 4,
      });
    };

    const fitToVisibleSites = () => {
      const sites = mineSitesRef.current;
      if (sites.length === 0) return;
      if (sites.length === 1) {
        map.flyTo({
          center: sites[0].location.coordinates,
          zoom: Math.max(map.getZoom(), 7),
          pitch: Math.min(46, pitchLimit),
          duration: 1200 * smoothnessMultiplier,
          essential: true,
        });
        return;
      }

      const lons = sites.map((site) => site.location.coordinates[0]);
      const lats = sites.map((site) => site.location.coordinates[1]);
      map.fitBounds(
        [
          [Math.min(...lons), Math.min(...lats)],
          [Math.max(...lons), Math.max(...lats)],
        ],
        {
          padding: { top: 120, right: 80, bottom: 180, left: 80 },
          maxZoom: 8.5,
          duration: 1200 * smoothnessMultiplier,
          essential: true,
        },
      );
    };

    return {
      zoomIn: () => smoothEaseToZoom(0.8),
      zoomOut: () => smoothEaseToZoom(-0.8),
      flyToAustralia,
      resetBearing: () => map.easeTo({ bearing: 0, duration: 700 * smoothnessMultiplier, essential: true }),
      fitToVisibleSites,
      setBearing: (bearing: number) => map.setBearing(((bearing % 360) + 360) % 360),
      zoomToSiteWithFocus: (site: MineSite) => {
        const targetZoom = getZoomForHorizontalDistanceKm(13, site.location.coordinates[1], map.getCanvas().clientWidth);
        stopTemporaryAutoRotate();
        temporaryAutoRotateRef.current = true;
        armTemporaryAutoRotateCancellation();
        startTemporaryAutoRotate(map);
        map.flyTo({
          center: site.location.coordinates,
          zoom: targetZoom,
          pitch: Math.min(50, pitchLimit),
          duration: 1400 * smoothnessMultiplier,
          essential: true,
          curve: 1.2,
        });
      },
    };
  };

  const attachMapHandlers = (map: mapboxgl.Map) => {
    if (hasAttachedMapHandlers.current) return;
    hasAttachedMapHandlers.current = true;

    const handleMove = () => scheduleTelemetry(map);
    const handleMoveEnd = () => emitTelemetry(map);
    const handleMineSiteClick = (event: mapboxgl.MapLayerMouseEvent) => {
      event.originalEvent.stopPropagation();
      const feature = event.features?.[0];
      const id = feature?.properties?.id as string | undefined;
      if (!id) return;
      const site = mineSitesRef.current.find((item) => item.id === id) ?? null;
      onSelectSite(site);
    };
    const handleMapClick = (event: mapboxgl.MapMouseEvent) => {
      const hitMineSite = map.queryRenderedFeatures(event.point, { layers: [MINE_SITES_LAYER_ID] }).length > 0;
      if (!hitMineSite) {
        setHoveredSite(null);
        onSelectSite(null);
      }
    };
    const handleMineSiteMouseMove = (event: mapboxgl.MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const id = feature?.properties?.id as string | undefined;
      if (!id) {
        setHoveredSite(null);
        return;
      }
      const site = mineSitesRef.current.find((item) => item.id === id) ?? null;
      setHoveredSite(site);
      map.getCanvas().style.cursor = "pointer";
    };
    const handleMineSiteMouseLeave = () => {
      setHoveredSite(null);
      map.getCanvas().style.cursor = "";
    };

    map.on("move", handleMove);
    map.on("zoom", handleMove);
    map.on("rotate", handleMove);
    map.on("pitch", handleMove);
    map.on("moveend", handleMoveEnd);
    map.on("click", MINE_SITES_LAYER_ID, handleMineSiteClick);
    map.on("click", handleMapClick);
    map.on("mousemove", MINE_SITES_LAYER_ID, handleMineSiteMouseMove);
    map.on("mouseleave", MINE_SITES_LAYER_ID, handleMineSiteMouseLeave);

    mapHandlerCleanupRef.current = () => {
      map.off("move", handleMove);
      map.off("zoom", handleMove);
      map.off("rotate", handleMove);
      map.off("pitch", handleMove);
      map.off("moveend", handleMoveEnd);
      map.off("click", MINE_SITES_LAYER_ID, handleMineSiteClick);
      map.off("click", handleMapClick);
      map.off("mousemove", MINE_SITES_LAYER_ID, handleMineSiteMouseMove);
      map.off("mouseleave", MINE_SITES_LAYER_ID, handleMineSiteMouseLeave);
      hasAttachedMapHandlers.current = false;
      mapHandlerCleanupRef.current = null;
    };
  };

  const initializeLoadedMap = (map: mapboxgl.Map) => {
    hasLoadedMap.current = true;

    const controls = buildMapControls(map);
    onControlsReady?.(controls);

    map.setFog({
      color: "rgb(235, 230, 220)",
      "high-color": "rgb(200, 215, 230)",
      "horizon-blend": 0.04,
      "space-color": "rgb(180, 195, 220)",
      "star-intensity": 0,
    });

    ensureTerrainSource(map);
    ensureDataLayers(map);
    map.setMaxPitch(pitchLimit);
    applyLabelDensity(map);

    // Tune interaction inertia for a more premium, fluid map feel.
    map.scrollZoom.setWheelZoomRate(1 / 520);
    map.scrollZoom.setZoomRate(1 / 100);
    map.dragPan.enable({
      linearity: 0.25,
      easing: (t) => t,
      maxSpeed: 1800,
      deceleration: 3200,
    });

    attachMapHandlers(map);
    emitTelemetry(map);

    if (hasPlayedIntro.current) return;
    hasPlayedIntro.current = true;

    const shouldPlayLandingIntro =
      typeof window !== "undefined" && new URLSearchParams(window.location.search).get("intro") === "landing";

    applyTerrainMode(map, { animateCamera: false });
    window.setTimeout(() => {
      if (shouldPlayLandingIntro) {
        map.jumpTo({
          center: GLOBE_CENTER,
          zoom: 2.35,
          pitch: 0,
          bearing: 0,
        });
      }
      controls.flyToAustralia();
    }, 80);
  };

  useEffect(() => {
    mineSitesRef.current = mineSites;
    const map = mapRef.current?.getMap();
    if (!map) return;
    const applyMineSiteData = () => {
      if (!map.isStyleLoaded()) return false;
      ensureDataLayers(map);
      const source = map.getSource(MINE_SITES_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
      if (!source) return false;
      source.setData({
        type: "FeatureCollection",
        features: mineSites.map((site) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: site.location.coordinates,
          },
          properties: {
            id: site.id,
            name: site.name,
            operator: site.operator ?? "",
            state: site.state ?? "",
          },
        })),
      });
      if (map.getLayer(MINE_SITES_LAYER_ID)) {
        map.moveLayer(MINE_SITES_LAYER_ID);
      }
      return true;
    };
    if (applyMineSiteData()) return;
    const onceLoaded = () => {
      if (applyMineSiteData()) {
        map.off("idle", onceLoaded);
        map.off("styledata", onceLoaded);
        map.off("load", onceLoaded);
      }
    };
    map.on("idle", onceLoaded);
    map.on("styledata", onceLoaded);
    map.on("load", onceLoaded);
    return () => {
      map.off("idle", onceLoaded);
      map.off("styledata", onceLoaded);
      map.off("load", onceLoaded);
    };
  }, [mineSites]);

  useEffect(() => {
    tenementsRef.current = tenements;
    const map = mapRef.current?.getMap();
    if (!map) return;
    const applyTenementData = () => {
      if (!map.isStyleLoaded()) return false;
      ensureDataLayers(map);
      const source = map.getSource(TENEMENTS_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
      if (!source) return false;
      source.setData({
        type: "FeatureCollection",
        features: tenements
          .filter((tenement) => tenement.boundary)
          .map((tenement) => ({
            type: "Feature",
            geometry: tenement.boundary as GeoJSON.Geometry,
            properties: {
              id: tenement.id,
            },
          })),
      });
      return true;
    };
    if (applyTenementData()) return;
    const onceLoaded = () => {
      if (applyTenementData()) {
        map.off("idle", onceLoaded);
        map.off("styledata", onceLoaded);
        map.off("load", onceLoaded);
      }
    };
    map.on("idle", onceLoaded);
    map.on("styledata", onceLoaded);
    map.on("load", onceLoaded);
    return () => {
      map.off("idle", onceLoaded);
      map.off("styledata", onceLoaded);
      map.off("load", onceLoaded);
    };
  }, [tenements]);

  useEffect(() => {
    selectedSiteIdRef.current = selectedSite?.id ?? null;
    const map = mapRef.current?.getMap();
    if (!map || !hasLoadedMap.current || !map.getLayer(MINE_SITES_LAYER_ID)) return;
    map.setPaintProperty(MINE_SITES_LAYER_ID, "circle-color", [
      "case",
      ["==", ["get", "id"], selectedSiteIdRef.current ?? ""],
      getSelectedMarkerColor(),
      getDefaultMarkerColor(markerOpacityRef.current),
    ]);
  }, [selectedSite?.id]);

  useEffect(() => {
    markerScaleRef.current = markerScale;
    const map = mapRef.current?.getMap();
    if (!map || !hasLoadedMap.current || !map.getLayer(MINE_SITES_LAYER_ID)) return;
    map.setPaintProperty(MINE_SITES_LAYER_ID, "circle-radius", [
      "max",
      6,
      [
        "*",
        [
          "interpolate",
          ["linear"],
          ["zoom"],
          2,
          4.8,
          4.2,
          6.5,
          5,
          7.5,
          5.8,
          8.5,
          6.6,
          10,
        ],
        markerScaleRef.current,
      ],
    ]);
  }, [markerScale]);

  useEffect(() => {
    markerOpacityRef.current = markerOpacity;
    const map = mapRef.current?.getMap();
    if (!map || !hasLoadedMap.current || !map.getLayer(MINE_SITES_LAYER_ID)) return;
    map.setPaintProperty(MINE_SITES_LAYER_ID, "circle-color", [
      "case",
      ["==", ["get", "id"], selectedSiteIdRef.current ?? ""],
      getSelectedMarkerColor(),
      getDefaultMarkerColor(markerOpacityRef.current),
    ]);
  }, [markerOpacity]);

  useEffect(() => {
    showTenementBoundariesRef.current = showTenementBoundaries;
    const map = mapRef.current?.getMap();
    if (!map || !hasLoadedMap.current) return;
    const visibility = showTenementBoundariesRef.current ? "visible" : "none";
    if (map.getLayer(TENEMENTS_FILL_LAYER_ID)) {
      map.setLayoutProperty(TENEMENTS_FILL_LAYER_ID, "visibility", visibility);
    }
    if (map.getLayer(TENEMENTS_LINE_LAYER_ID)) {
      map.setLayoutProperty(TENEMENTS_LINE_LAYER_ID, "visibility", visibility);
    }
  }, [showTenementBoundaries]);

  useEffect(() => {
    qualityModeRef.current = qualityMode;
    const map = mapRef.current?.getMap();
    if (!map || !hasLoadedMap.current) return;
    if (map.getLayer(TENEMENTS_LINE_LAYER_ID)) {
      map.setPaintProperty(TENEMENTS_LINE_LAYER_ID, "line-width", qualityModeRef.current === "performance" ? 0.7 : 1.1);
    }
    if (map.getLayer(MINE_SITES_LAYER_ID)) {
      map.setPaintProperty(
        MINE_SITES_LAYER_ID,
        "circle-stroke-width",
        qualityModeRef.current === "performance" ? 0.95 : 1.3,
      );
      map.setPaintProperty(
        MINE_SITES_LAYER_ID,
        "circle-emissive-strength",
        qualityModeRef.current === "performance" ? (isSatelliteStyle ? 0.55 : 0.45) : isSatelliteStyle ? 0.8 : 0.65,
      );
      map.setPaintProperty(MINE_SITES_LAYER_ID, "circle-stroke-color", getMarkerStrokeColor());
      map.setPaintProperty(MINE_SITES_LAYER_ID, "circle-color", [
        "case",
        ["==", ["get", "id"], selectedSiteIdRef.current ?? ""],
        getSelectedMarkerColor(),
        getDefaultMarkerColor(markerOpacityRef.current),
      ]);
    }
  }, [isSatelliteStyle, qualityMode]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !hasLoadedMap.current || !map.getLayer(MINE_SITES_LAYER_ID)) return;
    map.setPaintProperty(MINE_SITES_LAYER_ID, "circle-color", [
      "case",
      ["==", ["get", "id"], selectedSiteIdRef.current ?? ""],
      getSelectedMarkerColor(),
      getDefaultMarkerColor(markerOpacityRef.current),
    ]);
    map.setPaintProperty(MINE_SITES_LAYER_ID, "circle-stroke-color", getMarkerStrokeColor());
    map.setPaintProperty(
      MINE_SITES_LAYER_ID,
      "circle-stroke-width",
      qualityModeRef.current === "performance" ? 0.95 : 1.3,
    );
    map.setPaintProperty(MINE_SITES_LAYER_ID, "circle-emissive-strength", isSatelliteStyle ? 0.8 : 0.65);
  }, [isSatelliteStyle, mapStyleUrl]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    if (map.loaded()) {
      initializeLoadedMap(map);
    }
  }, [onControlsReady, onTelemetryUpdate, pitchLimit, smoothnessMultiplier]);

  useEffect(() => {
    if (!selectedSite) return;
    const map = mapRef.current?.getMap();
    if (!map || !hasLoadedMap.current) return;

    map.flyTo({
      center: selectedSite.location.coordinates,
      zoom: Math.max(map.getZoom(), 6.8),
      pitch: Math.min(48, pitchLimit),
      bearing: map.getBearing(),
      duration: 1800 * smoothnessMultiplier,
      curve: 1.22,
      essential: true,
    });
  }, [pitchLimit, selectedSite, smoothnessMultiplier]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !hasLoadedMap.current) return;
    applyTerrainMode(map);
  }, [pitchLimit, smoothnessMultiplier, terrainEnabled, terrainExaggeration]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !hasLoadedMap.current) return;
    map.setMaxPitch(pitchLimit);
    if (map.getPitch() > pitchLimit) {
      map.easeTo({ pitch: pitchLimit, duration: 350, essential: true });
    }
  }, [pitchLimit]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !hasLoadedMap.current) return;
    applyLabelDensity(map);
  }, [labelDensity, mapStyleUrl]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !hasLoadedMap.current) return;
    if (activeStyleUrlRef.current === mapStyleUrl) return;
    activeStyleUrlRef.current = mapStyleUrl;
    map.setStyle(mapStyleUrl);
  }, [mapStyleUrl]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !hasLoadedMap.current) return;
    if (autoRotateFrameRef.current) {
      window.cancelAnimationFrame(autoRotateFrameRef.current);
      autoRotateFrameRef.current = null;
    }
    if (!autoRotate) return;

    const speed = smoothness === "cinematic" ? 0.02 : 0.03;
    const spin = () => {
      if (!map.isMoving() || map.isRotating()) {
        map.setBearing(map.getBearing() + speed);
      }
      autoRotateFrameRef.current = window.requestAnimationFrame(spin);
    };
    autoRotateFrameRef.current = window.requestAnimationFrame(spin);
    return () => {
      if (autoRotateFrameRef.current) {
        window.cancelAnimationFrame(autoRotateFrameRef.current);
      }
    };
  }, [autoRotate, smoothness]);

  useEffect(
    () => () => {
      if (telemetryFrameRef.current !== null) {
        window.cancelAnimationFrame(telemetryFrameRef.current);
      }
      if (mapHandlerCleanupRef.current) {
        mapHandlerCleanupRef.current();
      }
    },
    [],
  );

  const handleMapLoad = () => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    initializeLoadedMap(map);
  };

  return (
    <div className="absolute inset-0 h-full w-full">
      <Map
        ref={mapRef}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        mapStyle={mapStyleUrl || MAP_STYLE}
        projection="globe"
        renderWorldCopies={false}
        mapLib={mapboxgl}
        initialViewState={{
          longitude: INITIAL_AUSTRALIA_VIEW.longitude,
          latitude: INITIAL_AUSTRALIA_VIEW.latitude,
          zoom: INITIAL_AUSTRALIA_VIEW.zoom,
          pitch: INITIAL_AUSTRALIA_VIEW.pitch,
          bearing: INITIAL_AUSTRALIA_VIEW.bearing,
        }}
        onLoad={handleMapLoad}
        onStyleData={() => {
          const map = mapRef.current?.getMap();
          if (!map) return;
          ensureTerrainSource(map);
          ensureDataLayers(map);
          applyLabelDensity(map);
          applyTerrainMode(map, { animateCamera: false });
        }}
      >
        {mineSites.map((site) => {
          const isSelected = site.id === selectedSite?.id;
          return (
            <Marker
              key={site.id}
              longitude={site.location.coordinates[0]}
              latitude={site.location.coordinates[1]}
              anchor="center"
            >
              <button
                type="button"
                aria-label={`Select ${site.name}`}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  event.nativeEvent.stopImmediatePropagation();
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  event.nativeEvent.stopImmediatePropagation();
                  onSelectSite(site);
                }}
                onMouseEnter={() => setHoveredSite(site)}
                onMouseLeave={() => setHoveredSite(null)}
                className="block rounded-full border transition-transform duration-150 ease-out hover:scale-125"
                style={{
                  width: isSelected ? markerSize + 4 : markerSize,
                  height: isSelected ? markerSize + 4 : markerSize,
                  backgroundColor: isSelected ? "rgb(184, 125, 69)" : "rgba(14, 14, 14, 0.92)",
                  borderColor: "rgba(255, 253, 250, 0.78)",
                  borderWidth: isSelected ? 2 : 1,
                  boxShadow: "0 1px 4px rgba(0, 0, 0, 0.45)",
                  opacity: markerOpacity,
                }}
              />
            </Marker>
          );
        })}
      </Map>

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
