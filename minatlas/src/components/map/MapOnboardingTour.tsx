"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export const MAP_TOUR_STORAGE_KEY = "minatlas-map-tour-v1";

type StepMode = "anchor" | "center";

interface TourStep {
  id: string;
  mode: StepMode;
  /** CSS selector for anchored steps */
  anchorSelector?: string;
  title: string;
  body: string;
}

const STEPS: TourStep[] = [
  {
    id: "search",
    mode: "anchor",
    anchorSelector: '[data-tour="map-search"]',
    title: "Search the footprint",
    body: "Jump to a site by name, operator, region or commodity. Try ⌘K / Ctrl+K anytime to focus search.",
  },
  {
    id: "filters",
    mode: "anchor",
    anchorSelector: '[data-tour="map-filters"]',
    title: "Filter what you see",
    body: "Narrow by status, state and commodity so the map stays readable when you only care about one story.",
  },
  {
    id: "markers",
    mode: "center",
    title: "Open site context",
    body: "Click any mine marker. The card shows nearby sites, tenements at that point, and optional web search when you need more than the public snapshot.",
  },
  {
    id: "controls",
    mode: "anchor",
    anchorSelector: '[data-tour="map-controls"]',
    title: "Layers and map settings",
    body: "Toggle Layers to show or hide sites and tenements. Settings controls basemap, terrain, marker density and performance—use a lower max points if the map feels heavy.",
  },
  {
    id: "done",
    mode: "center",
    title: "You are set",
    body: "Pan, zoom and explore. If the map ever feels heavy, open Settings and lower Max points rendered. You can revisit the home page guided link anytime for a fresh walkthrough.",
  },
];

function stripIntroQueryParam() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("intro")) return;
  url.searchParams.delete("intro");
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, "", next);
}

function shouldAutoOpenTour(): boolean {
  if (typeof window === "undefined") return false;
  const stored = window.localStorage.getItem(MAP_TOUR_STORAGE_KEY);
  if (stored === "done") return false;
  const params = new URLSearchParams(window.location.search);
  const fromLanding = params.get("intro") === "landing";
  if (stored === "skipped" && !fromLanding) return false;
  return true;
}

function useAnchorRect(selector: string | undefined, active: boolean, stepKey: number) {
  const [rect, setRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  useLayoutEffect(() => {
    if (!active || !selector) {
      setRect(null);
      return;
    }

    const el = document.querySelector(selector);
    if (!el || !(el instanceof HTMLElement)) {
      setRect(null);
      return;
    }

    const update = () => {
      const r = el.getBoundingClientRect();
      setRect({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [active, selector, stepKey]);

  return rect;
}

export default function MapOnboardingTour() {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const step = STEPS[stepIndex]!;
  const anchorRect = useAnchorRect(
    step.mode === "anchor" ? step.anchorSelector : undefined,
    open && step.mode === "anchor",
    stepIndex,
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (shouldAutoOpenTour()) setOpen(true);
    }, 850);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const replay = () => {
      setStepIndex(0);
      setOpen(true);
    };
    window.addEventListener("minatlas:replay-map-tour", replay);
    return () => window.removeEventListener("minatlas:replay-map-tour", replay);
  }, []);

  const dismiss = useCallback((reason: "done" | "skipped") => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MAP_TOUR_STORAGE_KEY, reason === "done" ? "done" : "skipped");
      stripIntroQueryParam();
    }
    setOpen(false);
    setStepIndex(0);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss("skipped");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismiss]);

  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>("[data-tour-primary]")?.focus();
    }, 0);
  }, [open, stepIndex]);

  /** Lift the current anchor above the overlay and draw the spotlight ring on the real control. */
  useEffect(() => {
    if (!open || step.mode !== "anchor" || !step.anchorSelector) return;
    const el = document.querySelector(step.anchorSelector);
    if (!el || !(el instanceof HTMLElement)) return;
    const prevZ = el.style.zIndex;
    const prevPos = el.style.position;
    const ringClass = "minatlas-tour-anchor-ring";
    el.style.position = "relative";
    el.style.zIndex = "110";
    el.classList.add(ringClass);
    return () => {
      el.style.zIndex = prevZ;
      el.style.position = prevPos;
      el.classList.remove(ringClass);
    };
  }, [open, step.mode, step.anchorSelector, stepIndex]);

  if (!open) return null;

  const isLast = stepIndex === STEPS.length - 1;
  const isAnchorStep = step.mode === "anchor";
  const hasAnchorRect = Boolean(anchorRect);

  const vw = typeof window !== "undefined" ? window.innerWidth : 400;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const pad = 16;
  const cardWidth = Math.min(380, vw - pad * 2);
  const estimatedCardH = 240;

  let cardLeft = (vw - cardWidth) / 2;
  let cardTop = 0;
  let cardTransform: string | undefined = "translateY(-50%)";
  let cardTopCss = "50%";

  if (isAnchorStep && anchorRect) {
    cardLeft = Math.min(Math.max(pad, anchorRect.left + anchorRect.width / 2 - cardWidth / 2), vw - cardWidth - pad);
    cardTop = anchorRect.top + anchorRect.height + 12;
    if (cardTop + estimatedCardH > vh - pad) {
      cardTop = Math.max(pad, anchorRect.top - estimatedCardH - 12);
    }
    cardTopCss = `${cardTop}px`;
    cardTransform = undefined;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      role="presentation"
      aria-hidden={false}
    >
      {/* Dim + blur — blocks map interaction until Skip / Done */}
      <div
        className="absolute inset-0 bg-[rgba(18,16,14,0.52)] backdrop-blur-[4px] transition-opacity duration-300"
        aria-hidden
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="map-tour-title"
        className="glass-card fixed z-[106] flex max-h-[min(70vh,26rem)] w-[min(380px,calc(100vw-2rem))] flex-col rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-frosted)] p-4 shadow-[var(--shadow-float)]"
        style={{
          left: cardLeft,
          top: isAnchorStep && hasAnchorRect ? cardTopCss : "50%",
          transform: cardTransform,
          width: cardWidth,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-tertiary)]">
            {stepIndex + 1} / {STEPS.length}
          </p>
          <button
            type="button"
            onClick={() => dismiss("skipped")}
            className="rounded-lg p-1 text-[color:var(--text-tertiary)] transition-colors hover:text-[color:var(--text-primary)]"
            aria-label="Skip tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-1 flex gap-1">
          {STEPS.map((_, i) => (
            <span
              key={STEPS[i]!.id}
              className={`h-1 flex-1 rounded-full ${i <= stepIndex ? "bg-[color:var(--accent)]" : "bg-[color:var(--border-subtle)]"}`}
            />
          ))}
        </div>

        <h2 id="map-tour-title" className="mt-3 font-display text-xl text-[color:var(--text-primary)] md:text-2xl">
          {step.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[color:var(--text-secondary)]">{step.body}</p>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[color:var(--border-subtle)] pt-4">
          <button
            type="button"
            onClick={() => dismiss("skipped")}
            className="text-xs text-[color:var(--text-tertiary)] underline-offset-2 hover:text-[color:var(--text-primary)] hover:underline"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {stepIndex > 0 ? (
              <button
                type="button"
                onClick={() => setStepIndex((i) => i - 1)}
                className="inline-flex items-center gap-1 rounded-xl border border-[color:var(--border-subtle)] px-3 py-2 text-xs text-[color:var(--text-secondary)] transition-colors hover:border-[color:var(--accent)] hover:text-[color:var(--text-primary)]"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            ) : null}
            <button
              type="button"
              data-tour-primary
              onClick={() => {
                if (isLast) dismiss("done");
                else setStepIndex((i) => i + 1);
              }}
              className="inline-flex items-center gap-1 rounded-xl bg-[color:var(--accent)] px-4 py-2 text-xs font-medium text-[color:var(--bg-deep)] transition-opacity hover:opacity-90"
            >
              {isLast ? "Start exploring" : "Next"}
              {!isLast ? <ChevronRight className="h-4 w-4" /> : null}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
