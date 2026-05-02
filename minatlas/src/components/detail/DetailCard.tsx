"use client";

import { type ReactNode, useState } from "react";
import { ChevronsDownUp, ChevronsUpDown, Search, SlidersHorizontal, Target } from "lucide-react";
import type { MineSite } from "@/types/mining";

const COMMODITY_NAMES: Record<string, string> = {
  AG: "Silver",
  AU: "Gold",
  BI: "Bismuth",
  CO: "Cobalt",
  CU: "Copper",
  LI: "Lithium",
  NI: "Nickel",
  PB: "Lead",
  SB: "Antimony",
  ZN: "Zinc",
};

interface DetailCardProps {
  site: MineSite | null;
  onZoomToSite?: () => void;
  onGuideClickMarker?: () => void;
  onGuideSearch?: () => void;
  onGuideFilters?: () => void;
}

function getStatusLabel(status: MineSite["status"]) {
  if (status === "care_maintenance") return "Care & Maintenance";
  return status
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export default function DetailCard({
  site,
  onZoomToSite = () => undefined,
  onGuideClickMarker = () => undefined,
  onGuideSearch = () => undefined,
  onGuideFilters = () => undefined,
}: DetailCardProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const hasSelection = Boolean(site);

  const statusPill = site?.status === "operating" ? "Active" : "Tracked";

  const annualProduction =
    site?.annual_production_oz && site.annual_production_oz > 0
      ? site.annual_production_oz >= 1_000_000
        ? `${(site.annual_production_oz / 1_000_000).toFixed(1)}M oz`
        : site.annual_production_oz >= 1_000
          ? `${Math.round(site.annual_production_oz / 1000)}k oz`
          : `${Math.round(site.annual_production_oz)} oz`
      : null;

  const productionType = site?.production_type ? site.production_type.replace("_", " ") : null;
  const commodityCodes = site?.commodity && site.commodity.length > 0 ? site.commodity.join(" · ") : null;
  const commodityNames =
    site?.commodity && site.commodity.length > 0
      ? site.commodity.map((code) => COMMODITY_NAMES[code] ?? code).join(", ")
      : null;
  const commodityLabel = commodityCodes ? (
    <span className="inline-flex flex-wrap items-baseline gap-1">
      <span>{commodityCodes}</span>
      {commodityNames ? (
        <span className="text-xs text-[color:var(--text-secondary)] md:text-sm">({commodityNames})</span>
      ) : null}
    </span>
  ) : null;
  const rosterLabel = site?.roster ?? null;

  const locationLabel =
    site?.distance_to_perth_km && site.distance_to_perth_km > 0
      ? `${site.distance_to_perth_km}km from ${site.nearest_town ?? "nearest town"}`
      : site?.nearest_town ?? null;
  const siteStatusLabel = site ? getStatusLabel(site.status) : null;

  const summaryParts = [site?.operator, locationLabel].filter((value): value is string => Boolean(value));
  const summaryText = summaryParts.length > 0 ? summaryParts.join(" · ") : "Limited public metadata for this site";

  const statItems = [
    annualProduction
      ? { id: "production", label: "Production", value: annualProduction, fontClass: "font-display text-xl md:text-2xl" }
      : null,
    productionType ? { id: "type", label: "Type", value: productionType, fontClass: "font-ui text-lg md:text-xl" } : null,
    commodityLabel ? { id: "commodity", label: "Commodity", value: commodityLabel, fontClass: "font-ui text-lg md:text-xl" } : null,
    rosterLabel ? { id: "roster", label: "Roster", value: rosterLabel, fontClass: "font-display text-xl md:text-2xl" } : null,
  ].filter(Boolean) as Array<{ id: string; label: string; value: ReactNode; fontClass: string }>;

  const statGridColsClass =
    statItems.length >= 4
      ? "grid-cols-2 sm:grid-cols-4"
      : statItems.length === 3
        ? "grid-cols-1 sm:grid-cols-3"
        : statItems.length === 2
          ? "grid-cols-2"
          : "grid-cols-1";

  return (
    <article
      className={[
        "glass-card max-w-[calc(100vw-2rem)] rounded-2xl transition-all duration-300 ease-out",
        "max-md:flex max-md:min-h-0 max-md:w-full max-md:max-w-none max-md:flex-col max-md:overflow-hidden max-md:rounded-2xl",
        "max-md:max-h-[min(58dvh,calc(100svh-11.5rem-env(safe-area-inset-bottom,0px)))]",
        isMinimized
          ? "w-[340px] p-3 max-md:p-2.5"
          : hasSelection
            ? "w-[440px] p-4 max-md:rounded-xl max-md:p-3"
            : "w-[460px] p-3.5 max-md:rounded-xl max-md:p-2.5",
      ].join(" ")}
    >
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)]">
            {hasSelection ? `${siteStatusLabel} · ${site?.state ?? "Australia"}` : "No site selected"}
          </p>
          <h2 className="mt-0.5 break-words font-display text-2xl leading-tight text-[color:var(--text-primary)] md:mt-1 md:text-4xl md:leading-[1.12]">
            {hasSelection ? site?.name : "Select a mining site"}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {hasSelection ? (
            <div className="flex flex-col items-end gap-1.5">
              <span className="rounded-full bg-[color:var(--status-active-bg)] px-2.5 py-1 text-xs text-[color:var(--status-active)]">
                {statusPill}
              </span>
              <button
                type="button"
                onClick={onZoomToSite}
                className="whitespace-nowrap rounded-full bg-[color:var(--status-active-bg)] px-2.5 py-1 text-xs text-[color:var(--status-active)] transition-opacity duration-200 ease-out hover:opacity-85"
              >
                Zoom to site
              </button>
            </div>
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
          isMinimized
            ? "max-h-0 opacity-0"
            : hasSelection
              ? "mt-2 max-h-72 opacity-100 max-md:mt-2 max-md:min-h-0 max-md:max-h-none max-md:flex-1 max-md:overflow-y-auto max-md:overscroll-y-contain max-md:pb-1 max-md:touch-pan-y"
              : "mt-1.5 max-h-72 opacity-100 max-md:mt-1 max-md:min-h-0 max-md:max-h-none max-md:flex-1 max-md:overflow-y-auto max-md:overscroll-y-contain max-md:pb-1 max-md:touch-pan-y",
        ].join(" ")}
      >
        {hasSelection ? (
          <>
            <p className="text-sm text-[color:var(--text-secondary)]">{summaryText}</p>

            {statItems.length > 0 ? (
              <div className={`mt-4 grid gap-2 border-t border-[color:var(--border)] pt-3 ${statGridColsClass}`}>
                {statItems.map((item) => (
                  <div key={item.id}>
                    <p className="text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">{item.label}</p>
                    <p className={`mt-1 ${item.fontClass}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {statItems.length < 2 ? (
              <p className="mt-3 border-t border-[color:var(--border)] pt-3 text-xs text-[color:var(--text-tertiary)]">
                Limited public data is currently available for this site. Core map location and status remain available.
              </p>
            ) : null}
          </>
        ) : (
          <div className="space-y-2 max-md:space-y-1.5">
            <p className="text-xs text-[color:var(--text-secondary)] max-md:leading-snug md:text-sm">
              Pick a mine to see operator, commodity mix, production profile and quick actions.
            </p>
            <div className="grid gap-1 border-t border-[color:var(--border)] pt-2 max-md:gap-1 max-md:pt-1.5 md:gap-1.5 md:pt-2.5">
              <button
                type="button"
                onClick={onGuideClickMarker}
                className="flex w-full items-center gap-2 rounded-lg border border-transparent bg-[color:var(--accent-subtle)] px-2 py-1.5 text-left text-[11px] text-[color:var(--text-secondary)] transition-all duration-200 ease-out hover:border-[color:var(--accent)] hover:text-[color:var(--text-primary)] md:px-2.5 md:text-xs"
              >
                <Target className="h-3.5 w-3.5 text-[color:var(--accent)]" />
                Click any marker directly on the map
              </button>
              <button
                type="button"
                onClick={onGuideSearch}
                className="flex w-full items-center gap-2 rounded-lg border border-transparent bg-[color:var(--accent-subtle)] px-2 py-1.5 text-left text-[11px] text-[color:var(--text-secondary)] transition-all duration-200 ease-out hover:border-[color:var(--accent)] hover:text-[color:var(--text-primary)] md:px-2.5 md:text-xs"
              >
                <Search className="h-3.5 w-3.5 text-[color:var(--accent)]" />
                Search by site name, operator, town or state
              </button>
              <button
                type="button"
                onClick={onGuideFilters}
                className="flex w-full items-center gap-2 rounded-lg border border-transparent bg-[color:var(--accent-subtle)] px-2 py-1.5 text-left text-[11px] text-[color:var(--text-secondary)] transition-all duration-200 ease-out hover:border-[color:var(--accent)] hover:text-[color:var(--text-primary)] md:px-2.5 md:text-xs"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-[color:var(--accent)]" />
                Refine results with Status, State and Commodity filters
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
