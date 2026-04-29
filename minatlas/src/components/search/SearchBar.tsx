"use client";

import { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
}

export default function SearchBar({ value = "", onChange = () => undefined }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  return (
    <div className="glass flex h-12 w-full max-w-xl items-center gap-3 rounded-2xl px-4 transition-all duration-200 ease-out hover:border-[color:var(--accent)]">
      <span className="flex items-center gap-3 text-sm text-[color:var(--text-secondary)]">
        <Search className="h-4 w-4" />
      </span>

      <input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search sites, operators, regions"
        className="flex-1 bg-transparent text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-secondary)] focus:outline-none"
      />

      {value.trim().length > 0 ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="rounded-md border border-[color:var(--border)] p-1 text-[color:var(--text-tertiary)] transition-all duration-200 ease-out hover:text-[color:var(--text-primary)]"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : (
        <kbd className="rounded-md border border-[color:var(--border)] px-1.5 py-0.5 font-mono text-xs text-[color:var(--text-tertiary)]">
          ⌘K
        </kbd>
      )}
    </div>
  );
}
