"use client";

import { useMemo, useState } from "react";
import DetailCard from "@/components/detail/DetailCard";
import FilterBar from "@/components/filters/FilterBar";
import MapCanvas from "@/components/map/MapCanvas";
import MapControls from "@/components/map/MapControls";
import SearchBar from "@/components/search/SearchBar";
import { useMineSites } from "@/hooks/useMineSites";
import { useTenements } from "@/hooks/useTenements";
import type { MineSite } from "@/types/mining";

export default function MapPage() {
  const { data: mineSites = [] } = useMineSites();
  const { data: tenements = [] } = useTenements();
  const [selectedSite, setSelectedSite] = useState<MineSite | null>(null);
  const [selectedCommodities, setSelectedCommodities] = useState<string[]>(["Gold"]);
  const [selectedStates, setSelectedStates] = useState<string[]>(["Western Australia"]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["operating"]);
  const [mapControls, setMapControls] = useState<{
    zoomIn: () => void;
    zoomOut: () => void;
    flyToAustralia: () => void;
  } | null>(null);

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
    () =>
      mineSites
        .filter((site) => {
          const commodityMatches =
            selectedCommodities.length === 0 || site.commodity.some((commodity) => selectedCommodities.includes(commodity));
          const stateMatches = selectedStates.length === 0 || (site.state ? selectedStates.includes(site.state) : false);
          const statusMatches = selectedStatuses.length === 0 || selectedStatuses.includes(site.status);
          return commodityMatches && stateMatches && statusMatches;
        })
        .slice(0, 2000),
    [mineSites, selectedCommodities, selectedStates, selectedStatuses],
  );

  const visibleTenements = useMemo(
    () =>
      tenements.filter((tenement) => {
        const commodityMatches =
          selectedCommodities.length === 0 ||
          tenement.commodity.some((commodity) => selectedCommodities.includes(commodity));
        const stateMatches = selectedStates.length === 0 || (tenement.state ? selectedStates.includes(tenement.state) : false);
        return commodityMatches && stateMatches;
      }),
    [selectedCommodities, selectedStates, tenements],
  );

  const toggleValue = (value: string, current: string[], setValue: (next: string[]) => void) => {
    setValue(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-map">
      <MapCanvas
        mineSites={visibleSites}
        tenements={visibleTenements}
        selectedSite={selectedSite}
        onSelectSite={setSelectedSite}
        onControlsReady={setMapControls}
      />

      <div className="absolute left-[18px] right-[18px] top-[18px] z-20 flex items-center justify-between gap-3">
        <SearchBar />
        <MapControls />
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
        />
      </div>

      <div className="absolute bottom-4 right-[18px] z-20">
        <div className="glass flex flex-col overflow-hidden rounded-xl">
          <button
            type="button"
            onClick={() => mapControls?.zoomIn()}
            className="px-3 py-2 text-xl text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)]"
          >
            +
          </button>
          <div className="h-px w-full bg-[color:var(--border-subtle)]" />
          <button
            type="button"
            onClick={() => mapControls?.zoomOut()}
            className="px-3 py-2 text-xl text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)]"
          >
            -
          </button>
        </div>
      </div>

      <div className="absolute bottom-4 left-[18px] z-20 text-xs text-[color:var(--text-tertiary)]">
        DMIRS · Geoscience Australia · Updated 2h ago
      </div>

      <div className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2">
        <DetailCard site={selectedSite} />
      </div>
    </main>
  );
}
