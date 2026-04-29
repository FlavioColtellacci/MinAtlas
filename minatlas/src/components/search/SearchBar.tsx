"use client";

import { Search } from "lucide-react";

export default function SearchBar() {
  return (
    <button
      type="button"
      className="glass flex h-12 w-full max-w-xl items-center justify-between gap-3 rounded-2xl px-4 text-left"
    >
      <span className="flex items-center gap-3 text-sm text-[color:var(--text-secondary)]">
        <Search className="h-4 w-4" />
        Search sites, operators, regions
      </span>
      <kbd className="rounded-md border border-[color:var(--border)] px-1.5 py-0.5 font-mono text-xs text-[color:var(--text-tertiary)]">
        ⌘K
      </kbd>
    </button>
  );
}
