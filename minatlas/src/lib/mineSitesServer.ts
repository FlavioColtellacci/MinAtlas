import { createClient } from "@supabase/supabase-js";
import { fetchAllMineSites } from "@/lib/mineSiteModel";
import type { AppDatabase } from "@/lib/supabase";
import type { MineSite } from "@/types/mining";

function createServerSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createClient<AppDatabase>(supabaseUrl, supabaseAnonKey);
}

export async function getAllMineSitesForSeo(): Promise<MineSite[]> {
  return fetchAllMineSites(createServerSupabase());
}

/** Lowercase URL slug: NFKD, strip diacritics, non-alphanumeric runs → single hyphen. */
export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ensureGloballyUniqueSlugs(
  siteIdToInitialSlug: Map<string, string>,
  sites: MineSite[],
): Map<string, string> {
  const sorted = [...sites].sort((a, b) => a.id.localeCompare(b.id));
  const slugOwner = new Map<string, string>();
  const result = new Map<string, string>();

  for (const site of sorted) {
    let slug = siteIdToInitialSlug.get(site.id);
    if (!slug) slug = "site";

    if (!slugOwner.has(slug)) {
      slugOwner.set(slug, site.id);
      result.set(site.id, slug);
      continue;
    }

    let n = 2;
    let candidate = `${slug}-${n}`;
    while (slugOwner.has(candidate)) {
      n += 1;
      candidate = `${slug}-${n}`;
    }
    slugOwner.set(candidate, site.id);
    result.set(site.id, candidate);
  }

  return result;
}

/**
 * Deterministic canonical slugs: same base name → disambiguate with state, then with numeric suffixes
 * by stable id order; final pass guarantees global uniqueness.
 */
export function buildMineSiteSlugResolution(sites: MineSite[]): MineSiteSlugResolution {
  const sortedSites = [...sites].sort((a, b) => a.id.localeCompare(b.id));
  const byBase = new Map<string, MineSite[]>();

  for (const site of sortedSites) {
    const base = slugify(site.name) || "site";
    if (!byBase.has(base)) byBase.set(base, []);
    byBase.get(base)!.push(site);
  }

  const initial = new Map<string, string>();

  for (const [base, group] of Array.from(byBase.entries())) {
    if (group.length === 1) {
      initial.set(group[0].id, base);
      continue;
    }

    const byIntermediate = new Map<string, MineSite[]>();
    for (const site of group) {
      const statePart = site.state ? slugify(site.state) : "unknown";
      const inter = `${base}-${statePart}`;
      if (!byIntermediate.has(inter)) byIntermediate.set(inter, []);
      byIntermediate.get(inter)!.push(site);
    }

    for (const [inter, g2] of Array.from(byIntermediate.entries())) {
      const g2sorted = [...g2].sort((a, b) => a.id.localeCompare(b.id));
      if (g2sorted.length === 1) {
        initial.set(g2sorted[0].id, inter);
      } else {
        g2sorted.forEach((site, index) => {
          initial.set(site.id, index === 0 ? inter : `${inter}-${index + 1}`);
        });
      }
    }
  }

  const canonicalSlugBySiteId = ensureGloballyUniqueSlugs(initial, sites);

  const siteByCanonicalSlug = new Map<string, MineSite>();
  for (const site of sites) {
    const slug = canonicalSlugBySiteId.get(site.id);
    if (slug) siteByCanonicalSlug.set(slug, site);
  }

  return { canonicalSlugBySiteId, siteByCanonicalSlug };
}

export type MineSiteSlugResolution = {
  canonicalSlugBySiteId: ReadonlyMap<string, string>;
  siteByCanonicalSlug: ReadonlyMap<string, MineSite>;
};

export function mineSiteToCanonicalSlug(site: MineSite, resolution: MineSiteSlugResolution): string {
  return (resolution.canonicalSlugBySiteId.get(site.id) ?? slugify(site.name)) || "site";
}

export async function getSiteBySlug(slug: string): Promise<MineSite | null> {
  const sites = await getAllMineSitesForSeo();
  const resolution = buildMineSiteSlugResolution(sites);
  return resolution.siteByCanonicalSlug.get(slug) ?? null;
}
