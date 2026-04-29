"use client";

import { Box, Layers3, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

const controls = [
  { id: "layers", label: "Layers", icon: Layers3 },
  { id: "terrain", label: "3D Terrain", icon: Box },
  { id: "settings", label: "Settings", icon: Settings2 },
] as const;

interface MapControlsProps {
  layersActive: boolean;
  terrainActive: boolean;
  settingsActive: boolean;
  onToggleLayers: () => void;
  onToggleTerrain: () => void;
  onToggleSettings: () => void;
}

export default function MapControls({
  layersActive,
  terrainActive,
  settingsActive,
  onToggleLayers,
  onToggleTerrain,
  onToggleSettings,
}: MapControlsProps) {
  const activeStateByControlId: Record<(typeof controls)[number]["id"], boolean> = {
    layers: layersActive,
    terrain: terrainActive,
    settings: settingsActive,
  };

  const clickHandlerByControlId: Record<(typeof controls)[number]["id"], () => void> = {
    layers: onToggleLayers,
    terrain: onToggleTerrain,
    settings: onToggleSettings,
  };

  return (
    <div className="glass flex items-center gap-1 rounded-2xl p-1">
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
