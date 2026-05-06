"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { ChevronsDownUp, ChevronsUpDown, ExternalLink, Globe, Loader2, Search, SlidersHorizontal, Target } from "lucide-react";
import { fetchApiSummary, type BraveResult } from "@/lib/braveSearch";
import { plainWebText } from "@/lib/webText";
import type { MineSite, Tenement } from "@/types/mining";

type ApiSummaryCacheEntry = {
  sources: BraveResult[];
};

/** Session cache: one live summary request per site name + known operator (search query differs). */
const apiSummaryCache = new Map<string, ApiSummaryCacheEntry>();

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

function isAiLiveSummaryStatus(status: MineSite["status"]): boolean {
  return status === "operating" || status === "care_maintenance";
}

function BraveInlineResults({ results }: { results: BraveResult[] }) {
  if (results.length === 0) return null;
  return (
    <div className="mt-2 space-y-1.5">
      {results.map((result) => (
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
            <span className="mt-0.5 block line-clamp-2 text-[11px] leading-snug text-[color:var(--text-tertiary)]">
              {plainWebText(result.description)}
            </span>
          ) : null}
        </a>
      ))}
    </div>
  );
}

function SkeletonShimmerLine({ className, delayMs }: { className: string; delayMs: number }) {
  return (
    <div
      className={[
        "relative h-2.5 overflow-hidden rounded-full border border-[color:var(--border-subtle)]/40 bg-[color:var(--muted)]",
        "shadow-[inset_0_1px_1px_rgba(255,255,255,0.35)]",
        className,
      ].join(" ")}
      aria-hidden
    >
      <div
        className="absolute inset-y-0 left-0 w-[min(55%,8rem)] rounded-full bg-gradient-to-r from-transparent via-[color:var(--status-active)]/35 to-transparent blur-[0.5px] animate-detail-skeleton-sheen will-change-transform"
        style={{ animationDelay: `${delayMs}ms` }}
      />
    </div>
  );
}

function ApiSummarySkeleton() {
  return (
    <div className="mt-2.5 space-y-3" aria-busy="true" aria-live="polite">
      <div className="rounded-lg border border-[color:var(--border-subtle)]/50 bg-[color:var(--bg-frosted)]/50 p-2.5 shadow-sm backdrop-blur-[2px]">
        <div className="space-y-2">
          <SkeletonShimmerLine className="w-full" delayMs={0} />
          <SkeletonShimmerLine className="w-[92%]" delayMs={140} />
          <SkeletonShimmerLine className="w-[68%]" delayMs={280} />
        </div>
      </div>
      <div className="space-y-1.5 rounded-lg border border-[color:var(--border-subtle)]/35 bg-[color:var(--muted)]/30 p-2 pl-2.5">
        <SkeletonShimmerLine className="h-2 w-[78%]" delayMs={60} />
        <SkeletonShimmerLine className="h-2 w-[64%]" delayMs={200} />
        <SkeletonShimmerLine className="h-2 w-[48%]" delayMs={340} />
      </div>
    </div>
  );
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
  const [publicRecordsRan, setPublicRecordsRan] = useState(false);
  const [apiSummaryResults, setApiSummaryResults] = useState<BraveResult[]>([]);
  const [apiSummaryLoading, setApiSummaryLoading] = useState(false);
  const [apiSummaryError, setApiSummaryError] = useState<string | null>(null);
  const [apiSummaryRan, setApiSummaryRan] = useState(false);
  const siteIdRef = useRef<string | null>(site?.id ?? null);
  const hasSelection = Boolean(site);

  useEffect(() => {
    siteIdRef.current = site?.id ?? null;
    setPublicRecordsRan(false);
    setApiSummaryResults([]);
    setApiSummaryError(null);
    setApiSummaryLoading(false);
    setApiSummaryRan(false);
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
  const geoAdminSection =
    site && (hasNonEmptyTrim(site.lga) || hasNonEmptyTrim(site.district) || hasNonEmptyTrim(site.tectonic_unit)) ? (
      <div className="mt-4 border-t border-[color:var(--border)] pt-3">
        <p className="text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">Region and geology</p>
        <dl className="mt-2 space-y-1.5 text-xs text-[color:var(--text-secondary)]">
          {hasNonEmptyTrim(site.lga) ? (
            <div>
              <dt className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">LGA</dt>
              <dd>{site.lga!.trim()}</dd>
            </div>
          ) : null}
          {hasNonEmptyTrim(site.district) ? (
            <div>
              <dt className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">District</dt>
              <dd>{site.district!.trim()}</dd>
            </div>
          ) : null}
          {hasNonEmptyTrim(site.tectonic_unit) ? (
            <div>
              <dt className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">Tectonic unit</dt>
              <dd>{site.tectonic_unit!.trim()}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    ) : null;

  const nearbySitesPreview = nearbySites.slice(0, 5);
  const tenementPreview = tenementsAtSite.slice(0, 3);
  const showTenementsFirst = nearbySitesPreview.length === 0 && tenementPreview.length > 0;
  const isAiSummarySite = Boolean(site && isAiLiveSummaryStatus(site.status));
  const isPublicRecordsSite = Boolean(site);

  const handleApiSummarySearch = async (options?: { bypassCache?: boolean }) => {
    if (!site || apiSummaryLoading) return;
    const nameKey = site.name.trim();
    if (!nameKey) return;

    const selectedSiteId = site.id;
    setApiSummaryLoading(true);
    setApiSummaryError(null);
    setApiSummaryRan(true);

    const cacheKey = `${nameKey}\0${hasNonEmptyTrim(site.operator) ? site.operator!.trim() : ""}`;
    if (options?.bypassCache) {
      apiSummaryCache.delete(cacheKey);
    }

    try {
      let cachedEntry = options?.bypassCache ? undefined : apiSummaryCache.get(cacheKey);
      if (!cachedEntry) {
        cachedEntry = await fetchApiSummary(nameKey, {
          operator: hasNonEmptyTrim(site.operator) ? site.operator!.trim() : null,
        });
        apiSummaryCache.set(cacheKey, cachedEntry);
      }
      if (siteIdRef.current !== selectedSiteId) return;
      setApiSummaryResults(cachedEntry.sources);
    } catch (error) {
      if (siteIdRef.current !== selectedSiteId) return;
      setApiSummaryResults([]);
      setApiSummaryError(error instanceof Error ? error.message : "Unable to load live sources right now");
    } finally {
      if (siteIdRef.current === selectedSiteId) {
        setApiSummaryLoading(false);
      }
    }
  };

  const hideLiveSummaryPromo = apiSummaryRan && !apiSummaryError && apiSummaryResults.length > 0;

  const liveSummaryShellClass = hideLiveSummaryPromo
    ? "rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-frosted)]/55 px-2.5 py-2"
    : "rounded-xl border border-[color:var(--border-subtle)] bg-gradient-to-b from-[color:var(--accent-subtle)]/80 to-[color:var(--bg-frosted)]/50 px-3 py-2.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]";

  const operatorLiveSection = site ? (
    isPublicRecordsSite ? (
      <div className="rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-frosted)]/55 px-2.5 py-2">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-frosted)]/60 text-[color:var(--accent)]">
            <Search className="h-3.5 w-3.5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--text-primary)]">
              Public records
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-[color:var(--text-secondary)]">
              Search external public records for additional context about this prospect.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setPublicRecordsRan(true)}
          disabled={!site.name?.trim()}
          title="Show a web search link for this site (opens Google in a new tab)"
          aria-label="Show web search for this mining site"
          className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--accent)]/25 bg-[color:var(--accent-subtle)] px-3 py-2 text-xs font-semibold text-[color:var(--accent)] shadow-sm transition-[box-shadow,opacity,transform] duration-200 ease-out hover:border-[color:var(--accent)]/40 hover:shadow-md hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:shadow-sm"
        >
          <Search className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
          Search public records
        </button>
        {publicRecordsRan ? (
          <div className="mt-2.5 space-y-2.5">
            <p className="rounded-md bg-[color:var(--accent-subtle)]/45 px-2.5 py-2 text-xs leading-relaxed text-[color:var(--text-primary)]">
              Public records help add external context for this site. Results can vary by operator activity, reporting
              quality, and recent news coverage.
            </p>
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(`${site.name} Western Australia`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[color:var(--accent)]/35 bg-[color:var(--bg-frosted)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--text-primary)] transition-colors duration-150 hover:bg-[color:var(--accent-subtle)]"
            >
              <span>Search the web</span>
              <ExternalLink className="h-3 w-3 shrink-0 text-[color:var(--text-tertiary)]" />
            </a>
          </div>
        ) : null}
      </div>
    ) : isAiSummarySite ? (
      <div className={liveSummaryShellClass}>
        {!hideLiveSummaryPromo ? (
          <>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-frosted)]/60 text-[color:var(--accent)]">
                <Globe className="h-3.5 w-3.5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--text-primary)]">
                  Live sources
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-[color:var(--text-secondary)]">
                  Top web search results for this site — open any link to read the source page.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleApiSummarySearch()}
              disabled={apiSummaryLoading || !site.name?.trim()}
              title="Search the web for this site and show the top results"
              aria-label="Search the web for this mining site and show the top results"
              className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--status-active)]/25 bg-[color:var(--status-active-bg)] px-3 py-2 text-xs font-semibold text-[color:var(--status-active)] shadow-sm transition-[box-shadow,opacity,transform] duration-200 ease-out hover:border-[color:var(--status-active)]/40 hover:shadow-md hover:opacity-95 active:scale-[0.99] disabled:cursor-wait disabled:opacity-90 disabled:hover:shadow-sm"
            >
              {apiSummaryLoading ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              ) : (
                <Globe className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
              )}
              {apiSummaryLoading ? "Loading…" : "Search live sources"}
            </button>
          </>
        ) : null}

        {apiSummaryError ? (
          <p className={`text-xs text-red-400 ${hideLiveSummaryPromo ? "mt-0" : "mt-2"}`} role="alert">
            {apiSummaryError}
          </p>
        ) : null}

        {apiSummaryLoading && !hideLiveSummaryPromo ? (
          <div className="mt-2.5">
            <p className="mb-2 flex items-center gap-2 text-[11px] font-medium text-[color:var(--text-secondary)]">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--status-active)] opacity-35" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[color:var(--status-active)] shadow-[0_0_6px_rgba(61,158,95,0.45)]" />
              </span>
              <span className="text-[color:var(--status-active)]">Fetching live sources</span>
              <span className="text-[color:var(--text-tertiary)]">…</span>
            </p>
            <ApiSummarySkeleton />
          </div>
        ) : null}

        {hideLiveSummaryPromo && !apiSummaryError ? (
          <>
            {apiSummaryLoading ? (
              <p className="mb-2 flex items-center gap-2 text-[11px] font-medium text-[color:var(--text-secondary)]">
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[color:var(--status-active)]" aria-hidden />
                <span>Refreshing live sources…</span>
              </p>
            ) : null}
            <div
              className={
                apiSummaryLoading
                  ? "pointer-events-none opacity-[0.52] transition-opacity duration-200"
                  : undefined
              }
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--text-primary)]">
                Live sources
              </p>
              <BraveInlineResults results={apiSummaryResults} />
            </div>
            {!apiSummaryLoading ? (
              <div className="mt-2 space-y-1.5">
                <button
                  type="button"
                  onClick={() => void handleApiSummarySearch({ bypassCache: true })}
                  disabled={!site.name?.trim()}
                  className="text-[11px] font-medium text-[color:var(--status-active)] underline decoration-[color:var(--status-active)]/30 underline-offset-2 transition-opacity duration-150 hover:opacity-80"
                >
                  Refresh live sources
                </button>
                <p className="text-[10px] tracking-[0.06em] text-[color:var(--text-tertiary)]">
                  LIVE SUMMARIES AND LINKS ARE NOT VERIFIED BY MINATLAS
                </p>
              </div>
            ) : null}
          </>
        ) : null}

        {apiSummaryRan && !apiSummaryLoading && !apiSummaryError && !hideLiveSummaryPromo ? (
          <p className="mt-2 text-xs text-[color:var(--text-tertiary)]">No web results for this search.</p>
        ) : null}
      </div>
    ) : null
  ) : null;

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
                  {operatorLiveSection}
                  <p className="text-xs leading-relaxed text-[color:var(--text-secondary)]">
                    We do not yet list an operator or a Perth-distance line for this pin in our public snapshot. Nearby mines
                    and tenements use the same map layers loaded here; live sources below can add third-party context when you
                    need more detail.
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

                {geoAdminSection}
              </>
            ) : (
              <>
                <div className="space-y-2">
                  {site && hasNonEmptyTrim(site.operator) ? (
                    <p className="text-sm text-[color:var(--text-secondary)]">{summaryText}</p>
                  ) : locationLabel ? (
                    <p className="text-sm text-[color:var(--text-secondary)]">{locationLabel}</p>
                  ) : null}
                  {operatorLiveSection}
                </div>

                {statsSection}

                {geoAdminSection}

                <div className="mt-4 space-y-3 border-t border-[color:var(--border)] pt-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">Context</p>
                    <p className="mt-1 text-xs text-[color:var(--text-secondary)]">
                      Nearby map data and optional live summary from the web.
                    </p>
                  </div>

                  {nearbySitesSection}
                  {tenementsSection}
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
