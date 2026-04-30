"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { BarChart2, Check, ExternalLink, Map, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { id: "overview", label: "Overview" },
  { id: "features", label: "Features" },
  { id: "how", label: "How it Works" },
  { id: "who", label: "Who it's for" },
];

const mapBullets = [
  "Interactive layers by commodity, status and region",
  "Real-time data from DMIRS and Geoscience Australia",
  "2,847+ mine sites across Australia",
];

const pillars = [
  {
    icon: Map,
    title: "Explore",
    copy:
      "Navigate WA's full mining footprint by region, commodity, operator or status. Move from a national view to site-level context without fighting legacy GIS tools.",
  },
  {
    icon: BarChart2,
    title: "Evaluate",
    copy:
      "Open any site to see operator details, commodity mix, tenement status and production profile. Compare the signals that matter before you go deeper.",
  },
  {
    icon: Zap,
    title: "Act",
    copy:
      "Watchlist sites, get alerts when status changes, generate AI-powered site briefs. Turn raw public data into a faster operating rhythm.",
  },
];

const reportFeatures = [
  "Full operator and commodity profile",
  "Nearby tenement activity",
  "Production and status history",
];

const commodities = [
  { name: "Gold", color: "#f5c842" },
  { name: "Silver", color: "#b0b8c1" },
  { name: "Iron Ore", color: "#c1440e" },
  { name: "Copper", color: "#b87d45" },
  { name: "Lithium", color: "#6ec6f5" },
  { name: "Nickel", color: "#7ab87a" },
  { name: "Zinc", color: "rgba(255,253,250,0.34)" },
  { name: "Lead", color: "rgba(255,253,250,0.34)" },
  { name: "Cobalt", color: "rgba(255,253,250,0.34)" },
  { name: "Manganese", color: "rgba(255,253,250,0.34)" },
  { name: "Uranium", color: "rgba(255,253,250,0.34)" },
];
const marqueeCommodities = [...commodities, ...commodities];

const steps = [
  {
    number: "01",
    title: "Open the map",
    description: "No account needed, jump straight in.",
  },
  {
    number: "02",
    title: "Filter and explore",
    description: "Narrow by commodity, status, region or operator.",
  },
  {
    number: "03",
    title: "Go deep on any site",
    description: "Click any marker to see the full site profile.",
  },
];

const audiences = [
  {
    title: "FIFO Worker",
    copy:
      "Research your next swing before you fly in. Check operator, site status, roster type and nearby infrastructure.",
  },
  {
    title: "Junior Investor",
    copy:
      "Track exploration projects, tenement holders and commodity exposure across the WA goldfields and Pilbara.",
  },
  {
    title: "Exploration Geologist",
    copy:
      "Scout open ground, historical drill activity and active tenement boundaries without touching TENGRAPH.",
  },
  {
    title: "Mining Professional",
    copy:
      "Fast visual overview of any region or operator footprint, no enterprise contract required.",
  },
];

const stats = [
  { value: "2,847+", label: "Mine sites" },
  { value: "Daily", label: "Refresh cadence" },
  { value: "Free", label: "Public data sources" },
];

const sources = [
  { label: "DMIRS MINEDEX", href: "https://minedex.dmirs.wa.gov.au/Web/home" },
  { label: "Geoscience Australia", href: "https://www.ga.gov.au/" },
  { label: "WA Government SLIP Services", href: "https://data.wa.gov.au/slip" },
];

const reportRows = [
  { label: "OPERATOR", value: "Flushing Meadows Mining Pty Ltd" },
  { label: "REGION", value: "Pilbara corridor" },
  { label: "TENEMENT", value: "Active development lease" },
  { label: "SIGNAL", value: "Nearby activity increasing" },
];

type RevealProps = {
  id: string;
  as?: "section" | "div";
  className?: string;
  children: ReactNode;
};

export default function ProductPage() {
  const scrollRef = useRef<HTMLElement>(null);
  const scrollAnimRef = useRef<number | null>(null);
  const cursorGlowRef = useRef<HTMLDivElement>(null);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(() => new Set());
  const [activeSection, setActiveSection] = useState("overview");
  const handleNavClick = (sectionId: string) => (event: ReactMouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setActiveSection((prev) => (prev === sectionId ? prev : sectionId));
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
    const revealed = new Set<string>();
    let raf = 0;

    const update = () => {
      const viewportHeight = window.innerHeight;
      revealNodes.forEach((node) => {
        const revealId = node.getAttribute("data-reveal-id");
        if (!revealId || revealed.has(revealId)) return;
        const rect = node.getBoundingClientRect();
        if (rect.top <= viewportHeight * 0.88) {
          revealed.add(revealId);
        }
      });
      setVisibleSections((prev) => {
        if (prev.size === revealed.size) {
          let unchanged = true;
          prev.forEach((id) => {
            if (!revealed.has(id)) unchanged = false;
          });
          if (unchanged) return prev;
        }
        return new Set(revealed);
      });

      const activeNodes = navItems
        .map(({ id }) => root.querySelector<HTMLElement>(`#${id}`))
        .filter((node): node is HTMLElement => Boolean(node));

      const sectionTops = activeNodes
        .map((node) => ({ id: node.id, top: node.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop }))
        .sort((a, b) => a.top - b.top);
      const marker = root.scrollTop + 140;
      let currentActive = sectionTops[0]?.id ?? navItems[0]?.id ?? "overview";
      sectionTops.forEach((section) => {
        if (marker >= section.top) currentActive = section.id;
      });

      setActiveSection((prev) => (prev === currentActive ? prev : currentActive));
      raf = 0;
    };

    const onScrollOrResize = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(update);
    };

    update();
    root.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);

    return () => {
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
        <div className="mx-auto grid w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center">
          <div className="flex justify-end pr-2">
            <Link
              href="/"
              className="whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--glass)] px-4 py-2 text-xs font-medium tracking-[0.08em] text-[rgba(255,253,250,0.86)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(184,125,69,0.42)] hover:bg-[rgba(184,125,69,0.16)] hover:shadow-[0_0_22px_rgba(184,125,69,0.2)]"
            >
              Home
            </Link>
          </div>

          <div className="flex max-w-full gap-2 overflow-x-auto rounded-full border border-[var(--border)] bg-[var(--glass)] p-1 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={handleNavClick(item.id)}
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
            <Link
              href="/data"
              className="whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--glass)] px-4 py-2 text-xs font-medium tracking-[0.08em] text-[rgba(255,253,250,0.86)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(184,125,69,0.42)] hover:bg-[rgba(184,125,69,0.16)] hover:shadow-[0_0_22px_rgba(184,125,69,0.2)]"
            >
              Data
            </Link>
          </div>
        </div>
      </nav>

      <div className="relative z-10">
        <section
          id="overview"
          className="relative flex min-h-[92vh] items-center overflow-hidden px-5 py-24 sm:px-8 lg:px-12"
        >
          <div
            className="absolute inset-0 opacity-40"
            style={
              {
                backgroundImage:
                  "url('/images/pilbara-hero.jpg'), radial-gradient(circle at 58% 36%, rgba(184,125,69,0.28), transparent 34%), linear-gradient(135deg, #171016, #07050a)",
                backgroundSize: "cover",
                backgroundPosition: "center",
              } as CSSProperties
            }
            aria-hidden
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,5,10,0.96)_0%,rgba(7,5,10,0.78)_48%,rgba(7,5,10,0.9)_100%),radial-gradient(circle_at_70%_36%,rgba(184,125,69,0.18),transparent_38%)]" />

          <Reveal
            id="hero"
            as="div"
            className="relative mx-auto flex w-full max-w-6xl flex-col items-start"
          >
            <p className="mb-6 font-mono text-xs uppercase tracking-[0.28em] text-[var(--accent)]">
              MinAtlas Product
            </p>
            <h1 className="max-w-5xl font-display text-[clamp(3.7rem,9vw,8.5rem)] font-normal leading-[0.9] tracking-[-0.055em] text-[rgba(255,253,250,0.96)]">
              Australia&apos;s mining intelligence, finally built right.
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-[var(--text-muted)] sm:text-xl">
              Public mining data finally made beautiful, fast and actually usable.
            </p>
            <Button
              asChild
              className="mt-10 h-12 rounded-full bg-[var(--accent)] px-6 text-sm text-[#07050a] shadow-[0_0_38px_rgba(184,125,69,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#d79a55] hover:shadow-[0_0_58px_rgba(184,125,69,0.5),0_10px_30px_rgba(0,0,0,0.35)]"
            >
              <Link href="/map">Open the Map →</Link>
            </Button>
          </Reveal>
        </section>

        <Reveal
          id="map-teaser"
          className="mx-auto grid max-w-6xl gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:px-12"
        >
          <div className="flex flex-col justify-center">
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.22em] text-[var(--accent)]">
              Live map teaser
            </p>
            <h2 className="font-display text-5xl leading-none tracking-[-0.045em] sm:text-7xl">
              The map, reimagined.
            </h2>
            <ul className="mt-8 space-y-4 text-sm leading-7 text-[var(--text-muted)] sm:text-base">
              {mapBullets.map((bullet) => (
                <li key={bullet} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_18px_rgba(184,125,69,0.55)]" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          <Link
            href="/map"
            className="group relative block cursor-pointer rounded-[2rem] border border-[rgba(184,125,69,0.45)] bg-[rgba(8,6,4,0.62)] p-3 shadow-[0_0_80px_rgba(184,125,69,0.18)] backdrop-blur-2xl transition-all duration-300 ease-out motion-safe:animate-[pulse_6s_ease-in-out_infinite] hover:-translate-y-1 hover:border-[rgba(184,125,69,0.82)] hover:shadow-[0_18px_68px_rgba(184,125,69,0.33),0_0_80px_rgba(184,125,69,0.32)] hover:motion-safe:animate-none"
            aria-label="Open MinAtlas live map"
          >
            <span
              className="pointer-events-none absolute inset-0 rounded-[2rem] ring-1 ring-[rgba(184,125,69,0.08)] transition-opacity duration-300 group-hover:opacity-100"
              aria-hidden
            />
            <div className="relative aspect-[16/10] overflow-hidden rounded-[1.45rem] border border-[var(--border)] bg-[radial-gradient(circle_at_35%_30%,rgba(184,125,69,0.22),transparent_32%),linear-gradient(135deg,#151018,#07050a)]">
              <div
                className="absolute inset-0 opacity-90"
                style={
                  {
                    backgroundImage:
                      "url('/images/map-preview.jpg'), radial-gradient(circle at 30% 25%, rgba(184,125,69,0.26), transparent 30%), radial-gradient(circle at 72% 62%, rgba(61,158,95,0.15), transparent 26%), linear-gradient(135deg, #151018, #07050a)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  } as CSSProperties
                }
                role="img"
                aria-label="MinAtlas interactive map preview"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(7,5,10,0.66)_100%)]" />
              <span className="absolute bottom-4 right-4 rounded-full border border-[rgba(184,125,69,0.46)] bg-[rgba(8,6,4,0.72)] px-4 py-2 text-xs font-medium text-[rgba(255,253,250,0.93)] backdrop-blur-xl transition-all duration-300 group-hover:border-[var(--accent)] group-hover:text-white group-hover:shadow-[0_0_28px_rgba(184,125,69,0.32)]">
                Try it live →
              </span>
            </div>
          </Link>
        </Reveal>

        <Reveal id="features" className="mx-auto max-w-6xl px-5 py-24 sm:px-8 lg:px-12">
          <h2 className="text-center font-display text-5xl tracking-[-0.045em] sm:text-7xl">
            Explore. Evaluate. Act.
          </h2>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {pillars.map(({ icon: Icon, title, copy }) => (
              <article
                key={title}
                className="group rounded-[1.75rem] border border-[var(--border)] border-t-[rgba(184,125,69,0.72)] bg-[var(--glass)] p-7 backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:border-[rgba(184,125,69,0.35)] hover:shadow-[0_22px_70px_rgba(184,125,69,0.12)]"
              >
                <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(184,125,69,0.26)] bg-[rgba(184,125,69,0.1)] text-[var(--accent)]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-3xl tracking-[-0.035em]">{title}</h3>
                <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">{copy}</p>
              </article>
            ))}
          </div>
        </Reveal>

        <Reveal className="bg-[rgba(184,125,69,0.035)] px-5 py-24 sm:px-8 lg:px-12" id="ai-report">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="flex flex-col justify-center">
              <span className="mb-5 inline-flex w-fit rounded-full border border-[rgba(184,125,69,0.38)] bg-[rgba(184,125,69,0.12)] px-3 py-1 font-mono text-[0.66rem] uppercase tracking-[0.18em] text-[var(--accent)]">
                Coming soon
              </span>
              <h2 className="font-display text-5xl leading-[0.96] tracking-[-0.045em] sm:text-7xl">
                Generate a site brief in seconds.
              </h2>
              <p className="mt-7 max-w-xl text-base leading-8 text-[var(--text-muted)]">
                AI-powered synthesis of all available data into a clean one-page
                intelligence brief per mine site, giving you the operator, commodity,
                tenement and status context without manual research.
              </p>
              <div className="mt-8 space-y-4">
                {reportFeatures.map((feature) => (
                  <div key={feature} className="flex items-center gap-3 text-sm text-[rgba(255,253,250,0.82)]">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(61,158,95,0.12)] text-[var(--green)]">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    {feature}
                  </div>
                ))}
              </div>
            </div>

            <div className="group rounded-[2rem] border border-[var(--border)] bg-[var(--glass)] p-4 backdrop-blur-2xl shadow-[0_30px_100px_rgba(0,0,0,0.36)] transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(184,125,69,0.36)] hover:shadow-[0_35px_110px_rgba(0,0,0,0.45),0_0_70px_rgba(184,125,69,0.2)]">
              <div className="rounded-[1.45rem] border border-[var(--border)] bg-[rgba(7,5,10,0.74)] p-6 transition-all duration-300 group-hover:border-[rgba(184,125,69,0.3)] group-hover:bg-[rgba(7,5,10,0.82)]">
                <div className="h-px w-full bg-[linear-gradient(90deg,transparent,var(--accent),transparent)]" />
                <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[0.66rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                      AI Site Brief
                    </p>
                    <h3 className="mt-3 font-display text-4xl tracking-[-0.045em]">
                      Flushing Meadows, WA
                    </h3>
                  </div>
                  <span className="rounded-full border border-[rgba(184,125,69,0.34)] bg-[rgba(184,125,69,0.12)] px-3 py-1 font-mono text-[0.66rem] uppercase tracking-[0.16em] text-[var(--accent)]">
                    Development
                  </span>
                </div>
                <div className="mt-5 flex gap-2">
                  <span className="rounded-full bg-[rgba(245,200,66,0.12)] px-3 py-1 font-mono text-xs text-[#f5c842]">
                    AU
                  </span>
                  <span className="rounded-full bg-[rgba(176,184,193,0.12)] px-3 py-1 font-mono text-xs text-[#b0b8c1]">
                    AG
                  </span>
                </div>
                <div className="mt-8 divide-y divide-[var(--border)]">
                  {reportRows.map((row) => (
                    <div key={row.label} className="grid gap-2 py-4 sm:grid-cols-[9rem_1fr]">
                      <span className="font-mono text-[0.64rem] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        {row.label}
                      </span>
                      <span className="text-sm text-[rgba(255,253,250,0.78)]">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal id="commodities" className="mx-auto max-w-6xl px-5 py-24 text-center sm:px-8 lg:px-12">
          <h2 className="font-display text-5xl tracking-[-0.045em] sm:text-7xl">
            Commodities tracked.
          </h2>
          <div
            className="relative mt-10 overflow-hidden"
            style={
              {
                WebkitMaskImage:
                  "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
                maskImage:
                  "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
              } as CSSProperties
            }
          >
            <div className="flex w-max animate-[commodityMarquee_44s_linear_infinite] gap-3 pr-3">
              {marqueeCommodities.map((commodity, index) => (
                <span
                  key={`${commodity.name}-${index}`}
                  className="inline-flex shrink-0 cursor-pointer select-none items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--glass)] px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-[rgba(255,253,250,0.74)] backdrop-blur-xl transition-all duration-300 hover:border-[rgba(184,125,69,0.45)] hover:bg-[rgba(255,253,250,0.07)] hover:text-[rgba(255,253,250,0.97)] hover:shadow-[0_0_22px_rgba(184,125,69,0.26)]"
                >
                  <span
                    className="h-2 w-2 rounded-full animate-[commodityPulse_2.4s_ease-in-out_infinite]"
                    style={{ backgroundColor: commodity.color, color: commodity.color } as CSSProperties}
                  />
                  {commodity.name}
                </span>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal id="how" className="mx-auto max-w-6xl px-5 py-24 sm:px-8 lg:px-12">
          <h2 className="text-center font-display text-5xl tracking-[-0.045em] sm:text-7xl">
            How it works
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
            {steps.map((step) => (
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

        <Reveal id="who" className="mx-auto max-w-6xl px-5 py-24 sm:px-8 lg:px-12">
          <h2 className="text-center font-display text-5xl tracking-[-0.045em] sm:text-7xl">
            Who it&apos;s for
          </h2>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {audiences.map((audience) => (
              <article
                key={audience.title}
                className="group cursor-pointer rounded-[1.75rem] border border-[var(--border)] bg-[var(--glass)] p-7 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(184,125,69,0.42)] hover:bg-[rgba(8,6,4,0.58)] hover:shadow-[0_18px_60px_rgba(0,0,0,0.34),0_0_30px_rgba(184,125,69,0.2)]"
              >
                <h3 className="font-display text-3xl tracking-[-0.035em] transition-colors duration-300 group-hover:text-[rgba(255,253,250,0.98)]">
                  {audience.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-[var(--text-muted)] transition-colors duration-300 group-hover:text-[rgba(255,253,250,0.78)]">
                  {audience.copy}
                </p>
              </article>
            ))}
          </div>
        </Reveal>

        <Reveal id="data" className="bg-[rgba(255,253,250,0.025)] px-5 py-24 text-center sm:px-8 lg:px-12">
          <div className="mx-auto max-w-6xl">
            <h2 className="font-display text-5xl tracking-[-0.045em] sm:text-7xl">
              Built on real government data.
            </h2>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="group cursor-pointer rounded-[1.6rem] border border-[var(--border)] bg-[var(--glass)] p-7 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(184,125,69,0.42)] hover:bg-[rgba(8,6,4,0.58)] hover:shadow-[0_18px_60px_rgba(0,0,0,0.34),0_0_30px_rgba(184,125,69,0.2)]"
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
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {sources.map((source) => (
                <a
                  key={source.label}
                  href={source.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--border)] bg-[rgba(8,6,4,0.48)] px-4 py-2 text-sm text-[rgba(255,253,250,0.72)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(184,125,69,0.45)] hover:bg-[rgba(8,6,4,0.62)] hover:text-[rgba(255,253,250,0.93)] hover:shadow-[0_0_24px_rgba(184,125,69,0.18)]"
                >
                  {source.label}
                  <ExternalLink className="h-3.5 w-3.5 text-[var(--accent)]" />
                </a>
              ))}
            </div>
            <p className="mt-8 font-mono text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Ingested nightly at 02:00 via live ArcGIS REST endpoints. Upserted, never overwritten.
            </p>
          </div>
        </Reveal>

        <Reveal id="final-cta" className="px-5 py-28 text-center sm:px-8 lg:px-12">
          <div className="mx-auto max-w-4xl rounded-[2rem] border border-[rgba(184,125,69,0.28)] bg-[radial-gradient(circle_at_50%_0%,rgba(184,125,69,0.18),transparent_48%),var(--glass)] p-8 backdrop-blur-2xl sm:p-12">
            <h2 className="font-display text-5xl leading-[0.95] tracking-[-0.045em] sm:text-7xl">
              The map is live. The data is real.
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
                <Link href="/data">View data sources →</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
      <style jsx global>{`
        @keyframes commodityMarquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        @keyframes commodityPulse {
          0%,
          100% {
            transform: scale(0.95);
            opacity: 0.72;
            box-shadow: 0 0 0 rgba(255, 255, 255, 0);
          }
          50% {
            transform: scale(1.26);
            opacity: 1;
            box-shadow: 0 0 10px currentColor;
          }
        }
      `}</style>
    </main>
  );
}
