import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildMineSiteSlugResolution, getAllMineSitesForSeo, mineSiteToCanonicalSlug } from "@/lib/mineSitesServer";
import { SITE_NAME, absoluteUrl } from "@/lib/site";
import type { MineSite } from "@/types/mining";

type MineSitePageParams = {
  slug: string;
};

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

export const revalidate = 60 * 60 * 24;
export const dynamicParams = true;

const getMineSiteSeoIndex = cache(async () => {
  const sites = await getAllMineSitesForSeo();
  const resolution = buildMineSiteSlugResolution(sites);
  return { sites, resolution };
});

function toTitleCase(value: string) {
  return value
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function getStatusLabel(site: MineSite) {
  if (site.status === "care_maintenance") return "Care & Maintenance";
  return toTitleCase(site.status);
}

function getProductionTypeLabel(site: MineSite) {
  if (!site.production_type) return null;
  return toTitleCase(site.production_type);
}

function getCommodityLabel(site: MineSite) {
  if (site.commodity.length === 0) return "Not listed";
  return site.commodity.map((code) => COMMODITY_NAMES[code] ?? code).join(", ");
}

function buildMetaDescription(site: MineSite) {
  const status = getStatusLabel(site).toLowerCase();
  const operatorText = site.operator ? `${site.operator} operates` : `${site.name} is`;
  const locationText = site.state ? `in ${site.state}` : "in Australia";
  const commodityText =
    site.commodity.length > 0 ? `Focused on ${getCommodityLabel(site).toLowerCase()}.` : "Commodity mix is not listed.";
  const summary = `${operatorText} the ${status} ${site.name} mine site ${locationText}. ${commodityText}`;
  return summary.slice(0, 160);
}

export async function generateStaticParams(): Promise<MineSitePageParams[]> {
  const { sites, resolution } = await getMineSiteSeoIndex();
  return sites.map((site) => ({
    slug: mineSiteToCanonicalSlug(site, resolution),
  }));
}

export async function generateMetadata({ params }: { params: MineSitePageParams }): Promise<Metadata> {
  const { resolution } = await getMineSiteSeoIndex();
  const site = resolution.siteByCanonicalSlug.get(params.slug);
  if (!site) {
    return {
      title: { absolute: "Mine site not found | MinAtlas" },
      alternates: { canonical: `/site/${params.slug}` },
    };
  }

  const title = `${site.name} mine site · ${site.state ?? "Australia"} | ${SITE_NAME}`;
  const description = buildMetaDescription(site);

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: `/site/${params.slug}`,
    },
    openGraph: {
      title,
      description,
      type: "article",
      url: `/site/${params.slug}`,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function MineSitePage({ params }: { params: MineSitePageParams }) {
  const { resolution } = await getMineSiteSeoIndex();
  const site = resolution.siteByCanonicalSlug.get(params.slug);
  if (!site) notFound();

  const [lng, lat] = site.location.coordinates;
  const statusLabel = getStatusLabel(site);
  const productionTypeLabel = getProductionTypeLabel(site);
  const description = buildMetaDescription(site);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    additionalType: "https://schema.org/Mine",
    name: site.name,
    description,
    url: absoluteUrl(`/site/${params.slug}`),
    geo: {
      "@type": "GeoCoordinates",
      latitude: lat,
      longitude: lng,
    },
    address: {
      "@type": "PostalAddress",
      addressCountry: "AU",
      addressRegion: site.state ?? "Australia",
    },
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-12 md:px-8 md:py-16">
      <article className="glass-card rounded-3xl p-6 md:p-10">
        <p className="text-xs uppercase tracking-[0.08em] text-[color:var(--text-secondary)]">{statusLabel}</p>
        <h1 className="mt-2 font-display text-4xl leading-tight text-[color:var(--text-primary)] md:text-5xl">{site.name}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[color:var(--text-secondary)] md:text-base">{description}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/map?site=${site.id}`}
            className="inline-flex items-center rounded-full bg-[color:var(--status-active-bg)] px-5 py-2.5 text-sm font-medium text-[color:var(--status-active)] transition-opacity hover:opacity-85"
          >
            View on map
          </Link>
        </div>

        <section className="mt-8 grid gap-4 border-t border-[color:var(--border-subtle)] pt-6 md:grid-cols-2">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">Overview</h2>
            <dl className="mt-3 space-y-2 text-sm text-[color:var(--text-secondary)]">
              <div>
                <dt className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">Operator</dt>
                <dd>{site.operator ?? "Not listed"}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">State</dt>
                <dd>{site.state ?? "Australia"}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">Commodities</dt>
                <dd>{getCommodityLabel(site)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">Status</dt>
                <dd>{statusLabel}</dd>
              </div>
            </dl>
          </div>
          <div>
            <h2 className="text-sm font-medium uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">Operations</h2>
            <dl className="mt-3 space-y-2 text-sm text-[color:var(--text-secondary)]">
              <div>
                <dt className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">Production type</dt>
                <dd>{productionTypeLabel ?? "Not listed"}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">Annual production</dt>
                <dd>{site.annual_production_oz ? `${site.annual_production_oz.toLocaleString()} oz` : "Not listed"}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">Roster</dt>
                <dd>{site.roster ?? "Not listed"}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">Location</dt>
                <dd>
                  {site.nearest_town ?? "Nearest town not listed"}
                  {site.distance_to_perth_km ? ` · ${Math.round(site.distance_to_perth_km)} km from Perth` : ""}
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </article>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </main>
  );
}
