"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const chips = ["Gold", "Operating", "Western Australia"];

export default function FilterBar() {
  return (
    <div className="flex items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip}
          type="button"
          className={cn(
            "glass inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm text-[color:var(--text-primary)]",
            "hover:border-[color:var(--accent)]",
          )}
        >
          {chip}
          <X className="h-3.5 w-3.5 text-[color:var(--text-tertiary)]" />
        </button>
      ))}
      <button
        type="button"
        className="glass rounded-xl px-3 py-1.5 text-sm text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
      >
        + Add filter
      </button>
    </div>
  );
}
