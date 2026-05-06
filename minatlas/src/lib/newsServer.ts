import { createClient } from "@supabase/supabase-js";

export type NewsCategory = "australia" | "global" | "relevant";

export type NewsArticle = {
  id: string;
  title: string;
  url: string;
  description: string | null;
  sourceName: string | null;
  sourceFaviconUrl: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
  category: NewsCategory;
};

export type NewsData = {
  allArticles: NewsArticle[];
  byCategory: Record<NewsCategory, NewsArticle[]>;
  lastUpdated: string | null;
};

type MiningNewsRow = {
  id: string;
  title: string;
  url: string;
  description: string | null;
  source_name: string | null;
  source_favicon_url: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  created_at: string;
  category: NewsCategory;
};

const NEWS_CATEGORIES: NewsCategory[] = ["australia", "global", "relevant"];
let warnedMissingNewsEnv = false;
let warnedNewsFetchFailure = false;

function getEmptyNewsBuckets(): Record<NewsCategory, NewsArticle[]> {
  return {
    australia: [],
    global: [],
    relevant: [],
  };
}

function toEpochMs(value: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function sortByPublishedFallbackCreatedDesc(a: NewsArticle, b: NewsArticle): number {
  return (
    toEpochMs(b.publishedAt ?? b.createdAt) - toEpochMs(a.publishedAt ?? a.createdAt)
  );
}

function mapRow(row: MiningNewsRow): NewsArticle {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    description: row.description,
    sourceName: row.source_name,
    sourceFaviconUrl: row.source_favicon_url,
    thumbnailUrl: row.thumbnail_url,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    category: row.category,
  };
}

export async function getNewsData(): Promise<NewsData> {
  const emptyData: NewsData = {
    allArticles: [],
    byCategory: getEmptyNewsBuckets(),
    lastUpdated: null,
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (!warnedMissingNewsEnv) {
      warnedMissingNewsEnv = true;
      console.warn(
        "[MinAtlas] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are unset. " +
          "Rendering /news with an empty feed. Add both vars in Vercel Project Settings for build/runtime.",
      );
    }
    return emptyData;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase
      .from("mining_news")
      .select(
        "id,title,url,description,source_name,source_favicon_url,thumbnail_url,published_at,created_at,category",
      );

    if (error) {
      throw new Error(`Failed to load mining news: ${error.message}`);
    }

    const allArticles = ((data ?? []) as MiningNewsRow[])
      .map(mapRow)
      .sort(sortByPublishedFallbackCreatedDesc);

    const byCategory = getEmptyNewsBuckets();
    for (const article of allArticles) {
      byCategory[article.category].push(article);
    }

    let lastUpdated: string | null = null;
    for (const article of allArticles) {
      if (!lastUpdated || toEpochMs(article.createdAt) > toEpochMs(lastUpdated)) {
        lastUpdated = article.createdAt;
      }
    }

    return {
      allArticles,
      byCategory,
      lastUpdated,
    };
  } catch (error) {
    if (!warnedNewsFetchFailure) {
      warnedNewsFetchFailure = true;
      const message = error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `[MinAtlas] Failed to load mining news. Rendering /news with an empty feed. Reason: ${message}`,
      );
    }
    return emptyData;
  }
}

export function isNewsCategory(value: string): value is NewsCategory {
  return NEWS_CATEGORIES.includes(value as NewsCategory);
}
