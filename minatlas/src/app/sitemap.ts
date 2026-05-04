import type { MetadataRoute } from "next";
import { buildMineSiteSlugResolution, getCachedMineSitesForSeo } from "@/lib/mineSitesServer";
import { absoluteUrl } from "@/lib/site";

/** Do not prerender at build: Preview builds often lack Supabase env; mine URLs are filled at request time. */
export const dynamic = "force-dynamic";

const routes = [
  {
    path: "/",
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    path: "/map",
    changeFrequency: "daily",
    priority: 0.95,
  },
  {
    path: "/product",
    changeFrequency: "monthly",
    priority: 0.75,
  },
  {
    path: "/data",
    changeFrequency: "weekly",
    priority: 0.7,
  },
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = routes.map((route) => ({
    url: absoluteUrl(route.path),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const sites = await getCachedMineSitesForSeo();
  const resolution = buildMineSiteSlugResolution(sites);
  const slugs = Array.from(resolution.siteByCanonicalSlug.keys()).sort((a, b) =>
    a.localeCompare(b),
  );

  const siteEntries: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: absoluteUrl(`/site/${slug}`),
    changeFrequency: "weekly",
    priority: 0.65,
  }));

  return [...staticEntries, ...siteEntries];
}
