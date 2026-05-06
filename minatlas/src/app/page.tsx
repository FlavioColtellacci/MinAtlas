"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";

import styles from "./page.module.css";

export default function Home() {
  const parallaxRef = useRef<HTMLDivElement>(null);
  const cursorGlowRef = useRef<HTMLDivElement>(null);

  const handleTitlePointerMove = (event: ReactPointerEvent<HTMLHeadingElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--shine-x", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--shine-y", `${event.clientY - rect.top}px`);
  };

  useEffect(() => {
    const node = parallaxRef.current;
    if (!node) return;

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let raf = 0;

    const onMove = (e: globalThis.PointerEvent) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      targetX = (e.clientX / w - 0.5) * 2;
      targetY = (e.clientY / h - 0.5) * 2;
    };

    const tick = () => {
      currentX += (targetX - currentX) * 0.05;
      currentY += (targetY - currentY) * 0.05;
      const ry = currentX * 2.4;
      const rx = -currentY * 1.4;
      const tx = currentX * 0.6;
      const ty = currentY * 0.4;
      node.style.transform =
        `translate3d(${tx}%, ${ty}%, 0) rotateX(${rx}deg) rotateY(${ry}deg)`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const glow = cursorGlowRef.current;
    if (!glow) return;

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

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave);

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <main className={styles.root}>
      <div
        ref={cursorGlowRef}
        className="pointer-events-none fixed left-0 top-0 z-40 h-60 w-60 rounded-full bg-[radial-gradient(circle,rgba(184,125,69,0.2)_0%,rgba(184,125,69,0.08)_36%,rgba(184,125,69,0)_72%)] blur-2xl transition-opacity duration-300"
        aria-hidden
      />
      <div className={styles.beams} aria-hidden />

      <div className={styles.stage} aria-hidden>
        <div ref={parallaxRef} className={styles.parallax}>
          <div className={styles.globeWrap}>
            <div className={styles.globeBreath}>
              <Image
                src="/globe-australia.jpg"
                alt=""
                fill
                priority
                quality={95}
                sizes="100vw"
                className={styles.globe}
              />
            </div>
            <div className={styles.rim} />
          </div>
        </div>
      </div>

      <div className={styles.waGlow} aria-hidden />

      <div className={styles.vignette} aria-hidden />

      <nav className={styles.nav} aria-label="Primary">
        <div className={styles.logo}>MinAtlas</div>
        <div className={styles.navLinks}>
          <Link href="/product" className={styles.navLink}>
            Product
          </Link>
          <Link href="/data" className={styles.navLink}>
            Data
          </Link>
          <Link href="/news" className={styles.navLink}>
            News
          </Link>
          <span className={styles.navSep} aria-hidden />
          <span className={styles.livePill}>
            <span className={styles.liveDot} aria-hidden />
            Live data
          </span>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.title} onPointerMove={handleTitlePointerMove}>
            Min<em className={styles.titleAccent}>Atlas</em>
          </h1>

          <p className={styles.sub}>
            Map-first intelligence for Australia&rsquo;s mining sector. Explore
            mine sites, tenements, operators and commodities with clarity.
          </p>

          <div className={styles.stats}>
            <div className={`${styles.stat} ${styles.statHi}`}>
              4,500+ active mine sites
            </div>
            <div className={styles.stat}>48,000+ recorded sites</div>
            <div className={styles.stat}>11 commodities</div>
            <div className={styles.stat}>Western Australia</div>
            <div className={styles.stat}>14 active clusters</div>
            <div className={styles.stat}>Updated daily</div>
          </div>

          <div className={styles.cta}>
            <Link href="/map?intro=landing" className={styles.btnPrimary}>
              Explore the Atlas
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
                <path
                  d="M1 6.5h11M6.5 1l5.5 5.5L6.5 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <Link href="/product#how" className={styles.btnGhost}>
              How it works
            </Link>
          </div>
        </div>
      </section>

      <div className={styles.bottom}>
        <span className={styles.bottomText}>
          Data &middot; DMIRS &middot; Geoscience Australia
        </span>
        <span className={styles.bottomSep} aria-hidden />
        <span className={styles.bottomText}>Free to explore</span>
        <span className={styles.bottomSep} aria-hidden />
        <span className={styles.bottomText}>No account required</span>
      </div>

      <div className={styles.brandMark}>
        <span className={styles.brandTick} aria-hidden />
        <span className={styles.brandMarkText}>v0.1 &middot; Public beta</span>
      </div>

      <div className={styles.scrollIndicator} aria-hidden>
        <span className={styles.scrollLabel}>Explore</span>
        <span className={styles.scrollBar} />
      </div>
    </main>
  );
}
