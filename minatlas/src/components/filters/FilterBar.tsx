"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  commodities: string[];
  states: string[];
  statuses: string[];
  selectedCommodities: string[];
  selectedStates: string[];
  selectedStatuses: string[];
  onToggleCommodity: (commodity: string) => void;
  onToggleState: (state: string) => void;
  onToggleStatus: (status: string) => void;
}

export default function FilterBar({
  commodities,
  states,
  statuses,
  selectedCommodities,
  selectedStates,
  selectedStatuses,
  onToggleCommodity,
  onToggleState,
  onToggleStatus,
}: FilterBarProps) {
  const activeChips = [
    ...selectedCommodities.map((value) => ({ id: `commodity-${value}`, label: value, onRemove: () => onToggleCommodity(value) })),
    ...selectedStatuses.map((value) => ({ id: `status-${value}`, label: value, onRemove: () => onToggleStatus(value) })),
    ...selectedStates.map((value) => ({ id: `state-${value}`, label: value, onRemove: () => onToggleState(value) })),
  ];

  const suggestions = [
    ...commodities
      .filter((value) => !selectedCommodities.includes(value))
      .slice(0, 2)
      .map((value) => ({ id: `suggest-commodity-${value}`, label: value, onClick: () => onToggleCommodity(value) })),
    ...statuses
      .filter((value) => !selectedStatuses.includes(value))
      .slice(0, 1)
      .map((value) => ({ id: `suggest-status-${value}`, label: value, onClick: () => onToggleStatus(value) })),
    ...states
      .filter((value) => !selectedStates.includes(value))
      .slice(0, 1)
      .map((value) => ({ id: `suggest-state-${value}`, label: value, onClick: () => onToggleState(value) })),
  ].slice(0, 3);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {activeChips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={chip.onRemove}
          className={cn(
            "glass inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm text-[color:var(--text-primary)]",
            "hover:border-[color:var(--accent)]",
          )}
        >
          {chip.label}
          <X className="h-3.5 w-3.5 text-[color:var(--text-tertiary)]" />
        </button>
      ))}

      {activeChips.length === 0 && (
        <span className="glass rounded-xl px-3 py-1.5 text-sm text-[color:var(--text-secondary)]">No filters active</span>
      )}

      {suggestions.map((suggestion) => (
        <button
          key={suggestion.id}
          type="button"
          onClick={suggestion.onClick}
          className="glass rounded-xl px-3 py-1.5 text-sm text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
        >
          + {suggestion.label}
        </button>
      ))}
    </div>
  );
}
