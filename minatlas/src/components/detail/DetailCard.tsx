"use client";

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
    <article className="glass-card w-[520px] max-w-[calc(100vw-2rem)] rounded-2xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.08em] text-[color:var(--text-secondary)]">
          {getStatusLabel(displaySite.status)} · {displaySite.state ?? "Australia"}
        </p>
        <span className="rounded-full bg-[color:var(--status-active-bg)] px-2.5 py-1 text-xs text-[color:var(--status-active)]">
          {statusPill}
        </span>
      </div>

      <h2 className="font-display text-5xl leading-none text-[color:var(--text-primary)]">{displaySite.name}</h2>
      <p className="mt-2 text-base text-[color:var(--text-secondary)]">
        {displaySite.operator ?? "Unknown operator"} · {locationLabel}
      </p>

      <div className="mt-6 grid grid-cols-4 gap-3 border-t border-[color:var(--border)] pt-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">Production</p>
          <p className="mt-1 font-display text-3xl">{annualProduction}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">Type</p>
          <p className="mt-1 font-ui text-2xl">{productionType}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">Commodity</p>
          <p className="mt-1 font-ui text-2xl">{commodityLabel}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">Roster</p>
          <p className="mt-1 font-display text-3xl">{displaySite.roster ?? "n/a"}</p>
        </div>
      </div>
    </article>
  );
}
