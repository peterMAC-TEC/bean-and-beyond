"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { play } from "@/lib/sound";
import type { Fluid } from "@/lib/fluid";
import { Button } from "./Button";

// When each moment happens, as a share of the section's scroll
const POUR_AT = 0.14;
const SWIRL_AT = 0.52;
const STIR_AT = 0.78;

const CHAPTERS = [
  { at: 0, kicker: "04. Neat", title: "Black, cold, patient.", text: "180 ml of black coffee, waiting for its other half." },
  { at: POUR_AT, kicker: "05. Pour", title: "In goes the milk.", text: "Thirty millilitres of condensed milk, sinking and blooming.", milk: true },
  { at: SWIRL_AT, kicker: "06. Swirl", title: "Watch it marble.", text: "Cap it, swirl it. Black coffee turns Vietnamese." },
  { at: STIR_AT, kicker: "07. Your turn", title: "Stir it yourself.", text: "Drag to stir. Tap to pour more milk. No two cups marble the same.", cta: true },
];
const FADE = 0.03;

/**
 * The pour: a live fluid simulation of condensed milk marbling through black
 * coffee. Scrolling pours and swirls it; the visitor can stir and pour too.
 */
export function Marble() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ok, setOk] = useState(true);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = wrap.current!;
    const c = canvas.current!;
    const chapters = Array.from(el.querySelectorAll<HTMLElement>("[data-mchapter]"));
    const milkOut = el.querySelector<HTMLElement>("[data-mmilk]");
    let fluid: Fluid | null = null;
    let cancelled = false;

    // ---- scripted moments ----
    let poured = false;
    let swirled = false;
    let pourT = -1; // seconds into the automatic pour, -1 = not pouring
    let swirlT = -1;
    let milkMl = 0;
    let raf = 0;
    let lastT = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - lastT) / 1000, 0.05);
      lastT = now;
      if (!fluid) return;
      if (pourT >= 0) {
        pourT += dt;
        // a thick stream for ~2.4 s: milk lands near the centre and blooms out
        if (pourT < 2.4) {
          const a = Math.random() * Math.PI * 2;
          const wob = Math.sin(pourT * 9) * 0.012;
          const narrow = innerWidth < innerHeight ? 0.45 : 1; // splash size is relative to height, so shrink it on tall phones
          fluid.splat(0.56 + wob, 0.62 + Math.cos(pourT * 7) * 0.012, Math.cos(a) * 340, Math.sin(a) * 340, 0.26 * (0.6 + narrow * 0.4), (0.025 + Math.random() * 0.04) * narrow);
          milkMl = Math.min(30, (pourT / 2.4) * 30);
        } else pourT = -1;
      }
      if (swirlT >= 0) {
        swirlT += dt;
        if (swirlT < 2.2) fluid.vortex(0.55, 0.55, 120 * Math.sin((swirlT / 2.2) * Math.PI));
        else swirlT = -1;
      }
      if (milkOut) milkOut.textContent = String(Math.round(milkMl)).padStart(2, "0");
    };

    // ---- scroll: chapters + triggers ----
    let frame = 0;
    const update = () => {
      frame = 0;
      const top = el.getBoundingClientRect().top;
      const p = Math.min(1, Math.max(0, -top / (el.offsetHeight - innerHeight)));
      chapters.forEach((ch, i) => {
        const a = CHAPTERS[i].at;
        const b = CHAPTERS[i + 1]?.at ?? 2;
        const o = Math.max(0, Math.min(i === 0 ? 1 : (p - a) / FADE, (b - p) / FADE, 1));
        ch.style.opacity = String(o);
        ch.style.transform = `translateY(${(1 - o) * 18}px)`;
        ch.style.visibility = o > 0.01 ? "visible" : "hidden";
      });
      if (!fluid) return;
      if (p >= POUR_AT && !poured) {
        poured = true;
        pourT = 0;
        play("pour");
      }
      if (p >= SWIRL_AT && !swirled) {
        swirled = true;
        swirlT = 0;
        play("slosh");
        play("whoosh", { gain: 0.4 });
      }
      // back above the pour: clean coffee, ready to pour again
      if (p < POUR_AT * 0.5 && poured) {
        poured = swirled = false;
        pourT = swirlT = -1;
        milkMl = 0;
        fluid.reset();
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    // ---- the visitor's hand ----
    let down = false;
    let lastSlosh = 0;
    let lx = 0;
    let ly = 0;
    const pos = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      return [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height] as const;
    };
    const onMove = (e: PointerEvent) => {
      if (!fluid) return;
      const [x, y] = pos(e);
      const dx = (x - lx) * 6000;
      const dy = (y - ly) * 6000;
      lx = x;
      ly = y;
      if (Math.abs(dx) + Math.abs(dy) > 1) fluid.splat(x, y, dx, dy, down ? 0.12 : 0, down ? 0.12 : 0.18);
      const now = performance.now();
      if (Math.hypot(dx, dy) > 60 && now - lastSlosh > 450) {
        lastSlosh = now;
        play("slosh", { pan: x * 2 - 1, gain: Math.min(1, Math.hypot(dx, dy) / 200) });
      }
    };
    const onDown = (e: PointerEvent) => {
      if (!fluid) return;
      down = true;
      const [x, y] = pos(e);
      lx = x;
      ly = y;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        fluid.splat(x, y, Math.cos(a) * 300, Math.sin(a) * 300, 0.35, 0.08);
      }
      play("pour", { pan: x * 2 - 1 });
    };
    const onUp = () => (down = false);

    const io = new IntersectionObserver(([e]) => fluid?.setRunning(e.isIntersecting), { rootMargin: "200px" });

    const start = async () => {
      if (reduced) return; // reduced motion: a still photo instead
      const { createFluid } = await import("@/lib/fluid");
      if (cancelled) return;
      try {
        fluid = createFluid(c);
      } catch (err) {
        console.error(err);
        fluid = null;
      }
      if (!fluid) return setOk(false);
      // a little life on the surface even before the pour
      for (let i = 0; i < 4; i++) fluid.splat(Math.random(), Math.random(), (Math.random() - 0.5) * 400, (Math.random() - 0.5) * 400, 0.02, 0.4);
      io.observe(el);
      update();
    };
    // start once the section is about a screen away, when the browser is idle
    const idle = window.requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 1));
    const near = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        near.disconnect();
        idle(() => void start(), { timeout: 800 });
      },
      { rootMargin: "100% 0px" },
    );
    near.observe(el);

    raf = requestAnimationFrame(tick);
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    c.addEventListener("pointermove", onMove);
    c.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      near.disconnect();
      io.disconnect();
      fluid?.dispose();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      c.removeEventListener("pointermove", onMove);
      c.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [reduced]);

  return (
    <div ref={wrap} id="ritual" className="relative bg-ink" style={{ height: "340svh" }}>
      {/* soft fades where this section meets its neighbours */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[35svh] bg-gradient-to-b from-ink to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[35svh] bg-gradient-to-t from-ink to-transparent" />
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <canvas
          ref={canvas}
          role="img"
          aria-label="Condensed milk marbling through black coffee. Drag to stir, tap to pour more milk."
          className="absolute inset-0 h-full w-full touch-pan-y"
        />
        {(!ok || reduced) && (
          <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 50% at 55% 50%, #6b4426 0%, #2a170b 45%, #0b0907 80%)" }} />
        )}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/10 to-ink/40 lg:bg-gradient-to-r lg:from-ink/85 lg:via-transparent lg:to-transparent" />

        {CHAPTERS.map((ch, i) => (
          <div
            key={ch.kicker}
            data-mchapter
            className="pointer-events-none absolute inset-x-0 bottom-12 top-14 flex flex-col justify-end gap-6 px-5 pb-6 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-12 lg:pb-10"
            style={{ opacity: i === 0 ? 1 : 0, visibility: i === 0 ? "visible" : "hidden" }}
          >
            <div className="max-w-xl">
              <p className="mono text-muted">
                Instructions <span className="text-glow">{"// "}{ch.kicker}</span>
              </p>
              <h2 className="hud mt-3 text-[clamp(2.4rem,6vw,5.8rem)] font-extralight leading-[0.92] text-cream">{ch.title}</h2>
              <p className="mt-4 max-w-sm text-[16px] leading-relaxed text-muted">{ch.text}</p>
            </div>
            {ch.milk && (
              <div className="brackets p-4">
                <p className="mono text-muted">Condensed milk in</p>
                <p className="hud text-6xl font-extralight text-cream">
                  <span data-mmilk>00</span>
                  <span className="text-2xl text-muted"> / 30 ml</span>
                </p>
              </div>
            )}
            {ch.cta && (
              <div className="pointer-events-auto flex flex-wrap gap-3">
                <Button href="#lineup">+ Order a bottle · ₹249</Button>
              </div>
            )}
          </div>
        ))}
        <p className="mono pointer-events-none absolute right-5 top-20 text-muted sm:right-8">Drag to stir · Tap to pour</p>
      </div>
    </div>
  );
}
