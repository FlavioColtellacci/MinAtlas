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

  const visibleSites = useMemo(() => mineSites.slice(0, 2000), [mineSites]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-map">
      <MapCanvas
        mineSites={visibleSites}
        tenements={tenements}
        selectedSite={selectedSite}
        onSelectSite={setSelectedSite}
      />

      <div className="absolute left-[18px] right-[18px] top-[18px] z-20 flex items-center justify-between gap-3">
        <SearchBar />
        <MapControls />
      </div>

      <div className="absolute left-[18px] top-[76px] z-20">
        <FilterBar />
      </div>

      <div className="absolute bottom-4 right-[18px] z-20">
        <div className="glass flex flex-col overflow-hidden rounded-xl">
          <button type="button" className="px-3 py-2 text-xl text-[color:var(--text-secondary)]">
            +
          </button>
          <div className="h-px w-full bg-[color:var(--border-subtle)]" />
          <button type="button" className="px-3 py-2 text-xl text-[color:var(--text-secondary)]">
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
