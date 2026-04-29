"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
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

const COMMODITY_LABELS: Record<string, string> = {
  AG: "Silver",
  AU: "Gold",
  BI: "Bismuth",
  CO: "Cobalt",
  CU: "Copper",
  NI: "Nickel",
  PB: "Lead",
  SB: "Antimony",
  ZN: "Zinc",
};

const STATUS_LABELS: Record<string, string> = {
  care_maintenance: "Care & maintenance",
};

function toTitleCase(value: string) {
  return value
    .split(" ")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(" ");
}

function formatStatusLabel(status: string) {
  if (STATUS_LABELS[status]) return STATUS_LABELS[status];
  return toTitleCase(status.replaceAll("_", " "));
}

function formatCommodityLabel(commodity: string) {
  const symbol = commodity.trim().toUpperCase();
  if (COMMODITY_LABELS[symbol]) return COMMODITY_LABELS[symbol];
  return toTitleCase(commodity.replaceAll("_", " "));
}

function formatStateLabel(state: string) {
  return toTitleCase(state.replaceAll("_", " "));
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
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const activeChips = [
    ...selectedCommodities.map((value) => ({
      id: `commodity-${value}`,
      label: formatCommodityLabel(value),
      onRemove: () => onToggleCommodity(value),
    })),
    ...selectedStatuses.map((value) => ({
      id: `status-${value}`,
      label: formatStatusLabel(value),
      onRemove: () => onToggleStatus(value),
    })),
    ...selectedStates.map((value) => ({
      id: `state-${value}`,
      label: formatStateLabel(value),
      onRemove: () => onToggleState(value),
    })),
  ];

  const suggestions = useMemo(
    () =>
      [
        ...commodities
          .filter((value) => !selectedCommodities.includes(value))
          .slice(0, 2)
          .map((value) => ({
            id: `suggest-commodity-${value}`,
            label: formatCommodityLabel(value),
            onClick: () => onToggleCommodity(value),
          })),
        ...statuses
          .filter((value) => !selectedStatuses.includes(value))
          .slice(0, 2)
          .map((value) => ({
            id: `suggest-status-${value}`,
            label: formatStatusLabel(value),
            onClick: () => onToggleStatus(value),
          })),
        ...states
          .filter((value) => !selectedStates.includes(value))
          .slice(0, 2)
          .map((value) => ({
            id: `suggest-state-${value}`,
            label: formatStateLabel(value),
            onClick: () => onToggleState(value),
          })),
      ].slice(0, 5),
    [commodities, onToggleCommodity, onToggleState, onToggleStatus, selectedCommodities, selectedStates, selectedStatuses, states, statuses],
  );

  const hasActiveFilters = activeChips.length > 0;

  return (
    <div className="relative flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setIsPanelOpen((current) => !current)}
          className={cn(
            "glass inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm transition-all duration-200 ease-out",
            "hover:border-[color:var(--accent)] hover:text-[color:var(--text-primary)]",
            isPanelOpen
              ? "border-[color:var(--accent)] text-[color:var(--text-primary)]"
              : "text-[color:var(--text-secondary)]",
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="rounded-md bg-[color:var(--accent-subtle)] px-1.5 py-0.5 text-xs text-[color:var(--text-primary)]">
              {activeChips.length}
            </span>
          )}
        </button>

        {activeChips.slice(0, 4).map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={chip.onRemove}
            className={cn(
              "glass inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm text-[color:var(--text-primary)]",
              "transition-all duration-200 ease-out hover:border-[color:var(--accent)]",
            )}
          >
            {chip.label}
            <X className="h-3.5 w-3.5 text-[color:var(--text-tertiary)]" />
          </button>
        ))}

        {suggestions.slice(0, 3).map((suggestion) => (
          <button
            key={suggestion.id}
            type="button"
            onClick={suggestion.onClick}
            className="glass rounded-xl px-3 py-1.5 text-sm text-[color:var(--text-secondary)] transition-all duration-200 ease-out hover:text-[color:var(--text-primary)]"
          >
            + {suggestion.label}
          </button>
        ))}
      </div>

      <div
        className={cn(
          "glass absolute left-0 top-full z-30 mt-2 w-[min(720px,calc(100vw-36px))] rounded-2xl p-4 transition-all duration-250 ease-out",
          isPanelOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0",
        )}
      >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[color:var(--text-primary)]">Filters</p>
              <p className="text-xs text-[color:var(--text-tertiary)]">Select from key filters below.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsPanelOpen(false)}
              className="rounded-lg px-2 py-1 text-[color:var(--text-tertiary)] transition-all duration-200 ease-out hover:text-[color:var(--text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <section className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-[color:var(--text-tertiary)]">Status</p>
              <div className="flex flex-wrap gap-2">
                {statuses.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => onToggleStatus(status)}
                    className={cn(
                      "rounded-lg border px-2.5 py-1.5 text-sm transition-all duration-200 ease-out",
                      selectedStatuses.includes(status)
                        ? "border-[color:var(--accent)] bg-[color:var(--accent-subtle)] text-[color:var(--text-primary)]"
                        : "border-[color:var(--border-subtle)] text-[color:var(--text-secondary)] hover:border-[color:var(--accent)]",
                    )}
                  >
                    {formatStatusLabel(status)}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-[color:var(--text-tertiary)]">State</p>
              <div className="flex flex-wrap gap-2">
                {states.map((state) => (
                  <button
                    key={state}
                    type="button"
                    onClick={() => onToggleState(state)}
                    className={cn(
                      "rounded-lg border px-2.5 py-1.5 text-sm transition-all duration-200 ease-out",
                      selectedStates.includes(state)
                        ? "border-[color:var(--accent)] bg-[color:var(--accent-subtle)] text-[color:var(--text-primary)]"
                        : "border-[color:var(--border-subtle)] text-[color:var(--text-secondary)] hover:border-[color:var(--accent)]",
                    )}
                  >
                    {formatStateLabel(state)}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-[color:var(--text-tertiary)]">Commodities</p>
              <div className="flex flex-wrap gap-2">
                {commodities.map((commodity) => (
                  <button
                    key={commodity}
                    type="button"
                    onClick={() => onToggleCommodity(commodity)}
                    className={cn(
                      "rounded-lg border px-2.5 py-1.5 text-sm transition-all duration-200 ease-out",
                      selectedCommodities.includes(commodity)
                        ? "border-[color:var(--accent)] bg-[color:var(--accent-subtle)] text-[color:var(--text-primary)]"
                        : "border-[color:var(--border-subtle)] text-[color:var(--text-secondary)] hover:border-[color:var(--accent)]",
                    )}
                  >
                    {formatCommodityLabel(commodity)}
                  </button>
                ))}
              </div>
            </section>
          </div>
      </div>
    </div>
  );
}
