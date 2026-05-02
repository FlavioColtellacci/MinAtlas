"use client";

import Link from "next/link";
import { Layers3, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

const controls = [
  { id: "layers", label: "Layers", icon: Layers3 },
  { id: "settings", label: "Settings", icon: Settings2 },
] as const;

interface MapControlsProps {
  layersActive: boolean;
  settingsActive: boolean;
  onToggleLayers: () => void;
  onToggleSettings: () => void;
}

export default function MapControls({
  layersActive,
  settingsActive,
  onToggleLayers,
  onToggleSettings,
}: MapControlsProps) {
  const activeStateByControlId: Record<(typeof controls)[number]["id"], boolean> = {
    layers: layersActive,
    settings: settingsActive,
  };

  const clickHandlerByControlId: Record<(typeof controls)[number]["id"], () => void> = {
    layers: onToggleLayers,
    settings: onToggleSettings,
  };

  return (
    <div className="glass flex items-center gap-0.5 rounded-xl p-0.5 md:gap-1 md:rounded-2xl md:p-1">
      <Link
        href="/"
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-[color:var(--text-secondary)] transition-all duration-200 ease-out md:gap-2 md:rounded-xl md:px-3 md:py-2 md:text-sm",
          "hover:bg-[color:var(--accent-subtle)] hover:text-[color:var(--text-primary)]",
        )}
      >
        Home
      </Link>

      {controls.map((control) => (
        <button
          key={control.id}
          type="button"
          onClick={clickHandlerByControlId[control.id]}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-[color:var(--text-secondary)] transition-all duration-200 ease-out md:gap-2 md:rounded-xl md:px-3 md:py-2 md:text-sm",
            "hover:bg-[color:var(--accent-subtle)] hover:text-[color:var(--text-primary)]",
            activeStateByControlId[control.id] && "bg-[color:var(--accent-subtle)] text-[color:var(--text-primary)]",
          )}
        >
          <control.icon className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">{control.label}</span>
        </button>
      ))}
    </div>
  );
}
