import Link from "next/link";

import { getNewsData } from "@/lib/newsServer";

import { NewsFeedClient } from "./news-feed-client";

function formatLastUpdated(value: string | null): string {
  if (!value) return "Not available yet";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not available yet";
  return parsed.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function NewsPage() {
  const newsData = await getNewsData();

  return (
    <main className="fixed inset-0 overflow-y-auto overflow-x-hidden bg-[#07050a] text-[rgba(255,253,250,0.93)] [--accent:#b87d45] [--border:rgba(255,253,250,0.09)] [--glass:rgba(8,6,4,0.55)] [--text-muted:rgba(255,253,250,0.44)]">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_18%_12%,rgba(184,125,69,0.13),transparent_28%),radial-gradient(circle_at_78%_28%,rgba(61,158,95,0.08),transparent_30%),linear-gradient(180deg,#07050a_0%,#0b070a_54%,#07050a_100%)]" />

      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[rgba(7,5,10,0.72)] px-4 py-3 backdrop-blur-2xl">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center">
          <div className="flex items-center">
            <div className="font-mono text-xs uppercase tracking-[0.26em] text-[var(--accent)]">
              MinAtlas News
            </div>
          </div>
          <div className="flex justify-center">
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--glass)] px-4 py-2 text-xs font-medium tracking-[0.08em] text-[rgba(255,253,250,0.86)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(184,125,69,0.42)] hover:bg-[rgba(184,125,69,0.16)]"
              >
                Home
              </Link>
              <Link
                href="/product"
                className="whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--glass)] px-4 py-2 text-xs font-medium tracking-[0.08em] text-[rgba(255,253,250,0.86)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(184,125,69,0.42)] hover:bg-[rgba(184,125,69,0.16)]"
              >
                Product
              </Link>
              <Link
                href="/data"
                className="whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--glass)] px-4 py-2 text-xs font-medium tracking-[0.08em] text-[rgba(255,253,250,0.86)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(184,125,69,0.42)] hover:bg-[rgba(184,125,69,0.16)]"
              >
                Data
              </Link>
            </div>
          </div>
          <div aria-hidden />
        </div>
      </header>

      <section className="relative z-10 px-5 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <p className="mb-6 font-mono text-xs uppercase tracking-[0.28em] text-[var(--accent)]">
            Daily intelligence feed
          </p>
          <h1 className="max-w-5xl font-display text-[clamp(3rem,8vw,6.8rem)] leading-[0.92] tracking-[-0.05em] text-[rgba(255,253,250,0.96)]">
            Mining news in one clean stream.
          </h1>
          <p className="mt-7 max-w-3xl text-base leading-8 text-[var(--text-muted)] sm:text-lg">
            Curated Australia, global and operator-relevant mining headlines, refreshed
            daily and grouped for rapid scanning.
          </p>
          <div className="mt-8 inline-flex rounded-full border border-[rgba(184,125,69,0.3)] bg-[rgba(184,125,69,0.11)] px-4 py-2 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[rgba(255,253,250,0.85)]">
            Last updated: {formatLastUpdated(newsData.lastUpdated)}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-20 sm:px-8 lg:px-12">
        <NewsFeedClient newsData={newsData} />
      </section>
    </main>
  );
}
