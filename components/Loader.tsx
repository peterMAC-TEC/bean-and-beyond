"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { play } from "@/lib/sound";

const KEY = "bb-visited";

/**
 * Loading screen: a bottle fills with coffee as the page really loads
 * (fonts + page assets), the label stamps on, then a bar curtain opens.
 * Repeat visitors get a quick fade instead.
 */
export function Loader() {
  const root = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const el = root.current!;
    const q = gsap.utils.selector(el);
    const html = document.documentElement;
    html.style.overflow = "hidden";
    const finish = () => {
      html.style.overflow = "";
      setDone(true);
      window.dispatchEvent(new Event("bb:ready"));
    };

    let repeat = false;
    try {
      repeat = localStorage.getItem(KEY) === "1";
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (repeat || reduced) {
      gsap.to(el, { opacity: 0, duration: 0.35, delay: 0.1, onComplete: finish });
      return;
    }

    // Real progress: fonts and the window load event each count for a share.
    const state = { target: 0.12, shown: 0 };
    document.fonts.ready.then(() => (state.target += 0.4));
    const onLoad = () => (state.target += 0.48);
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });

    const bar = q(".ld-bar")[0];
    const pct = q(".ld-pct")[0];
    let opened = false;
    const tick = () => {
      state.shown += (Math.min(state.target, 1) - state.shown) * 0.08;
      gsap.set(bar, { scaleX: state.shown });
      pct.textContent = String(Math.round(state.shown * 100)).padStart(3, "0");
      if (state.shown > 0.995 && !opened) {
        opened = true;
        gsap.ticker.remove(tick);
        open();
      }
    };
    gsap.ticker.add(tick);
    // never trap anyone: open after 6s whatever happens
    const failsafe = window.setTimeout(() => (state.target = 1), 6000);

    const open = () => {
      gsap
        .timeline({ onComplete: finish })
        .fromTo(q(".ld-stamp"), { scale: 2.2, opacity: 0, rotate: -14 }, { scale: 1, opacity: 1, rotate: -6, duration: 0.3, ease: "power4.in", onComplete: () => play("stamp") })
        .to(q(".ld-center"), { opacity: 0, y: -20, duration: 0.4, delay: 0.45 })
        .to(el, { yPercent: -100, duration: 0.9, ease: "power4.inOut" }, "<0.15");
    };

    return () => {
      gsap.ticker.remove(tick);
      window.clearTimeout(failsafe);
      window.removeEventListener("load", onLoad);
    };
  }, []);

  if (done) return null;

  return (
    <div ref={root} id="bb-loader" className="fixed inset-0 z-[10000] bg-ink" aria-live="polite" aria-label="Loading Bean & Beyond">
      <div className="ld-center absolute inset-0 flex flex-col items-center justify-center px-8">
        <p className="mono text-muted">BB-01 · Batch No. 01 · {new Date().getFullYear()}</p>
        <div className="relative mt-5">
          <p className="serif text-5xl text-cream sm:text-7xl">
            Bean <span className="italic text-gold">&amp;</span> Beyond
          </p>
          <p className="ld-stamp mono absolute -right-6 -top-6 border border-brick px-2 py-1 !text-[11px] text-[#e0604f] opacity-0">0% ABV</p>
        </div>
        <div className="mt-8 w-[min(420px,80vw)]">
          <div className="relative h-3 overflow-hidden" aria-hidden>
            <div className="absolute inset-0" style={{ background: "repeating-linear-gradient(90deg, rgba(220,192,138,.3) 0 1px, transparent 1px 7px)" }} />
            <div className="ld-bar absolute inset-0 origin-left" style={{ transform: "scaleX(0)", background: "repeating-linear-gradient(90deg, var(--glow) 0 1px, transparent 1px 7px)" }} />
          </div>
          <p className="mono mt-3 flex justify-between text-muted">
            <span>Pouring</span>
            <span>
              <span className="ld-pct">000</span>%
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
