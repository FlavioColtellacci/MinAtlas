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
  zoomLevel: number;
}

const SETTINGS_STORAGE_KEY = "minatlas-map-settings-v1";
const SITE_SELECTION_TUNING = {
  zoomBudgets: [
    { maxZoom: 3.5, budget: 450 },
    { maxZoom: 5, budget: 900 },
    { maxZoom: 7, budget: 1600 },
    { maxZoom: 9, budget: 2600 },
    { maxZoom: Number.POSITIVE_INFINITY, budget: 4000 },
  ],
  quotas: {
    topScore: 0.55,
    midScore: 0.25,
    longTail: 0.2,
  },
  pools: {
    midScore: {
      startPercentile: 0.25,
      endPercentile: 0.75,
    },
    longTail: {
      startPercentile: 0.55,
    },
  },
} as const;
const UNKNOWN_DIVERSITY_GROUP = "__unknown__";

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

function getZoomSelectionBudget(zoomLevel: number, maxPointsRendered: number) {
  const zoomBudget = SITE_SELECTION_TUNING.zoomBudgets.find((entry) => zoomLevel <= entry.maxZoom)?.budget ?? maxPointsRendered;
  return Math.min(maxPointsRendered, zoomBudget);
}

function stableSiteHash(site: MineSite) {
  let hash = 2166136261;
  for (let index = 0; index < site.id.length; index += 1) {
    hash ^= site.id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function compareByImportance(a: MineSite, b: MineSite) {
  return b.importanceScore - a.importanceScore || stableSiteHash(a) - stableSiteHash(b) || a.id.localeCompare(b.id);
}

function compareByStableRandom(a: MineSite, b: MineSite) {
  return stableSiteHash(a) - stableSiteHash(b) || compareByImportance(a, b);
}

function getDiversityCaps(budget: number, zoomLevel: number) {
  const stateShare = zoomLevel < 4 ? 0.4 : zoomLevel < 6 ? 0.5 : 0.65;
  const commodityShare = zoomLevel < 4 ? 0.35 : zoomLevel < 6 ? 0.45 : 0.6;

  return {
    maxPerState: Math.max(12, Math.ceil(budget * stateShare)),
    maxPerCommodity: Math.max(12, Math.ceil(budget * commodityShare)),
  };
}

function getSiteStateKey(site: MineSite) {
  return site.state ?? UNKNOWN_DIVERSITY_GROUP;
}

function getSiteCommodityKeys(site: MineSite) {
  return site.commodity.length > 0 ? site.commodity : [UNKNOWN_DIVERSITY_GROUP];
}

function matchesSiteSearch(site: MineSite, normalizedQuery: string) {
  if (normalizedQuery.length === 0) return true;

  return [
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
}

function selectMineSitesForMap(sites: MineSite[], maxPointsRendered: number, zoomLevel: number) {
  const budget = getZoomSelectionBudget(zoomLevel, maxPointsRendered);
  if (sites.length <= budget) return sites;

  const sortedByImportance = [...sites].sort(compareByImportance);
  const midPool = sortedByImportance
    .slice(
      Math.floor(sortedByImportance.length * SITE_SELECTION_TUNING.pools.midScore.startPercentile),
      Math.ceil(sortedByImportance.length * SITE_SELECTION_TUNING.pools.midScore.endPercentile),
    )
    .sort(compareByImportance);
  const longTailPool = sortedByImportance
    .slice(Math.floor(sortedByImportance.length * SITE_SELECTION_TUNING.pools.longTail.startPercentile))
    .sort(compareByStableRandom);
  const selectedSites: MineSite[] = [];
  const selectedSiteIds = new Set<string>();
  const stateCounts = new Map<string, number>();
  const commodityCounts = new Map<string, number>();
  const diversityCaps = getDiversityCaps(budget, zoomLevel);
  const topScoreTarget = Math.min(budget, Math.round(budget * SITE_SELECTION_TUNING.quotas.topScore));
  const midScoreTarget = Math.min(budget - topScoreTarget, Math.round(budget * SITE_SELECTION_TUNING.quotas.midScore));
  const longTailTarget = Math.min(
    budget - topScoreTarget - midScoreTarget,
    Math.round(budget * SITE_SELECTION_TUNING.quotas.longTail),
  );

  const canAddSite = (site: MineSite, enforceDiversity: boolean) => {
    if (selectedSiteIds.has(site.id)) return false;
    if (!enforceDiversity) return true;

    const stateKey = getSiteStateKey(site);
    if ((stateCounts.get(stateKey) ?? 0) >= diversityCaps.maxPerState) return false;

    return getSiteCommodityKeys(site).every(
      (commodityKey) => (commodityCounts.get(commodityKey) ?? 0) < diversityCaps.maxPerCommodity,
    );
  };

  const addSite = (site: MineSite) => {
    selectedSiteIds.add(site.id);
    selectedSites.push(site);

    const stateKey = getSiteStateKey(site);
    stateCounts.set(stateKey, (stateCounts.get(stateKey) ?? 0) + 1);
    for (const commodityKey of getSiteCommodityKeys(site)) {
      commodityCounts.set(commodityKey, (commodityCounts.get(commodityKey) ?? 0) + 1);
    }
  };

  const addFromPool = (pool: MineSite[], targetSize: number, enforceDiversity: boolean) => {
    for (const site of pool) {
      if (selectedSites.length >= targetSize) break;
      if (!canAddSite(site, enforceDiversity)) continue;
      addSite(site);
    }
  };

  addFromPool(sortedByImportance, topScoreTarget, true);
  addFromPool(midPool, topScoreTarget + midScoreTarget, true);
  addFromPool(longTailPool, topScoreTarget + midScoreTarget + longTailTarget, true);

  if (selectedSites.length < budget) {
    addFromPool([...longTailPool, ...midPool, ...sortedByImportance], budget, false);
  }

  return selectedSites;
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
    zoomLevel: 2.9,
  });
  const [selectedCommodities, setSelectedCommodities] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [openFiltersRequestToken, setOpenFiltersRequestToken] = useState(0);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [mapControls, setMapControls] = useState<{
    zoomIn: () => void;
    zoomOut: () => void;
    flyToAustralia: () => void;
    resetBearing: () => void;
    fitToVisibleSites: () => void;
    setBearing: (bearing: number) => void;
    zoomToSiteWithFocus: (site: MineSite) => void;
  } | null>(null);

  const mapStyleUrl = MAP_STYLE_BY_BASEMAP[settings.basemap];
  const maxPointsRendered = normalizeMaxPointsRendered(settings.maxPointsRendered);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const handleTelemetryUpdate = useCallback((next: MapTelemetryState) => {
    setMapTelemetry((previous) =>
      previous.viewDistanceKm === next.viewDistanceKm &&
      previous.bearingDeg === next.bearingDeg &&
      previous.zoomLevel === next.zoomLevel
        ? previous
        : next,
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
      const filteredSites = mineSites
        .filter((site) => {
          const commodityMatches =
            selectedCommodities.length === 0 || site.commodity.some((commodity) => selectedCommodities.includes(commodity));
          const stateMatches = selectedStates.length === 0 || (site.state ? selectedStates.includes(site.state) : false);
          const statusMatches = selectedStatuses.length === 0 || selectedStatuses.includes(site.status);
          const searchMatches = matchesSiteSearch(site, normalizedSearchQuery);

          return commodityMatches && stateMatches && statusMatches && searchMatches;
        });

      return selectMineSitesForMap(filteredSites, maxPointsRendered, mapTelemetry.zoomLevel);
    },
    [mapTelemetry.zoomLevel, maxPointsRendered, mineSites, normalizedSearchQuery, selectedCommodities, selectedStates, selectedStatuses],
  );

  const visibleTenements = useMemo(
    () => {
      return (
      tenements.filter((tenement) => {
        const commodityMatches =
          selectedCommodities.length === 0 ||
          tenement.commodity.some((commodity) => selectedCommodities.includes(commodity));
        const stateMatches = selectedStates.length === 0 || (tenement.state ? selectedStates.includes(tenement.state) : false);
        const searchMatches =
          normalizedSearchQuery.length === 0 ||
          [tenement.tenement_id ?? "", tenement.holder ?? "", tenement.state ?? "", tenement.status ?? "", tenement.commodity.join(" ")]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearchQuery);

        return commodityMatches && stateMatches && searchMatches;
      })
      );
    },
    [normalizedSearchQuery, selectedCommodities, selectedStates, tenements],
  );

  const liveSearchResults = useMemo(() => {
    if (normalizedSearchQuery.length === 0) return [];

    return [...mineSites]
      .filter((site) => matchesSiteSearch(site, normalizedSearchQuery))
      .sort((a, b) => {
        const aStartsWith = a.name.toLowerCase().startsWith(normalizedSearchQuery) ? 1 : 0;
        const bStartsWith = b.name.toLowerCase().startsWith(normalizedSearchQuery) ? 1 : 0;
        return bStartsWith - aStartsWith || b.importanceScore - a.importanceScore || a.name.localeCompare(b.name);
      })
      .slice(0, 8);
  }, [mineSites, normalizedSearchQuery]);

  const featuredSites = useMemo(
    () =>
      [...mineSites]
        .sort((a, b) => b.importanceScore - a.importanceScore || a.name.localeCompare(b.name))
        .slice(0, 8),
    [mineSites],
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

      <div className="absolute left-[18px] right-[18px] top-[18px] z-20 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="relative w-[560px] max-w-[calc(100vw-420px)]">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => {
                window.setTimeout(() => setIsSearchFocused(false), 120);
              }}
            />
            {normalizedSearchQuery.length > 0 || isSearchFocused ? (
              <div className="premium-scrollbar glass absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-80 overflow-y-auto rounded-2xl p-2">
                {normalizedSearchQuery.length === 0 ? (
                  <p className="px-3 py-2 text-xs uppercase tracking-wide text-[color:var(--text-tertiary)]">Main sites</p>
                ) : null}
                {(normalizedSearchQuery.length > 0 ? liveSearchResults : featuredSites).length > 0 ? (
                  (normalizedSearchQuery.length > 0 ? liveSearchResults : featuredSites).map((site) => (
                    <button
                      key={site.id}
                      type="button"
                      onClick={() => {
                        setLayersEnabled(true);
                        setSelectedSite(site);
                        setSearchQuery(site.name);
                        setIsSearchFocused(false);
                        mapControls?.zoomToSiteWithFocus(site);
                      }}
                      className={[
                        "w-full rounded-xl px-3 py-2 text-left transition-all duration-150 ease-out",
                        selectedSite?.id === site.id
                          ? "bg-[color:var(--accent-subtle)] text-[color:var(--text-primary)]"
                          : "text-[color:var(--text-secondary)] hover:bg-[color:var(--accent-subtle)] hover:text-[color:var(--text-primary)]",
                      ].join(" ")}
                    >
                      <p className="truncate text-sm">{site.name}</p>
                      <p className="truncate text-xs text-[color:var(--text-tertiary)]">
                        {[site.operator, site.state, site.nearest_town].filter(Boolean).join(" • ") || site.status}
                      </p>
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-2 text-sm text-[color:var(--text-tertiary)]">
                    {normalizedSearchQuery.length > 0 ? "No matching sites found." : "No sites available."}
                  </p>
                )}
              </div>
            ) : null}
          </div>
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
            openPanelRequestToken={openFiltersRequestToken}
          />
        </div>
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

      <div className="absolute bottom-10 right-[18px] z-20 flex flex-col items-end gap-1">
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
        <DetailCard
          site={selectedSite}
          onZoomToSite={() => {
            if (!selectedSite) return;
            mapControls?.zoomToSiteWithFocus(selectedSite);
          }}
          onGuideClickMarker={() => {
            mapControls?.fitToVisibleSites();
          }}
          onGuideSearch={() => {
            window.dispatchEvent(new Event("minatlas:focus-search"));
          }}
          onGuideFilters={() => {
            setOpenFiltersRequestToken((current) => current + 1);
          }}
        />
      </div>

    </main>
  );
}
