type BraveWebResult = {
  title?: unknown;
  url?: unknown;
  description?: unknown;
  age?: unknown;
};

type BraveSearchResponse = {
  web?: {
    results?: BraveWebResult[];
  };
};

type SlimBraveResult = {
  title: string;
  url: string;
  description: string;
  age?: string;
};

type CacheEntry = {
  expiresAt: number;
  results: SlimBraveResult[];
};

const BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search";
const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 50;
const cache = new Map<string, CacheEntry>();

const successHeaders = {
  "Cache-Control": "private, max-age=3600",
};

export const dynamic = "force-dynamic";

function getCachedResults(key: string): SlimBraveResult[] | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  cache.delete(key);
  cache.set(key, entry);
  return entry.results;
}

function setCachedResults(key: string, results: SlimBraveResult[]) {
  cache.set(key, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    results,
  });

  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (!oldestKey) break;
    cache.delete(oldestKey);
  }
}

function normalizeResult(result: BraveWebResult): SlimBraveResult | null {
  const title = typeof result.title === "string" ? result.title.trim() : "";
  const url = typeof result.url === "string" ? result.url.trim() : "";
  const description =
    typeof result.description === "string" ? result.description.trim() : "";
  const age = typeof result.age === "string" ? result.age.trim() : undefined;

  if (!title || !url) return null;

  return {
    title,
    url,
    description,
    ...(age ? { age } : {}),
  };
}

const DEFAULT_RESULT_COUNT = 5;
const MAX_RESULT_COUNT = 20;

function getValidatedResultCount(searchParams: URLSearchParams): number {
  const raw = searchParams.get("count");
  if (raw == null || raw === "") return DEFAULT_RESULT_COUNT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1 || n > MAX_RESULT_COUNT) return DEFAULT_RESULT_COUNT;
  return n;
}

function getValidatedQuery(request: Request): string | Response {
  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get("q");
  const query = rawQuery?.trim() ?? "";

  if (!query) {
    return Response.json(
      { error: "Missing required query parameter: q" },
      { status: 400 },
    );
  }

  if (query.length > 200) {
    return Response.json(
      { error: "Query must be 200 characters or less" },
      { status: 400 },
    );
  }

  return query;
}

export async function GET(request: Request) {
  const validatedQuery = getValidatedQuery(request);
  if (validatedQuery instanceof Response) return validatedQuery;

  const { searchParams } = new URL(request.url);
  const resultCount = getValidatedResultCount(searchParams);

  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Brave Search is not configured" },
      { status: 500 },
    );
  }

  const cacheKey = `${validatedQuery.toLowerCase()}\0${resultCount}`;
  const cachedResults = getCachedResults(cacheKey);
  if (cachedResults) {
    return Response.json({ results: cachedResults }, { headers: successHeaders });
  }

  const url = new URL(BRAVE_SEARCH_URL);
  url.searchParams.set("q", validatedQuery);
  url.searchParams.set("count", String(resultCount));

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": apiKey,
      },
    });

    if (!response.ok) {
      console.error("Brave Search request failed", {
        status: response.status,
        statusText: response.statusText,
      });
      return Response.json(
        { error: "Brave Search request failed" },
        { status: 502 },
      );
    }

    const data = (await response.json()) as BraveSearchResponse;
    const results = (data.web?.results ?? [])
      .map(normalizeResult)
      .filter((result): result is SlimBraveResult => result !== null)
      .slice(0, resultCount);

    setCachedResults(cacheKey, results);

    return Response.json({ results }, { headers: successHeaders });
  } catch (error) {
    console.error("Brave Search proxy error", error);
    return Response.json(
      { error: "Unable to search the web right now" },
      { status: 502 },
    );
  }
}
