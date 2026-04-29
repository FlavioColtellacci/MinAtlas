"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DetailCard from "@/components/detail/DetailCard";
import FilterBar from "@/components/filters/FilterBar";
import CompassControl from "@/components/map/CompassControl";
import MapCanvas from "@/components/map/MapCanvas";
import MapControls from "@/components/map/MapControls";
import SearchBar from "@/components/search/SearchBar";
import { useMineSites } from "@/hooks/useMineSites";
import { useTenements } from "@/hooks/useTenements";
import type { MineSite } from "@/types/mining";

type BasemapMode = "light" | "dark" | "satellite";
type LabelDensity = "clean" | "detailed";
type SmoothnessMode = "normal" | "cinematic";
type QualityMode = "high" | "performance";

interface MapSettingsState {
  basemap: BasemapMode;
  labelDensity: LabelDensity;
  autoRotate: boolean;
  terrainExaggeration: number;
  pitchLimit: number;
  smoothness: SmoothnessMode;
  markerScale: number;
  markerOpacity: number;
  showTenementBoundaries: boolean;
  qualityMode: QualityMode;
  maxPointsRendered: number;
}

interface MapTelemetryState {
  viewDistanceKm: number;
  bearingDeg: number;
}

const SETTINGS_STORAGE_KEY = "minatlas-map-settings-v1";

const DEFAULT_SETTINGS: MapSettingsState = {
  basemap: "satellite",
  labelDensity: "detailed",
  autoRotate: false,
  terrainExaggeration: 2.8,
  pitchLimit: 70,
  smoothness: "normal",
  markerScale: 1,
  markerOpacity: 0.78,
  showTenementBoundaries: true,
  qualityMode: "high",
  maxPointsRendered: 2000,
};

const MAP_STYLE_BY_BASEMAP: Record<BasemapMode, string> = {
  light: "mapbox://styles/mapbox/light-v11",
  dark: "mapbox://styles/mapbox/dark-v11",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
};

function normalizeMaxPointsRendered(value: number | undefined) {
  if (!Number.isFinite(value)) return DEFAULT_SETTINGS.maxPointsRendered;
  return Math.max(300, Math.min(4000, Math.round(value as number)));
}

function normalizeMarkerScale(value: number | undefined) {
  if (!Number.isFinite(value)) return DEFAULT_SETTINGS.markerScale;
  return Math.max(0.7, Math.min(1.5, value as number));
}

function normalizeMarkerOpacity(value: number | undefined) {
  if (!Number.isFinite(value)) return DEFAULT_SETTINGS.markerOpacity;
  return Math.max(0.35, Math.min(1, value as number));
}

export default function MapPage() {
  const { data: mineSites = [] } = useMineSites();
  const { data: tenements = [] } = useTenements();
  const [selectedSite, setSelectedSite] = useState<MineSite | null>(null);
  const [layersEnabled, setLayersEnabled] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [settings, setSettings] = useState<MapSettingsState>(DEFAULT_SETTINGS);
  const [mapTelemetry, setMapTelemetry] = useState<MapTelemetryState>({
    viewDistanceKm: 0,
    bearingDeg: 0,
  });
  const [selectedCommodities, setSelectedCommodities] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [mapControls, setMapControls] = useState<{
    zoomIn: () => void;
    zoomOut: () => void;
    flyToAustralia: () => void;
    resetBearing: () => void;
    fitToVisibleSites: () => void;
    setBearing: (bearing: number) => void;
  } | null>(null);

  const mapStyleUrl = MAP_STYLE_BY_BASEMAP[settings.basemap];
  const maxPointsRendered = normalizeMaxPointsRendered(settings.maxPointsRendered);
  const handleTelemetryUpdate = useCallback((next: MapTelemetryState) => {
    setMapTelemetry((previous) =>
      previous.viewDistanceKm === next.viewDistanceKm && previous.bearingDeg === next.bearingDeg ? previous : next,
    );
  }, []);

  const commodities = useMemo(
    () =>
      Array.from(new Set(mineSites.flatMap((site) => site.commodity)))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [mineSites],
  );

  const states = useMemo(
    () =>
      Array.from(new Set(mineSites.map((site) => site.state).filter((state): state is string => Boolean(state)))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [mineSites],
  );

  const statuses = useMemo(
    () => Array.from(new Set(mineSites.map((site) => site.status))).sort((a, b) => a.localeCompare(b)),
    [mineSites],
  );

  const visibleSites = useMemo(
    () => {
      const normalizedQuery = searchQuery.trim().toLowerCase();

      return (
      mineSites
        .filter((site) => {
          const commodityMatches =
            selectedCommodities.length === 0 || site.commodity.some((commodity) => selectedCommodities.includes(commodity));
          const stateMatches = selectedStates.length === 0 || (site.state ? selectedStates.includes(site.state) : false);
          const statusMatches = selectedStatuses.length === 0 || selectedStatuses.includes(site.status);
          const searchMatches =
            normalizedQuery.length === 0 ||
            [
              site.name,
              site.operator ?? "",
              site.state ?? "",
              site.nearest_town ?? "",
              site.commodity.join(" "),
              site.status,
              site.production_type ?? "",
            ]
              .join(" ")
              .toLowerCase()
              .includes(normalizedQuery);

          return commodityMatches && stateMatches && statusMatches && searchMatches;
        })
        .slice(0, maxPointsRendered)
      );
    },
    [maxPointsRendered, mineSites, searchQuery, selectedCommodities, selectedStates, selectedStatuses],
  );

  const visibleTenements = useMemo(
    () => {
      const normalizedQuery = searchQuery.trim().toLowerCase();

      return (
      tenements.filter((tenement) => {
        const commodityMatches =
          selectedCommodities.length === 0 ||
          tenement.commodity.some((commodity) => selectedCommodities.includes(commodity));
        const stateMatches = selectedStates.length === 0 || (tenement.state ? selectedStates.includes(tenement.state) : false);
        const searchMatches =
          normalizedQuery.length === 0 ||
          [tenement.tenement_id ?? "", tenement.holder ?? "", tenement.state ?? "", tenement.status ?? "", tenement.commodity.join(" ")]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);

        return commodityMatches && stateMatches && searchMatches;
      })
      );
    },
    [searchQuery, selectedCommodities, selectedStates, tenements],
  );

  const toggleValue = (value: string, current: string[], setValue: (next: string[]) => void) => {
    setValue(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };

  useEffect(() => {
    if (!selectedSite) return;
    const stillVisible = visibleSites.some((site) => site.id === selectedSite.id);
    if (!stillVisible) {
      setSelectedSite(null);
    }
  }, [selectedSite, visibleSites]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Partial<MapSettingsState>;
      setSettings((prev) => ({
        ...prev,
        ...parsed,
        markerScale: normalizeMarkerScale(parsed.markerScale),
        markerOpacity: normalizeMarkerOpacity(parsed.markerOpacity),
        maxPointsRendered: normalizeMaxPointsRendered(parsed.maxPointsRendered),
      }));
    } catch {
      // ignore malformed storage
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-map">
      <MapCanvas
        mineSites={layersEnabled ? visibleSites : []}
        tenements={layersEnabled ? visibleTenements : []}
        mapStyleUrl={mapStyleUrl}
        labelDensity={settings.labelDensity}
        autoRotate={settings.autoRotate}
        terrainEnabled
        terrainExaggeration={settings.terrainExaggeration}
        pitchLimit={settings.pitchLimit}
        smoothness={settings.smoothness}
        markerScale={settings.markerScale}
        markerOpacity={settings.markerOpacity}
        showTenementBoundaries={settings.showTenementBoundaries}
        qualityMode={settings.qualityMode}
        selectedSite={selectedSite}
        onSelectSite={setSelectedSite}
        onControlsReady={setMapControls}
        onTelemetryUpdate={handleTelemetryUpdate}
      />

      <div className="absolute left-[18px] right-[18px] top-[18px] z-20 flex items-center justify-between gap-3">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
        <MapControls
          layersActive={layersEnabled}
          settingsActive={settingsOpen}
          onToggleLayers={() => {
            setLayersEnabled((current) => {
              const next = !current;
              if (!next) {
                setSelectedSite(null);
              }
              return next;
            });
          }}
          onToggleSettings={() => setSettingsOpen((current) => !current)}
        />
      </div>

      <div
        className={[
          "glass absolute right-[18px] top-[76px] z-30 flex w-[360px] max-h-[78vh] flex-col gap-3 overflow-y-auto rounded-2xl p-4 text-sm transition-all duration-250 ease-out",
          settingsOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0",
        ].join(" ")}
      >
        <p className="text-xs uppercase tracking-wide text-[color:var(--text-tertiary)]">Map Settings</p>

        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wide text-[color:var(--text-tertiary)]">View</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => mapControls?.resetBearing()}
              className="rounded-lg border border-[color:var(--border-subtle)] px-3 py-2 text-left text-[color:var(--text-secondary)] transition-all duration-200 ease-out hover:border-[color:var(--accent)] hover:text-[color:var(--text-primary)]"
            >
              Reset bearing
            </button>
            <button
              type="button"
              onClick={() => setSettings((prev) => ({ ...prev, autoRotate: !prev.autoRotate }))}
              className={[
                "rounded-lg border px-3 py-2 text-left transition-all duration-200 ease-out",
                settings.autoRotate
                  ? "border-[color:var(--accent)] bg-[color:var(--accent-subtle)] text-[color:var(--text-primary)]"
                  : "border-[color:var(--border-subtle)] text-[color:var(--text-secondary)] hover:border-[color:var(--accent)]",
              ].join(" ")}
            >
              Auto-rotate globe
            </button>
          </div>
          <button
            type="button"
            onClick={() => mapControls?.fitToVisibleSites()}
            className="w-full rounded-lg border border-[color:var(--border-subtle)] px-3 py-2 text-left text-[color:var(--text-secondary)] transition-all duration-200 ease-out hover:border-[color:var(--accent)] hover:text-[color:var(--text-primary)]"
          >
            Fit to visible sites
          </button>
        </div>

        <div className="h-px bg-[color:var(--border-subtle)]" />

        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wide text-[color:var(--text-tertiary)]">Map Style</p>
          <div className="grid grid-cols-3 gap-2">
            {(["light", "dark", "satellite"] as BasemapMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, basemap: mode }))}
                className={[
                  "rounded-lg border px-2 py-1.5 text-xs capitalize transition-all duration-200 ease-out",
                  settings.basemap === mode
                    ? "border-[color:var(--accent)] bg-[color:var(--accent-subtle)] text-[color:var(--text-primary)]"
                    : "border-[color:var(--border-subtle)] text-[color:var(--text-secondary)]",
                ].join(" ")}
              >
                {mode}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(["clean", "detailed"] as LabelDensity[]).map((density) => (
              <button
                key={density}
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, labelDensity: density }))}
                className={[
                  "rounded-lg border px-3 py-1.5 text-xs capitalize transition-all duration-200 ease-out",
                  settings.labelDensity === density
                    ? "border-[color:var(--accent)] bg-[color:var(--accent-subtle)] text-[color:var(--text-primary)]"
                    : "border-[color:var(--border-subtle)] text-[color:var(--text-secondary)]",
                ].join(" ")}
              >
                {density} labels
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-[color:var(--border-subtle)]" />

        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wide text-[color:var(--text-tertiary)]">Terrain & Camera</p>
          <label className="block text-xs text-[color:var(--text-secondary)]">
            3D exaggeration ({settings.terrainExaggeration.toFixed(1)}x)
          </label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={settings.terrainExaggeration}
            onChange={(event) =>
              setSettings((prev) => ({ ...prev, terrainExaggeration: Number(event.target.value) }))
            }
            className="w-full"
          />
          <label className="block text-xs text-[color:var(--text-secondary)]">Pitch limit ({settings.pitchLimit}deg)</label>
          <input
            type="range"
            min={35}
            max={85}
            step={1}
            value={settings.pitchLimit}
            onChange={(event) => setSettings((prev) => ({ ...prev, pitchLimit: Number(event.target.value) }))}
            className="w-full"
          />
          <div className="grid grid-cols-2 gap-2">
            {(["normal", "cinematic"] as SmoothnessMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, smoothness: mode }))}
                className={[
                  "rounded-lg border px-3 py-1.5 text-xs capitalize transition-all duration-200 ease-out",
                  settings.smoothness === mode
                    ? "border-[color:var(--accent)] bg-[color:var(--accent-subtle)] text-[color:var(--text-primary)]"
                    : "border-[color:var(--border-subtle)] text-[color:var(--text-secondary)]",
                ].join(" ")}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-[color:var(--border-subtle)]" />

        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wide text-[color:var(--text-tertiary)]">Data Display</p>
          <label className="block text-xs text-[color:var(--text-secondary)]">
            Marker size ({settings.markerScale.toFixed(2)}x)
          </label>
          <input
            type="range"
            min={0.7}
            max={1.5}
            step={0.05}
            value={settings.markerScale}
            onChange={(event) => setSettings((prev) => ({ ...prev, markerScale: Number(event.target.value) }))}
            className="w-full"
          />
          <label className="block text-xs text-[color:var(--text-secondary)]">
            Marker opacity ({Math.round(settings.markerOpacity * 100)}%)
          </label>
          <input
            type="range"
            min={0.35}
            max={1}
            step={0.05}
            value={settings.markerOpacity}
            onChange={(event) => setSettings((prev) => ({ ...prev, markerOpacity: Number(event.target.value) }))}
            className="w-full"
          />
          <button
            type="button"
            onClick={() => setSettings((prev) => ({ ...prev, showTenementBoundaries: !prev.showTenementBoundaries }))}
            className={[
              "w-full rounded-lg border px-3 py-2 text-left transition-all duration-200 ease-out",
              settings.showTenementBoundaries
                ? "border-[color:var(--accent)] bg-[color:var(--accent-subtle)] text-[color:var(--text-primary)]"
                : "border-[color:var(--border-subtle)] text-[color:var(--text-secondary)]",
            ].join(" ")}
          >
            {settings.showTenementBoundaries ? "Hide tenement boundaries" : "Show tenement boundaries"}
          </button>
        </div>

        <div className="h-px bg-[color:var(--border-subtle)]" />

        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wide text-[color:var(--text-tertiary)]">Performance</p>
          <div className="grid grid-cols-2 gap-2">
            {(["high", "performance"] as QualityMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, qualityMode: mode }))}
                className={[
                  "rounded-lg border px-3 py-1.5 text-xs capitalize transition-all duration-200 ease-out",
                  settings.qualityMode === mode
                    ? "border-[color:var(--accent)] bg-[color:var(--accent-subtle)] text-[color:var(--text-primary)]"
                    : "border-[color:var(--border-subtle)] text-[color:var(--text-secondary)]",
                ].join(" ")}
              >
                {mode === "high" ? "High quality" : "Performance"}
              </button>
            ))}
          </div>
          <label className="block text-xs text-[color:var(--text-secondary)]">
            Max points rendered ({maxPointsRendered})
          </label>
          <input
            type="range"
            min={300}
            max={4000}
            step={100}
            value={maxPointsRendered}
            onChange={(event) => setSettings((prev) => ({ ...prev, maxPointsRendered: Number(event.target.value) }))}
            className="w-full"
          />
        </div>

        <div className="h-px bg-[color:var(--border-subtle)]" />

        <button
          type="button"
          onClick={() => mapControls?.flyToAustralia()}
          className="rounded-lg border border-[color:var(--border-subtle)] px-3 py-2 text-left text-[color:var(--text-secondary)] transition-all duration-200 ease-out hover:border-[color:var(--accent)] hover:text-[color:var(--text-primary)]"
        >
          Recenter on Australia
        </button>
        <button
          type="button"
          onClick={() => {
            setSettings(DEFAULT_SETTINGS);
            setLayersEnabled(true);
          }}
          className="rounded-lg border border-[color:var(--border-subtle)] px-3 py-2 text-left text-[color:var(--text-secondary)] transition-all duration-200 ease-out hover:border-[color:var(--accent)] hover:text-[color:var(--text-primary)]"
        >
          Reset all settings
        </button>
        <p className="text-xs text-[color:var(--text-tertiary)]">Settings are saved automatically on this device.</p>
      </div>

      <div className="absolute left-[18px] top-[76px] z-20">
        <FilterBar
          commodities={commodities}
          states={states}
          statuses={statuses}
          selectedCommodities={selectedCommodities}
          selectedStates={selectedStates}
          selectedStatuses={selectedStatuses}
          onToggleCommodity={(commodity) => toggleValue(commodity, selectedCommodities, setSelectedCommodities)}
          onToggleState={(state) => toggleValue(state, selectedStates, setSelectedStates)}
          onToggleStatus={(status) => toggleValue(status, selectedStatuses, setSelectedStatuses)}
          onClearFilters={() => {
            setSelectedCommodities([]);
            setSelectedStates([]);
            setSelectedStatuses([]);
          }}
        />
      </div>

      <div className="absolute bottom-10 right-[18px] z-20 flex flex-col items-end gap-2">
        <div className="flex items-end gap-2">
          <CompassControl
            bearingDeg={mapTelemetry.bearingDeg}
            onResetNorth={() => mapControls?.resetBearing()}
            onSetBearing={(bearing) => mapControls?.setBearing(bearing)}
          />

          <div className="glass flex flex-col overflow-hidden rounded-xl">
            <button
              type="button"
              onClick={() => mapControls?.zoomIn()}
              className="px-3 py-2 text-xl text-[color:var(--text-secondary)] transition-all duration-200 ease-out hover:bg-[color:var(--accent-subtle)] hover:text-[color:var(--text-primary)]"
            >
              +
            </button>
            <div className="h-px w-full bg-[color:var(--border-subtle)]" />
            <button
              type="button"
              onClick={() => mapControls?.zoomOut()}
              className="px-3 py-2 text-xl text-[color:var(--text-secondary)] transition-all duration-200 ease-out hover:bg-[color:var(--accent-subtle)] hover:text-[color:var(--text-primary)]"
            >
              -
            </button>
          </div>
        </div>

        <div className="glass pointer-events-none rounded-lg px-2 py-1 text-[10px] text-[color:var(--text-secondary)]">
          <p>Distance {mapTelemetry.viewDistanceKm.toLocaleString()} km</p>
        </div>

        <div className="glass pointer-events-none max-w-[280px] rounded-lg px-2 py-1 text-[10px] text-[color:var(--text-secondary)]">
          <p className="truncate">DMIRS · Geoscience Australia · Updated 2h ago</p>
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2">
        <DetailCard site={selectedSite} />
      </div>

    </main>
  );
}
