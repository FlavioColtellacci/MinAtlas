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
  const hasSelection = Boolean(site);

  const statusPill = site?.status === "operating" ? "Active" : "Tracked";

  const annualProduction =
    site?.annual_production_oz && site.annual_production_oz > 1000
      ? `${Math.round(site.annual_production_oz / 1000)}k`
      : "n/a";

  const productionType = site?.production_type
    ? site.production_type.replace("_", " ")
    : "Unknown";

  const commodityLabel = site?.commodity && site.commodity.length > 0 ? site.commodity.join(" · ") : "n/a";

  const locationLabel =
    site?.distance_to_perth_km && site.distance_to_perth_km > 0
      ? `${site.distance_to_perth_km}km from ${site.nearest_town ?? "nearest town"}`
      : site?.nearest_town ?? "Location unknown";
  const siteStatusLabel = site ? getStatusLabel(site.status) : null;

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
            {hasSelection ? `${siteStatusLabel} · ${site?.state ?? "Australia"}` : "No site selected"}
          </p>
          <h2 className="mt-1 font-display text-4xl leading-[1.12] text-[color:var(--text-primary)] break-words">
            {hasSelection ? site?.name : "Select a mining site"}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {hasSelection ? (
            <span className="rounded-full bg-[color:var(--status-active-bg)] px-2.5 py-1 text-xs text-[color:var(--status-active)]">
              {statusPill}
            </span>
          ) : null}
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
          {hasSelection
            ? `${site?.operator ?? "Unknown operator"} · ${locationLabel}`
            : "Click any mine marker on the map to view operator, production and commodity details."}
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
            <p className="mt-1 font-display text-2xl">{site?.roster ?? "n/a"}</p>
          </div>
        </div>
      </div>
    </article>
  );
}
