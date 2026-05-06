import { createClient } from "@supabase/supabase-js";

type NewsCategory = "australia" | "global" | "relevant";

type BraveNewsResponse = {
  results?: unknown;
};

type MiningNewsRow = {
  title: string;
  url: string;
  description: string | null;
  source_name: string | null;
  source_favicon_url: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  category: NewsCategory;
};

type QueryConfig = {
  category: NewsCategory;
  query: string;
};

type CategoryStats = {
  fetched: number;
  normalized: number;
  upserted: number;
};

type IngestError = {
  scope: NewsCategory | "storage";
  message: string;
};

const BRAVE_NEWS_SEARCH_URL = "https://api.search.brave.com/res/v1/news/search";
const BRAVE_QUERY_COUNT = 20;
const RETENTION_DAYS = 90;
const CATEGORIES: QueryConfig[] = [
  { category: "australia", query: "mining industry Australia" },
  { category: "global", query: "mining industry global" },
  { category: "relevant", query: "Western Australia mining site operator" },
];

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseDateValue(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    // Brave/third-party date fields can be either seconds or milliseconds.
    const millis = value > 1e12 ? value : value * 1000;
    const fromNumber = new Date(millis);
    return Number.isNaN(fromNumber.getTime()) ? null : fromNumber.toISOString();
  }

  if (typeof value === "string") {
    const asDate = new Date(value);
    return Number.isNaN(asDate.getTime()) ? null : asDate.toISOString();
  }

  return null;
}

function getPublishedAt(record: Record<string, unknown>): string | null {
  const directCandidates = ["published", "published_at", "publish_date", "date"] as const;
  for (const key of directCandidates) {
    const parsed = parseDateValue(record[key]);
    if (parsed) return parsed;
  }

  const pageAgeParsed = parseDateValue(record.page_age);
  if (pageAgeParsed) return pageAgeParsed;

  const meta = isRecord(record.meta_url) ? record.meta_url : null;
  const metaCandidates = ["published", "published_at"] as const;
  for (const key of metaCandidates) {
    const parsed = parseDateValue(meta?.[key]);
    if (parsed) return parsed;
  }

  return null;
}

function normalizeBraveNewsItem(item: unknown, category: NewsCategory): MiningNewsRow | null {
  if (!isRecord(item)) return null;

  const title = toTrimmedString(item.title);
  const url = toTrimmedString(item.url);
  if (!title || !url) return null;

  let normalizedUrl: string;
  try {
    normalizedUrl = new URL(url).toString();
  } catch {
    return null;
  }

  const metaUrl = isRecord(item.meta_url) ? item.meta_url : null;
  const source = isRecord(item.source) ? item.source : null;
  const thumbnail = isRecord(item.thumbnail) ? item.thumbnail : null;

  const description = toTrimmedString(item.description);
  const sourceName =
    toTrimmedString(item.source_name) ??
    toTrimmedString(source?.name) ??
    toTrimmedString(metaUrl?.name) ??
    toTrimmedString(metaUrl?.hostname);
  const sourceFaviconUrl =
    toTrimmedString(item.source_favicon_url) ??
    toTrimmedString(source?.favicon) ??
    toTrimmedString(metaUrl?.favicon);
  const thumbnailUrl = toTrimmedString(item.thumbnail_url) ?? toTrimmedString(thumbnail?.src);

  return {
    title,
    url: normalizedUrl,
    description,
    source_name: sourceName,
    source_favicon_url: sourceFaviconUrl,
    thumbnail_url: thumbnailUrl,
    published_at: getPublishedAt(item),
    category,
  };
}

function isAuthorizedCronRequest(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const cronSecret = process.env.CRON_SECRET?.trim();
  const vercelCronHeader = request.headers.get("x-vercel-cron");
  const isVercelCron = vercelCronHeader === "1";

  if (cronSecret) return bearerToken === cronSecret;
  if (process.env.NODE_ENV === "production") return isVercelCron;
  return true;
}

async function fetchBraveCategoryNews(
  config: QueryConfig,
  apiKey: string,
): Promise<{ fetchedCount: number; rows: MiningNewsRow[] }> {
  const url = new URL(BRAVE_NEWS_SEARCH_URL);
  url.searchParams.set("q", config.query);
  url.searchParams.set("count", String(BRAVE_QUERY_COUNT));
  url.searchParams.set("country", "AU");
  url.searchParams.set("freshness", "pd");

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Brave request failed (${response.status} ${response.statusText})`);
  }

  const payload = (await response.json()) as BraveNewsResponse;
  const results = Array.isArray(payload.results) ? payload.results : [];
  const rows = results
    .map((item) => normalizeBraveNewsItem(item, config.category))
    .filter((row): row is MiningNewsRow => row !== null);
  return { fetchedCount: results.length, rows };
}

function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRole) {
    throw new Error(
      "Supabase admin environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(supabaseUrl, supabaseServiceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function emptyCategoryStats(): Record<NewsCategory, CategoryStats> {
  return {
    australia: { fetched: 0, normalized: 0, upserted: 0 },
    global: { fetched: 0, normalized: 0, upserted: 0 },
    relevant: { fetched: 0, normalized: 0, upserted: 0 },
  };
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return Response.json({ error: "Unauthorized cron request" }, { status: 401 });
  }

  const braveApiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!braveApiKey) {
    return Response.json({ error: "Brave Search is not configured" }, { status: 500 });
  }

  const startedAt = Date.now();
  const categoryStats = emptyCategoryStats();
  const errors: IngestError[] = [];

  const perCategoryResults = await Promise.all(
    CATEGORIES.map(async (config) => {
      try {
        const { fetchedCount, rows } = await fetchBraveCategoryNews(config, braveApiKey);
        categoryStats[config.category].fetched = fetchedCount;
        categoryStats[config.category].normalized = rows.length;
        return { category: config.category, rows };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown Brave fetch error";
        errors.push({ scope: config.category, message });
        return { category: config.category, rows: [] as MiningNewsRow[] };
      }
    }),
  );

  const latestByUrl = new Map<string, MiningNewsRow>();
  for (const { rows } of perCategoryResults) {
    for (const row of rows) latestByUrl.set(row.url, row);
  }

  const upsertRows = Array.from(latestByUrl.values());
  let deleted = 0;
  let upserted = 0;
  let upsertSucceeded = false;

  try {
    const supabase = createSupabaseAdminClient();

    if (upsertRows.length > 0) {
      const upsertResult = await supabase.from("mining_news").upsert(upsertRows, {
        onConflict: "url",
      });
      if (upsertResult.error) {
        throw new Error(upsertResult.error.message);
      }
      upserted = upsertRows.length;
      upsertSucceeded = true;
    }

    const now = Date.now();
    const cutoff = new Date(now - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const deleteResult = await supabase.from("mining_news").delete().lt("created_at", cutoff).select("id");

    if (deleteResult.error) {
      throw new Error(deleteResult.error.message);
    }
    deleted = deleteResult.data?.length ?? 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Supabase write failed";
    errors.push({ scope: "storage", message: `Storage error: ${message}` });
  }

  if (upsertSucceeded) {
    for (const row of upsertRows) {
      categoryStats[row.category].upserted += 1;
    }
  }

  const status = errors.length > 0 ? 207 : 200;
  return Response.json(
    {
      ok: errors.length === 0,
      fetched: {
        total: categoryStats.australia.fetched + categoryStats.global.fetched + categoryStats.relevant.fetched,
        byCategory: {
          australia: categoryStats.australia.fetched,
          global: categoryStats.global.fetched,
          relevant: categoryStats.relevant.fetched,
        },
      },
      normalized: {
        total: categoryStats.australia.normalized + categoryStats.global.normalized + categoryStats.relevant.normalized,
        byCategory: {
          australia: categoryStats.australia.normalized,
          global: categoryStats.global.normalized,
          relevant: categoryStats.relevant.normalized,
        },
      },
      upserted: {
        total: upserted,
        byCategory: {
          australia: categoryStats.australia.upserted,
          global: categoryStats.global.upserted,
          relevant: categoryStats.relevant.upserted,
        },
      },
      deleted,
      errors,
      durationMs: Date.now() - startedAt,
    },
    { status },
  );
}
