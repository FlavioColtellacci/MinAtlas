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
    <div className="glass flex items-center gap-1 rounded-2xl p-1">
      <Link
        href="/"
        className={cn(
          "flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[color:var(--text-secondary)] transition-all duration-200 ease-out",
          "hover:bg-[color:var(--accent-subtle)] hover:text-[color:var(--text-primary)]",
        )}
      >
        <span className="hidden sm:inline">Home</span>
        <span className="sm:hidden">Home</span>
      </Link>

      {controls.map((control) => (
        <button
          key={control.id}
          type="button"
          onClick={clickHandlerByControlId[control.id]}
          className={cn(
            "flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[color:var(--text-secondary)] transition-all duration-200 ease-out",
            "hover:bg-[color:var(--accent-subtle)] hover:text-[color:var(--text-primary)]",
            activeStateByControlId[control.id] && "bg-[color:var(--accent-subtle)] text-[color:var(--text-primary)]",
          )}
        >
          <control.icon className="h-4 w-4" />
          <span className="hidden sm:inline">{control.label}</span>
        </button>
      ))}
    </div>
  );
}
