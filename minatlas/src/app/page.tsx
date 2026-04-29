import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[color:var(--bg-primary)] p-8 text-center">
      <h1 className="font-display text-7xl text-[color:var(--text-primary)]">MinAtlas</h1>
      <p className="mt-4 max-w-xl text-base text-[color:var(--text-secondary)]">
        Premium map-first mining intelligence for Australia.
      </p>
      <Link
        href="/map"
        className="mt-8 rounded-xl border border-[color:var(--accent)] bg-[color:var(--accent-subtle)] px-5 py-2.5 text-sm text-[color:var(--text-primary)]"
      >
        Open Map
      </Link>
    </main>
  );
}
