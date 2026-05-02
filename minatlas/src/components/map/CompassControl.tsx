"use client";

import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Compass } from "lucide-react";

interface CompassControlProps {
  bearingDeg: number;
  onResetNorth: () => void;
  onSetBearing: (bearing: number) => void;
}

export default function CompassControl({ bearingDeg, onResetNorth, onSetBearing }: CompassControlProps) {
  const knobRef = useRef<HTMLButtonElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const readBearingFromPointer = (clientX: number, clientY: number) => {
    const rect = knobRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angleDeg = (Math.atan2(clientY - centerY, clientX - centerX) * 180) / Math.PI;
    return (angleDeg + 90 + 360) % 360;
  };

  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    setIsDragging(true);
    const bearing = readBearingFromPointer(event.clientX, event.clientY);
    if (bearing !== null) onSetBearing(bearing);
  };

  const moveDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!isDragging) return;
    const bearing = readBearingFromPointer(event.clientX, event.clientY);
    if (bearing !== null) onSetBearing(bearing);
  };

  const endDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!isDragging) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDragging(false);
  };

  return (
    <div className="glass flex flex-col items-center gap-2 rounded-xl p-2 max-md:gap-0 max-md:p-1.5">
      <button
        type="button"
        onClick={onResetNorth}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-frosted)] text-[color:var(--text-secondary)] transition-all duration-200 ease-out hover:border-[color:var(--accent)] hover:text-[color:var(--text-primary)]"
        aria-label="Reset orientation to north"
      >
        <Compass className="h-4 w-4" />
      </button>

      <button
        ref={knobRef}
        type="button"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="relative hidden h-12 w-12 rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-frosted)] transition-all duration-200 ease-out hover:border-[color:var(--accent)] md:block"
        aria-label="Rotate map"
      >
        <span
          className={[
            "absolute left-1/2 top-1/2 block h-4 w-0.5 -translate-x-1/2 -translate-y-[90%] rounded-full bg-[color:var(--accent)]",
            isDragging ? "transition-none" : "transition-transform duration-200 ease-out",
          ].join(" ")}
          style={{ transform: `translate(-50%, -90%) rotate(${bearingDeg}deg)` }}
        />
        <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--text-secondary)]" />
      </button>
    </div>
  );
}
