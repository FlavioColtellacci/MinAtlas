"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { ChevronsDownUp, ChevronsUpDown, ExternalLink, Search, SlidersHorizontal, Target } from "lucide-react";
import { searchWeb, type BraveResult } from "@/lib/braveSearch";
import type { MineSite, Tenement } from "@/types/mining";

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
  nearbySites?: Array<MineSite & { distanceKm: number }>;
  tenementsAtSite?: Tenement[];
  onSelectNearby?: (site: MineSite) => void;
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

function formatDistanceKm(distanceKm: number) {
  if (!Number.isFinite(distanceKm)) return "Nearby";
  return distanceKm < 10 ? `${distanceKm.toFixed(1)} km` : `${Math.round(distanceKm)} km`;
}

function getTenementTitle(tenement: Tenement) {
  return [tenement.tenement_id ?? "Tenement", tenement.holder, tenement.status].filter(Boolean).join(" / ");
}

function hasNonEmptyTrim(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

/** DMIRS often supplies LGA / shire names in `nearest_town`; those are regions, not settlements. */
function looksLikeGovernmentArea(name: string): boolean {
  const n = name.toUpperCase();
  return /\b(SHIRE|LGA|REGION|TOWN OF|CITY OF|COUNTY|DISTRICT)\b/.test(n);
}

/** `distance_to_perth_km` is always to Perth CBD — never pair it with another label as "km from that label". */
function buildLocationSummary(site: MineSite): string | null {
  const parts: string[] = [];
  if (site.distance_to_perth_km != null && site.distance_to_perth_km > 0) {
    parts.push(`${Math.round(site.distance_to_perth_km)} km from Perth`);
  }
  if (hasNonEmptyTrim(site.nearest_town)) {
    const label = site.nearest_town!.trim();
    parts.push(looksLikeGovernmentArea(label) ? `Region: ${label}` : `Near ${label}`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** Matches plan / SQL: no operator, no town label, no positive distance to Perth. */
function isSparseSummarySite(site: MineSite) {
  return (
    !hasNonEmptyTrim(site.operator) &&
    !hasNonEmptyTrim(site.nearest_town) &&
    !(site.distance_to_perth_km != null && site.distance_to_perth_km > 0)
  );
}

export default function DetailCard({
  site,
  nearbySites = [],
  tenementsAtSite = [],
  onSelectNearby,
  onZoomToSite = () => undefined,
  onGuideClickMarker = () => undefined,
  onGuideSearch = () => undefined,
  onGuideFilters = () => undefined,
}: DetailCardProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [webResults, setWebResults] = useState<BraveResult[]>([]);
  const [isWebSearchLoading, setIsWebSearchLoading] = useState(false);
  const [webSearchError, setWebSearchError] = useState<string | null>(null);
  const [hasWebSearchRun, setHasWebSearchRun] = useState(false);
  const [searchedQuery, setSearchedQuery] = useState<string | null>(null);
  const siteIdRef = useRef<string | null>(site?.id ?? null);
  const hasSelection = Boolean(site);

  useEffect(() => {
    siteIdRef.current = site?.id ?? null;
    setWebResults([]);
    setWebSearchError(null);
    setIsWebSearchLoading(false);
    setHasWebSearchRun(false);
    setSearchedQuery(null);
  }, [site?.id]);

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

  const locationLabel = site ? buildLocationSummary(site) : null;
  const siteStatusLabel = site ? getStatusLabel(site.status) : null;

  const summaryParts = [site?.operator, locationLabel].filter((value): value is string => Boolean(value));
  const summaryText = summaryParts.length > 0 ? summaryParts.join(" · ") : null;

  const isSparseSummary = Boolean(site && isSparseSummarySite(site));
  const sparsePrimaryLine =
    site && isSparseSummary
      ? [siteStatusLabel, site.state ?? null, commodityNames ?? null, productionType].filter(Boolean).join(" · ")
      : null;

  const statItems = [
    annualProduction
      ? { id: "production", label: "Production", value: annualProduction, fontClass: "font-display text-xl md:text-2xl" }
      : null,
    productionType ? { id: "type", label: "Type", value: productionType, fontClass: "font-ui text-lg md:text-xl" } : null,
    commodityLabel ? { id: "commodity", label: "Commodity", value: commodityLabel, fontClass: "font-ui text-lg md:text-xl" } : null,
    rosterLabel ? { id: "roster", label: "Roster", value: rosterLabel, fontClass: "font-display text-xl md:text-2xl" } : null,
  ].filter(Boolean) as Array<{ id: string; label: string; value: ReactNode; fontClass: string }>;

  const statItemsForDisplay =
    isSparseSummary && site
      ? statItems.filter((item) => {
          if (item.id === "commodity" && commodityNames) return false;
          if (item.id === "type" && productionType) return false;
          return true;
        })
      : statItems;

  const statGridColsClass =
    statItemsForDisplay.length >= 4
      ? "grid-cols-2 sm:grid-cols-4"
      : statItemsForDisplay.length === 3
        ? "grid-cols-1 sm:grid-cols-3"
        : statItemsForDisplay.length === 2
          ? "grid-cols-2"
          : "grid-cols-1";
  const nearbySitesPreview = nearbySites.slice(0, 5);
  const tenementPreview = tenementsAtSite.slice(0, 3);
  const showTenementsFirst = nearbySitesPreview.length === 0 && tenementPreview.length > 0;
  const webSearchQuery = site ? [site.name, site.operator, site.state, "mining"].filter(Boolean).join(" ") : "";

  const handleWebSearch = async () => {
    if (!site || isWebSearchLoading) return;

    const selectedSiteId = site.id;
    setIsWebSearchLoading(true);
    setWebSearchError(null);
    setHasWebSearchRun(true);
    setSearchedQuery(webSearchQuery);

    try {
      const results = await searchWeb(webSearchQuery);
      if (siteIdRef.current !== selectedSiteId) return;
      setWebResults(results);
    } catch (error) {
      if (siteIdRef.current !== selectedSiteId) return;
      setWebResults([]);
      setWebSearchError(error instanceof Error ? error.message : "Unable to search the web right now");
    } finally {
      if (siteIdRef.current === selectedSiteId) {
        setIsWebSearchLoading(false);
      }
    }
  };

  const nearbySitesSection = (
    <section className="rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--accent-subtle)] p-2.5">
      <p className="text-xs font-medium text-[color:var(--text-primary)]">Nearby sites</p>
      {nearbySitesPreview.length > 0 ? (
        <div className="mt-2 grid gap-1.5">
          {nearbySitesPreview.map((nearbySite) => (
            <button
              key={nearbySite.id}
              type="button"
              onClick={() => onSelectNearby?.(nearbySite)}
              disabled={!onSelectNearby}
              className="w-full rounded-lg border border-transparent px-2 py-1.5 text-left transition-all duration-150 ease-out enabled:hover:border-[color:var(--accent)] enabled:hover:bg-[color:var(--bg-frosted)] disabled:cursor-default"
            >
              <span className="block truncate text-xs text-[color:var(--text-primary)]">{nearbySite.name}</span>
              <span className="block truncate text-[11px] text-[color:var(--text-tertiary)]">
                {formatDistanceKm(nearbySite.distanceKm)} · {nearbySite.state ?? "Australia"}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-[color:var(--text-tertiary)]">No nearby sites are loaded yet.</p>
      )}
    </section>
  );

  const tenementsSection =
    tenementPreview.length > 0 ? (
      <section>
        <p className="text-xs font-medium text-[color:var(--text-primary)]">Tenement(s) at this point</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tenementPreview.map((tenement) => (
            <span
              key={tenement.id}
              className="rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-frosted)] px-2 py-1 text-[11px] text-[color:var(--text-secondary)]"
            >
              {getTenementTitle(tenement)}
            </span>
          ))}
        </div>
      </section>
    ) : null;

  const webSearchSection = (
    <section className="rounded-xl border border-[color:var(--border-subtle)] p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[color:var(--text-primary)]">Search the web</p>
          {searchedQuery ? (
            <p className="mt-0.5 truncate text-[11px] text-[color:var(--text-tertiary)]">{searchedQuery}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleWebSearch}
          disabled={isWebSearchLoading}
          className="inline-flex min-w-0 max-w-[14rem] shrink items-center gap-1.5 rounded-full bg-[color:var(--status-active-bg)] px-2.5 py-1 text-xs text-[color:var(--status-active)] transition-opacity duration-200 ease-out hover:opacity-85 disabled:cursor-wait disabled:opacity-60"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="truncate">{isWebSearchLoading ? "Searching..." : `Search the web for ${site?.name}`}</span>
        </button>
      </div>

      {webSearchError ? (
        <p className="mt-2 text-xs text-red-400" role="alert">
          {webSearchError}
        </p>
      ) : null}

      {hasWebSearchRun && !isWebSearchLoading && !webSearchError ? (
        webResults.length > 0 ? (
          <div className="mt-2 space-y-1.5">
            {webResults.map((result) => (
              <a
                key={result.url}
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-transparent px-2 py-1.5 transition-all duration-150 ease-out hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-subtle)]"
              >
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-xs text-[color:var(--text-primary)]">{result.title}</span>
                  <ExternalLink className="h-3 w-3 shrink-0 text-[color:var(--text-tertiary)]" />
                </span>
                {result.description ? (
                  <span className="mt-0.5 block truncate text-[11px] text-[color:var(--text-tertiary)]">{result.description}</span>
                ) : null}
              </a>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-[color:var(--text-tertiary)]">No web results found for this site.</p>
        )
      ) : null}

      {hasWebSearchRun ? (
        <p className="mt-2 text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
          Web results are not verified by MinAtlas.
        </p>
      ) : null}
    </section>
  );

  const statsSection =
    statItemsForDisplay.length > 0 ? (
      <div className={`mt-4 grid gap-2 border-t border-[color:var(--border)] pt-3 ${statGridColsClass}`}>
        {statItemsForDisplay.map((item) => (
          <div key={item.id}>
            <p className="text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">{item.label}</p>
            <p className={`mt-1 ${item.fontClass}`}>{item.value}</p>
          </div>
        ))}
      </div>
    ) : null;

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
          "transition-all duration-300 ease-out",
          isMinimized
            ? "max-h-0 overflow-hidden opacity-0"
            : hasSelection
              ? "premium-scrollbar mt-2 max-h-[min(70vh,38rem)] overflow-y-auto pr-1 opacity-100 max-md:mt-2 max-md:min-h-0 max-md:max-h-none max-md:flex-1 max-md:overscroll-y-contain max-md:pb-1 max-md:pr-0 max-md:touch-pan-y"
              : "mt-1.5 max-h-72 overflow-y-auto opacity-100 max-md:mt-1 max-md:min-h-0 max-md:max-h-none max-md:flex-1 max-md:overscroll-y-contain max-md:pb-1 max-md:touch-pan-y",
        ].join(" ")}
      >
        {hasSelection ? (
          <>
            {isSparseSummary ? (
              <>
                <div className="space-y-2">
                  <p className="text-sm font-medium leading-snug text-[color:var(--text-primary)]">{sparsePrimaryLine}</p>
                  <p className="text-xs leading-relaxed text-[color:var(--text-secondary)]">
                    We do not yet list an operator or a Perth-distance line for this pin in our public snapshot. Nearby mines
                    and tenements use the same map layers loaded here; web search can add third-party context when you need
                    more detail.
                  </p>
                </div>

                <div className="mt-4 space-y-3 border-t border-[color:var(--border)] pt-3">
                  <p className="text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">Nearby context</p>
                  {showTenementsFirst ? (
                    <>
                      {tenementsSection}
                      {nearbySitesSection}
                    </>
                  ) : (
                    <>
                      {nearbySitesSection}
                      {tenementsSection}
                    </>
                  )}
                </div>

                {statsSection}

                <div className="mt-4 space-y-3 border-t border-[color:var(--border)] pt-3">{webSearchSection}</div>
              </>
            ) : (
              <>
                <p className="text-sm text-[color:var(--text-secondary)]">{summaryText}</p>

                {statsSection}

                <div className="mt-4 space-y-3 border-t border-[color:var(--border)] pt-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">Context</p>
                    <p className="mt-1 text-xs text-[color:var(--text-secondary)]">
                      Nearby map data and an optional web lookup for this site.
                    </p>
                  </div>

                  {nearbySitesSection}
                  {tenementsSection}
                  {webSearchSection}
                </div>
              </>
            )}
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
