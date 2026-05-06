"use client";

import Link from "next/link";
import Image from "next/image";
import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { BriefcaseBusiness, Drill, ExternalLink, Globe2, TimerReset } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { id: "sources", label: "Sources" },
  { id: "datasets", label: "Datasets" },
  { id: "coverage", label: "Coverage" },
  { id: "pipeline", label: "Pipeline" },
  { id: "coming-soon", label: "Coming Soon" },
];

const stats = [
  { value: "4,500+", label: "Active mine sites" },
  { value: "48,000+", label: "Recorded sites indexed" },
  { value: "Daily", label: "Refresh cadence" },
  { value: "11", label: "Commodities tracked" },
];

const dataSources = [
  {
    source: "DMIRS WA",
    dataset: "MINEDEX Mine Sites",
    type: "Points",
    frequency: "Daily",
    records: "4,500+",
    href: "https://minedex.dmirs.wa.gov.au/Web/home",
  },
  {
    source: "DMIRS WA",
    dataset: "Mining Tenements",
    type: "Polygons",
    frequency: "Daily",
    records: "50,000+",
    href: "https://data.wa.gov.au/slip",
  },
  {
    source: "DMIRS WA",
    dataset: "Operating Mines",
    type: "Points",
    frequency: "Weekly",
    records: "340+",
    href: "https://minedex.dmirs.wa.gov.au/Web/home",
  },
  {
    source: "DMIRS WA",
    dataset: "Major Resource Projects",
    type: "Points",
    frequency: "Monthly",
    records: "120+",
    href: "https://www.dmp.wa.gov.au/Investors/Major-Resource-Projects-1502.aspx",
  },
  {
    source: "Geoscience Australia",
    dataset: "Gold Resource Estimates",
    type: "Points",
    frequency: "Quarterly",
    records: "890+",
    href: "https://www.ga.gov.au/",
  },
  {
    source: "Geoscience Australia",
    dataset: "Copper Resource Estimates",
    type: "Points",
    frequency: "Quarterly",
    records: "210+",
    href: "https://www.ga.gov.au/",
  },
  {
    source: "Geoscience Australia",
    dataset: "Lithium Resource Estimates",
    type: "Points",
    frequency: "Quarterly",
    records: "180+",
    href: "https://www.ga.gov.au/",
  },
  {
    source: "Geoscience Australia",
    dataset: "Nickel Resource Estimates",
    type: "Points",
    frequency: "Quarterly",
    records: "290+",
    href: "https://www.ga.gov.au/",
  },
  {
    source: "DMIRS WA",
    dataset: "Abandoned Mines",
    type: "Points",
    frequency: "Annually",
    records: "1,100+",
    href: "https://www.dmp.wa.gov.au/Safety/Abandoned-mines-15619.aspx",
  },
  {
    source: "DMIRS WA",
    dataset: "Historical Exploration",
    type: "Polygons",
    frequency: "Annually",
    records: "4,200+",
    href: "https://data.wa.gov.au/slip",
  },
];

const states = [
  {
    name: "Western Australia",
    shortName: "WA",
    status: "Live",
    tone: "green",
    description: "Mine sites, tenements, operating mines, abandoned mines and resource estimates.",
  },
  {
    name: "South Australia",
    shortName: "SA",
    status: "Coming soon",
    tone: "bronze",
    description: "State mining tenements, operating mines and public mineral occurrence layers.",
  },
  {
    name: "Queensland",
    shortName: "QLD",
    status: "Coming soon",
    tone: "bronze",
    description: "Exploration permits, mine status and commodity resource estimate datasets.",
  },
  {
    name: "Northern Territory",
    shortName: "NT",
    status: "Coming soon",
    tone: "bronze",
    description: "Tenement boundaries, mine records and territory exploration project layers.",
  },
  {
    name: "New South Wales",
    shortName: "NSW",
    status: "Coming soon",
    tone: "bronze",
    description: "Mineral titles, mine locations and public resources data from state portals.",
  },
  {
    name: "Victoria",
    shortName: "VIC",
    status: "Coming soon",
    tone: "bronze",
    description: "Exploration licences, extractive sites and historical mineral occurrence data.",
  },
  {
    name: "Tasmania",
    shortName: "TAS",
    status: "Coming soon",
    tone: "bronze",
    description: "Mining leases, mineral deposits and public geoscience datasets.",
  },
];

const pipelineSteps = [
  {
    number: "01",
    title: "Direct from the source",
    description: "Sourced directly from Australia's official mining registries.",
  },
  {
    number: "02",
    title: "Nightly ingestion",
    description:
      "An automated job runs nightly, pulling the latest data from every source.",
  },
  {
    number: "03",
    title: "Live on the map",
    description:
      "Every mine site and tenement refreshed overnight, ready the moment you open the map.",
  },
];

const roadmap = [
  {
    icon: BriefcaseBusiness,
    title: "ASX Company Links",
    copy:
      "Map ASX-listed junior miners to their tenement footprints. See ticker, market cap and last price directly on the map.",
  },
  {
    icon: Drill,
    title: "Drill Results Layer",
    copy:
      "Visualise historical and recent drill intersections by hole, depth and grade across WA.",
  },
  {
    icon: TimerReset,
    title: "Tenement Expiry Alerts",
    copy:
      "Track tenements expiring in the next 30, 60 and 90 days. Critical for explorers and land agents.",
  },
  {
    icon: Globe2,
    title: "National Expansion",
    copy:
      "Queensland, New South Wales, Northern Territory and South Australia. Full national coverage coming.",
  },
];

type RevealProps = {
  id: string;
  as?: "section" | "div";
  className?: string;
  children: ReactNode;
};

export default function DataPage() {
  const scrollRef = useRef<HTMLElement>(null);
  const scrollAnimRef = useRef<number | null>(null);
  const cursorGlowRef = useRef<HTMLDivElement>(null);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(
    () => new Set(["hero", "sources"]),
  );
  const [activeSection, setActiveSection] = useState("sources");

  const handleNavClick = (sectionId: string) => (event: ReactMouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setActiveSection((prev) => (prev === sectionId ? prev : sectionId));
    setVisibleSections((prev) => {
      const next = new Set(prev);
      next.add(sectionId);
      return next;
    });
    const root = scrollRef.current;
    if (!root) return;
    const target = root.querySelector<HTMLElement>(`#${sectionId}`);
    if (!target) return;
    const targetTop =
      target.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - 84;
    const clampedTargetTop = Math.max(targetTop, 0);
    const startTop = root.scrollTop;
    const delta = clampedTargetTop - startTop;
    const duration = 900;

    if (scrollAnimRef.current) {
      window.cancelAnimationFrame(scrollAnimRef.current);
    }

    const startTime = performance.now();
    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOutCubic(progress);
      root.scrollTop = startTop + delta * eased;
      if (progress < 1) {
        scrollAnimRef.current = window.requestAnimationFrame(tick);
      } else {
        scrollAnimRef.current = null;
        setActiveSection((prev) => (prev === sectionId ? prev : sectionId));
      }
    };

    scrollAnimRef.current = window.requestAnimationFrame(tick);
  };

  useEffect(() => {
    const root = scrollRef.current;
    const glow = cursorGlowRef.current;
    if (!root || !glow) return;

    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!finePointer || reducedMotion) return;

    glow.style.opacity = "0";
    let raf = 0;
    let nextX = 0;
    let nextY = 0;

    const render = () => {
      glow.style.transform = `translate3d(${nextX - 120}px, ${nextY - 120}px, 0)`;
      raf = 0;
    };

    const onPointerMove = (event: PointerEvent) => {
      nextX = event.clientX;
      nextY = event.clientY;
      glow.style.opacity = "1";
      if (!raf) raf = window.requestAnimationFrame(render);
    };

    const onPointerLeave = () => {
      glow.style.opacity = "0";
    };

    root.addEventListener("pointermove", onPointerMove, { passive: true });
    root.addEventListener("pointerleave", onPointerLeave);

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    const revealNodes = Array.from(root.querySelectorAll("[data-reveal-id]"));
    let raf = 0;

    const updateActiveSection = () => {
      const rootRect = root.getBoundingClientRect();
      const fallbackVisible = revealNodes
        .filter((node) => node.getBoundingClientRect().top - rootRect.top <= rootRect.height * 0.88)
        .map((node) => node.getAttribute("data-reveal-id"))
        .filter((id): id is string => Boolean(id));

      if (fallbackVisible.length) {
        setVisibleSections((prev) => {
          const next = new Set(prev);
          fallbackVisible.forEach((id) => next.add(id));
          return next;
        });
      }

      const activeNodes = navItems
        .map(({ id }) => root.querySelector<HTMLElement>(`#${id}`))
        .filter((node): node is HTMLElement => Boolean(node));

      const sectionTops = activeNodes
        .map((node) => ({
          id: node.id,
          top: node.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop,
        }))
        .sort((a, b) => a.top - b.top);
      const marker = root.scrollTop + 140;
      let currentActive = sectionTops[0]?.id ?? navItems[0]?.id ?? "sources";
      sectionTops.forEach((section) => {
        if (marker >= section.top) currentActive = section.id;
      });

      setActiveSection((prev) => (prev === currentActive ? prev : currentActive));
      raf = 0;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const newlyVisible = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => entry.target.getAttribute("data-reveal-id"))
          .filter((id): id is string => Boolean(id));

        if (!newlyVisible.length) return;

        setVisibleSections((prev) => {
          const next = new Set(prev);
          newlyVisible.forEach((id) => next.add(id));
          return next;
        });

        entries.forEach((entry) => {
          if (entry.isIntersecting) observer.unobserve(entry.target);
        });
      },
      {
        root,
        rootMargin: "0px 0px -12% 0px",
        threshold: 0,
      },
    );

    revealNodes.forEach((node) => observer.observe(node));

    const onScrollOrResize = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();
    root.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      observer.disconnect();
      if (scrollAnimRef.current) {
        window.cancelAnimationFrame(scrollAnimRef.current);
      }
      if (raf) {
        window.cancelAnimationFrame(raf);
      }
      root.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, []);

  const Reveal = ({ id, as: Component = "section", className, children }: RevealProps) => (
    <Component
      id={id}
      data-reveal-id={id}
      className={cn(
        "transform-gpu opacity-0 translate-y-8 transition-all duration-700 ease-out",
        visibleSections.has(id) && "opacity-100 translate-y-0",
        className,
      )}
    >
      {children}
    </Component>
  );

  return (
    <main
      ref={scrollRef}
      className="fixed inset-0 overflow-y-auto overflow-x-hidden bg-[#07050a] text-[rgba(255,253,250,0.93)] [--accent:#b87d45] [--bg:#07050a] [--border:rgba(255,253,250,0.09)] [--glass:rgba(8,6,4,0.55)] [--green:#3d9e5f] [--text-muted:rgba(255,253,250,0.44)]"
    >
      <div
        ref={cursorGlowRef}
        className="pointer-events-none fixed left-0 top-0 z-40 h-60 w-60 rounded-full bg-[radial-gradient(circle,rgba(184,125,69,0.2)_0%,rgba(184,125,69,0.08)_36%,rgba(184,125,69,0)_72%)] blur-2xl transition-opacity duration-300"
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_18%_12%,rgba(184,125,69,0.13),transparent_28%),radial-gradient(circle_at_78%_28%,rgba(61,158,95,0.08),transparent_30%),linear-gradient(180deg,#07050a_0%,#0b070a_54%,#07050a_100%)]" />

      <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[rgba(7,5,10,0.72)] px-4 py-3 backdrop-blur-2xl">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:grid-cols-[1fr_auto_1fr] sm:gap-0">
          <div className="flex justify-end pr-2">
            <Link
              href="/"
              className="whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--glass)] px-4 py-2 text-xs font-medium tracking-[0.08em] text-[rgba(255,253,250,0.86)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(184,125,69,0.42)] hover:bg-[rgba(184,125,69,0.16)] hover:shadow-[0_0_22px_rgba(184,125,69,0.2)]"
            >
              Home
            </Link>
          </div>

          <div className="flex min-w-0 max-w-full gap-2 overflow-x-auto rounded-full border border-[var(--border)] bg-[var(--glass)] p-1 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={handleNavClick(item.id)}
                aria-current={activeSection === item.id ? "true" : undefined}
                className={cn(
                  "whitespace-nowrap cursor-pointer select-none rounded-full px-4 py-2 text-xs font-medium tracking-[0.08em] text-[var(--text-muted)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(184,125,69,0.38)] hover:bg-[rgba(184,125,69,0.14)] hover:text-[rgba(255,253,250,0.9)] hover:shadow-[0_0_20px_rgba(184,125,69,0.18)]",
                  activeSection === item.id &&
                    "bg-[rgba(184,125,69,0.18)] text-[rgba(255,253,250,0.93)] shadow-[0_0_28px_rgba(184,125,69,0.14)]",
                )}
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="flex justify-start pl-2">
            <div className="flex items-center gap-2">
              <Link
                href="/news"
                className="whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--glass)] px-4 py-2 text-xs font-medium tracking-[0.08em] text-[rgba(255,253,250,0.86)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(184,125,69,0.42)] hover:bg-[rgba(184,125,69,0.16)] hover:shadow-[0_0_22px_rgba(184,125,69,0.2)]"
              >
                News
              </Link>
              <Link
                href="/product"
                className="whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--glass)] px-4 py-2 text-xs font-medium tracking-[0.08em] text-[rgba(255,253,250,0.86)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(184,125,69,0.42)] hover:bg-[rgba(184,125,69,0.16)] hover:shadow-[0_0_22px_rgba(184,125,69,0.2)]"
              >
                Product
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="relative z-10">
        <section className="relative flex min-h-[78vh] items-center overflow-hidden px-5 py-20 sm:px-8 lg:px-12">
          <Reveal id="hero" as="div" className="relative mx-auto flex w-full max-w-6xl flex-col items-start">
            <p className="mb-6 inline-flex items-center gap-3 font-mono text-xs uppercase tracking-[0.28em] text-[var(--accent)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_18px_rgba(184,125,69,0.55)]" />
              DATA INFRASTRUCTURE
            </p>
            <h1 className="max-w-5xl font-display text-[clamp(3.7rem,9vw,8.5rem)] font-normal leading-[0.9] tracking-[-0.055em] text-[rgba(255,253,250,0.96)]">
              Built on Australia&apos;s public mining record.
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-[var(--text-muted)] sm:text-xl">
              Every mine site, tenement and resource estimate sourced directly from DMIRS and
              Geoscience Australia, ingested daily, presented beautifully.
            </p>
          </Reveal>
        </section>

        <Reveal id="sources" className="mx-auto max-w-6xl px-5 pb-24 pt-16 text-center sm:px-8 lg:px-12">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="group cursor-pointer rounded-[1.6rem] border border-[var(--border)] border-t-[rgba(184,125,69,0.72)] bg-[var(--glass)] p-7 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(184,125,69,0.42)] hover:bg-[rgba(8,6,4,0.58)] hover:shadow-[0_18px_60px_rgba(0,0,0,0.34),0_0_30px_rgba(184,125,69,0.2)]"
              >
                <p className="font-display text-6xl leading-none tracking-[-0.045em] text-[rgba(255,253,250,0.96)]">
                  {stat.value}
                </p>
                <p className="mt-4 font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-muted)] transition-colors duration-300 group-hover:text-[rgba(255,253,250,0.74)]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal id="datasets" className="bg-[rgba(255,253,250,0.025)] px-5 py-24 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <h2 className="font-display text-5xl tracking-[-0.045em] sm:text-7xl">
                Where the data comes from.
              </h2>
              <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-[var(--text-muted)]">
                Direct from Australia&apos;s official mining registries, processed daily,
                presented beautifully.
              </p>
            </div>

            <div className="mt-12 overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--glass)] backdrop-blur-2xl shadow-[0_30px_100px_rgba(0,0,0,0.36)]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[840px] border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      {["Source", "Dataset", "Type", "Update Frequency", "Records"].map((heading) => (
                        <th
                          key={heading}
                          scope="col"
                          className="px-5 py-4 text-left font-mono text-[0.64rem] uppercase tracking-[0.18em] text-[var(--text-muted)]"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {dataSources.map((row) => (
                      <tr
                        key={`${row.source}-${row.dataset}`}
                        className="transition-colors duration-300 hover:bg-[rgba(255,253,250,0.035)]"
                      >
                        <td className="px-5 py-4 text-sm text-[rgba(255,253,250,0.82)]">
                          <a
                            href={row.href}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-2 transition-colors duration-300 hover:text-white"
                          >
                            {row.source}
                            <ExternalLink className="h-3.5 w-3.5 text-[var(--accent)]" />
                          </a>
                        </td>
                        <td className="px-5 py-4 text-sm text-[rgba(255,253,250,0.78)]">
                          {row.dataset}
                        </td>
                        <td className="px-5 py-4 text-sm text-[rgba(255,253,250,0.72)]">
                          {row.type}
                        </td>
                        <td className="px-5 py-4 text-sm text-[rgba(255,253,250,0.72)]">
                          {row.frequency}
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-[rgba(255,253,250,0.74)]">
                          {row.records}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal id="coverage" className="mx-auto max-w-6xl px-5 py-24 sm:px-8 lg:px-12">
          <div className="text-center">
            <h2 className="font-display text-5xl tracking-[-0.045em] sm:text-7xl">
              Coverage by state.
            </h2>
          </div>

          <div className="mt-12 grid gap-12 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="group rounded-[2rem] border border-[var(--border)] bg-[#07050a] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.36)] transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(184,125,69,0.36)] hover:shadow-[0_35px_110px_rgba(0,0,0,0.45),0_0_70px_rgba(184,125,69,0.2)]">
              <AustraliaMap />
              <div className="mt-8 flex flex-wrap justify-center gap-4 font-mono text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-[0.2rem] bg-[var(--accent)] opacity-90" />
                  Full coverage
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-[0.2rem] bg-[rgba(255,253,250,0.06)] ring-1 ring-[var(--border)]" />
                  Coming soon
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {states.map((state) => (
                <article
                  key={state.shortName}
                  className="group cursor-pointer rounded-[1.4rem] border border-[var(--border)] bg-[var(--glass)] p-5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(184,125,69,0.42)] hover:bg-[rgba(8,6,4,0.58)] hover:shadow-[0_18px_60px_rgba(0,0,0,0.34),0_0_30px_rgba(184,125,69,0.2)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-medium text-[rgba(255,253,250,0.9)] transition-colors duration-300 group-hover:text-white">
                        {state.name}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)] transition-colors duration-300 group-hover:text-[rgba(255,253,250,0.78)]">
                        {state.description}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex shrink-0 rounded-full border px-3 py-1 font-mono text-[0.66rem] uppercase tracking-[0.16em]",
                        state.tone === "green"
                          ? "border-[rgba(61,158,95,0.32)] bg-[rgba(61,158,95,0.12)] text-[var(--green)]"
                          : "border-[rgba(184,125,69,0.34)] bg-[rgba(184,125,69,0.12)] text-[var(--accent)]",
                      )}
                    >
                      {state.status}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal id="pipeline" className="mx-auto max-w-6xl px-5 py-24 sm:px-8 lg:px-12">
          <h2 className="text-center font-display text-5xl tracking-[-0.045em] sm:text-7xl">
            How data gets to you.
          </h2>
          <div className="relative mt-14 grid gap-6 md:grid-cols-3">
            <svg
              className="pointer-events-none absolute left-[16%] right-[16%] top-9 hidden h-8 w-[68%] text-[rgba(184,125,69,0.42)] md:block"
              viewBox="0 0 700 48"
              fill="none"
              aria-hidden
            >
              <path
                d="M4 24 C160 4 214 44 350 24 C486 4 540 44 696 24"
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="8 10"
              />
            </svg>
            {pipelineSteps.map((step) => (
              <article
                key={step.number}
                className="group relative cursor-pointer rounded-[1.6rem] border border-[var(--border)] bg-[rgba(8,6,4,0.42)] p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(184,125,69,0.42)] hover:bg-[rgba(8,6,4,0.56)] hover:shadow-[0_18px_60px_rgba(0,0,0,0.36),0_0_32px_rgba(184,125,69,0.2)]"
              >
                <p className="font-mono text-5xl text-[rgba(184,125,69,0.54)] transition-colors duration-300 group-hover:text-[rgba(212,149,79,0.92)]">
                  {step.number}
                </p>
                <h3 className="mt-6 font-display text-3xl tracking-[-0.035em]">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--text-muted)] transition-colors duration-300 group-hover:text-[rgba(255,253,250,0.78)]">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </Reveal>

        <Reveal id="coming-soon" className="mx-auto max-w-6xl px-5 py-24 sm:px-8 lg:px-12">
          <h2 className="text-center font-display text-5xl tracking-[-0.045em] sm:text-7xl">
            On the roadmap.
          </h2>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {roadmap.map(({ icon: Icon, title, copy }) => (
              <article
                key={title}
                className="group relative cursor-pointer rounded-[1.75rem] border border-[var(--border)] bg-[var(--glass)] p-7 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(184,125,69,0.42)] hover:bg-[rgba(8,6,4,0.58)] hover:shadow-[0_18px_60px_rgba(0,0,0,0.34),0_0_30px_rgba(184,125,69,0.2)]"
              >
                <span className="absolute right-5 top-5 rounded-full border border-[rgba(184,125,69,0.34)] bg-[rgba(184,125,69,0.12)] px-3 py-1 font-mono text-[0.66rem] uppercase tracking-[0.16em] text-[var(--accent)]">
                  Coming soon
                </span>
                <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(184,125,69,0.26)] bg-[rgba(184,125,69,0.1)] text-[var(--accent)]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-3xl tracking-[-0.035em] transition-colors duration-300 group-hover:text-[rgba(255,253,250,0.98)]">
                  {title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-[var(--text-muted)] transition-colors duration-300 group-hover:text-[rgba(255,253,250,0.78)]">
                  {copy}
                </p>
              </article>
            ))}
          </div>
        </Reveal>

        <Reveal id="final-cta" className="px-5 py-28 text-center sm:px-8 lg:px-12">
          <div className="mx-auto max-w-4xl rounded-[2rem] border border-[rgba(184,125,69,0.28)] bg-[radial-gradient(circle_at_50%_0%,rgba(184,125,69,0.18),transparent_48%),var(--glass)] p-8 backdrop-blur-2xl sm:p-12">
            <h2 className="font-display text-5xl leading-[0.95] tracking-[-0.045em] sm:text-7xl">
              The data is real. The map is live.
            </h2>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                asChild
                className="h-12 rounded-full bg-[var(--accent)] px-6 text-sm text-[#07050a] shadow-[0_0_38px_rgba(184,125,69,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#d79a55] hover:shadow-[0_0_62px_rgba(184,125,69,0.48),0_10px_28px_rgba(0,0,0,0.35)]"
              >
                <Link href="/map">Explore MinAtlas →</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="h-12 rounded-full border border-[var(--border)] bg-[rgba(255,253,250,0.03)] px-6 text-sm text-[rgba(255,253,250,0.82)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(184,125,69,0.42)] hover:bg-[rgba(255,253,250,0.09)] hover:text-white hover:shadow-[0_0_30px_rgba(184,125,69,0.18)]"
              >
                <Link href="/product">View product →</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </main>
  );
}

function AustraliaMap() {
  return (
    <div
      className="relative mx-auto w-full max-w-[620px] overflow-hidden rounded-[1.35rem]"
      style={{
        WebkitMaskImage:
          "radial-gradient(ellipse at center, rgba(0,0,0,1) 72%, rgba(0,0,0,0) 100%)",
        maskImage:
          "radial-gradient(ellipse at center, rgba(0,0,0,1) 72%, rgba(0,0,0,0) 100%)",
      }}
    >
      <Image
        src="/images/coverage-map-reference.png"
        alt="Australia map with WA in full coverage and other states coming soon"
        width={1024}
        height={640}
        className="h-auto w-full select-none"
        priority={false}
      />
      <div
        className="pointer-events-none absolute inset-0 rounded-[1.35rem]"
        style={{
          background:
            "linear-gradient(to right, rgba(7,5,10,0.78) 0%, rgba(7,5,10,0.34) 10%, rgba(7,5,10,0) 22%, rgba(7,5,10,0) 88%, rgba(7,5,10,0.52) 100%), linear-gradient(to bottom, rgba(7,5,10,0.76) 0%, rgba(7,5,10,0.32) 10%, rgba(7,5,10,0) 24%, rgba(7,5,10,0) 82%, rgba(7,5,10,0.58) 100%)",
        }}
        aria-hidden
      />
    </div>
  );
}
