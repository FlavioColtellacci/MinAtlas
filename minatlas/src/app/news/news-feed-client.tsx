"use client";

import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";
import type { NewsArticle, NewsCategory, NewsData } from "@/lib/newsServer";

const CATEGORY_LABELS: Record<NewsCategory, string> = {
  australia: "Australia",
  global: "Global",
  relevant: "Relevant",
};

const TAB_ORDER: NewsCategory[] = ["australia", "global", "relevant"];

function formatRelativeTime(value: string | null): string {
  if (!value) return "Recently added";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Recently added";

  const diffMs = parsed.getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 1000 * 60 * 60 * 24 * 365],
    ["month", 1000 * 60 * 60 * 24 * 30],
    ["week", 1000 * 60 * 60 * 24 * 7],
    ["day", 1000 * 60 * 60 * 24],
    ["hour", 1000 * 60 * 60],
    ["minute", 1000 * 60],
  ];

  for (const [unit, msInUnit] of units) {
    if (absMs >= msInUnit) {
      return rtf.format(Math.round(diffMs / msInUnit), unit);
    }
  }

  return "Just now";
}

function NewsCard({ article }: { article: NewsArticle }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [faviconFailed, setFaviconFailed] = useState(false);
  const articleTime = article.publishedAt ?? article.createdAt;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--glass)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(184,125,69,0.42)] hover:shadow-[0_18px_60px_rgba(0,0,0,0.34),0_0_30px_rgba(184,125,69,0.2)]">
      <div className="relative h-44 w-full overflow-hidden border-b border-[var(--border)] bg-[radial-gradient(circle_at_38%_20%,rgba(184,125,69,0.2),transparent_40%),linear-gradient(135deg,#121015,#07050a)]">
        {article.thumbnailUrl && !imageFailed ? (
          <img
            src={article.thumbnailUrl}
            alt={article.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-5 text-center">
            <p className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-[rgba(255,253,250,0.56)]">
              No image available
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {article.sourceFaviconUrl && !faviconFailed ? (
              <img
                src={article.sourceFaviconUrl}
                alt=""
                aria-hidden
                className="h-4 w-4 shrink-0 rounded-sm border border-[var(--border)] object-cover"
                loading="lazy"
                onError={() => setFaviconFailed(true)}
              />
            ) : (
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--accent)]"
                aria-hidden
              />
            )}
            <p className="truncate font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[rgba(255,253,250,0.6)]">
              {article.sourceName ?? "Unknown source"}
            </p>
          </div>
          <time className="shrink-0 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[rgba(255,253,250,0.48)]">
            {formatRelativeTime(articleTime)}
          </time>
        </div>

        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group/link inline-flex items-start gap-2 text-left"
        >
          <h3 className="font-display text-[1.75rem] leading-[1.08] tracking-[-0.03em] text-[rgba(255,253,250,0.94)] transition-colors duration-300 group-hover/link:text-white">
            {article.title}
          </h3>
          <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-[var(--accent)] opacity-80 transition-all duration-300 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 group-hover/link:opacity-100" />
        </a>

        {article.description ? (
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">{article.description}</p>
        ) : (
          <p className="mt-4 text-sm leading-7 text-[rgba(255,253,250,0.35)]">
            No snippet available for this article.
          </p>
        )}
      </div>
    </article>
  );
}

export function NewsFeedClient({ newsData }: { newsData: NewsData }) {
  const [activeCategory, setActiveCategory] = useState<NewsCategory>("australia");

  const articles = useMemo(
    () => newsData.byCategory[activeCategory] ?? [],
    [activeCategory, newsData.byCategory],
  );

  return (
    <div className="space-y-7">
      <div className="sticky top-[4.6rem] z-30 -mx-2 rounded-2xl border border-[var(--border)] bg-[rgba(7,5,10,0.76)] px-2 py-2 backdrop-blur-2xl sm:mx-0">
        <div className="flex gap-2 overflow-x-auto">
          {TAB_ORDER.map((category) => {
            const isActive = category === activeCategory;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={cn(
                  "whitespace-nowrap rounded-full border px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] transition-all duration-300",
                  isActive
                    ? "border-[rgba(184,125,69,0.5)] bg-[rgba(184,125,69,0.2)] text-[rgba(255,253,250,0.95)]"
                    : "border-[var(--border)] bg-[rgba(255,253,250,0.02)] text-[var(--text-muted)] hover:border-[rgba(184,125,69,0.42)] hover:text-[rgba(255,253,250,0.82)]",
                )}
              >
                {CATEGORY_LABELS[category]} ({newsData.byCategory[category].length})
              </button>
            );
          })}
        </div>
      </div>

      {articles.length === 0 ? (
        <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--glass)] p-10 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
            No {CATEGORY_LABELS[activeCategory].toLowerCase()} articles yet. Check back after the
            next ingest.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <NewsCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
