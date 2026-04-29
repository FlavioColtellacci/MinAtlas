"use client";

import { useState } from "react";
import { ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import type { MineSite } from "@/types/mining";

interface DetailCardProps {
  site: MineSite | null;
}

function getStatusLabel(status: MineSite["status"]) {
  if (status === "care_maintenance") return "Care & Maintenance";
  return status
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export default function DetailCard({ site }: DetailCardProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const displaySite = site ?? {
    id: "demo-boddington",
    name: "Boddington",
    operator: "Newmont Corporation",
    commodity: ["Au", "Cu"],
    state: "Western Australia",
    status: "operating" as const,
    production_type: "open_cut" as const,
    annual_production_oz: 850000,
    roster: "8/6",
    nearest_town: "Perth",
    distance_to_perth_km: 120,
    location: { coordinates: [116.0, -32.8] as [number, number] },
  };

  const statusPill = displaySite.status === "operating" ? "Active" : "Tracked";

  const annualProduction =
    displaySite.annual_production_oz && displaySite.annual_production_oz > 1000
      ? `${Math.round(displaySite.annual_production_oz / 1000)}k`
      : "n/a";

  const productionType = displaySite.production_type
    ? displaySite.production_type.replace("_", " ")
    : "Unknown";

  const commodityLabel = displaySite.commodity.length > 0 ? displaySite.commodity.join(" · ") : "n/a";

  const locationLabel =
    displaySite.distance_to_perth_km && displaySite.distance_to_perth_km > 0
      ? `${displaySite.distance_to_perth_km}km from ${displaySite.nearest_town ?? "nearest town"}`
      : displaySite.nearest_town ?? "Location unknown";

  return (
    <article
      className={[
        "glass-card max-w-[calc(100vw-2rem)] rounded-2xl transition-all duration-300 ease-out",
        isMinimized ? "w-[340px] p-3" : "w-[440px] p-4",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)]">
            {getStatusLabel(displaySite.status)} · {displaySite.state ?? "Australia"}
          </p>
          <h2 className="mt-1 font-display text-4xl leading-[1.12] text-[color:var(--text-primary)] break-words">
            {displaySite.name}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[color:var(--status-active-bg)] px-2.5 py-1 text-xs text-[color:var(--status-active)]">
            {statusPill}
          </span>
          <button
            type="button"
            onClick={() => setIsMinimized((current) => !current)}
            className="rounded-lg border border-[color:var(--border-subtle)] p-1.5 text-[color:var(--text-secondary)] transition-all duration-200 ease-out hover:border-[color:var(--accent)] hover:text-[color:var(--text-primary)]"
            aria-label={isMinimized ? "Expand detail card" : "Minimize detail card"}
          >
            {isMinimized ? <ChevronsUpDown className="h-4 w-4" /> : <ChevronsDownUp className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div
        className={[
          "overflow-hidden transition-all duration-300 ease-out",
          isMinimized ? "max-h-0 opacity-0" : "mt-2 max-h-72 opacity-100",
        ].join(" ")}
      >
        <p className="text-sm text-[color:var(--text-secondary)]">
          {displaySite.operator ?? "Unknown operator"} · {locationLabel}
        </p>

        <div className="mt-4 grid grid-cols-4 gap-2 border-t border-[color:var(--border)] pt-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">Production</p>
            <p className="mt-1 font-display text-2xl">{annualProduction}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">Type</p>
            <p className="mt-1 font-ui text-xl">{productionType}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">Commodity</p>
            <p className="mt-1 font-ui text-xl">{commodityLabel}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">Roster</p>
            <p className="mt-1 font-display text-2xl">{displaySite.roster ?? "n/a"}</p>
          </div>
        </div>
      </div>
    </article>
  );
}
