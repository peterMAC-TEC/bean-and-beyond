"use client";

import { useEffect, useRef, useState } from "react";
import { site } from "@/content/site";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { play, liquidLoop } from "@/lib/sound";
import type { BeanScene } from "@/lib/beanScene";

const CH = site.origin;
const FADE = 0.025;

/**
 * From bean to bottle: one bean, crushed, bursting into grounds, brewed by
 * falling water into coffee, streamed into a bottle and capped. Scroll plays it
 * (both ways); the bean can be dragged and the grounds scattered.
 */
export function BeanStory() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = wrap.current!;
    const chapters = Array.from(el.querySelectorAll<HTMLElement>("[data-ochapter]"));
    let scene: BeanScene | null = null;
    let cancelled = false;
    let frame = 0;
    let lastP = 0;
    let lastMove = 0;
    let lastDrip = 0;
    const pourLoop = liquidLoop();

    const update = () => {
      frame = 0;
      const top = el.getBoundingClientRect().top;
      const p = Math.min(1, Math.max(0, -top / (el.offsetHeight - innerHeight)));
      scene?.setProgress(p);
      chapters.forEach((c, i) => {
        const a = CH[i].at;
        const b = CH[i + 1]?.at ?? 2;
        const o = Math.max(0, Math.min(i === 0 ? 1 : (p - a) / FADE, (b - p) / FADE, 1));
        c.style.opacity = String(o);
        c.style.transform = `translateY(${(1 - o) * 18}px)`;
        c.style.visibility = o > 0.01 ? "visible" : "hidden";
      });
      // sound: the crack, the burst, drips while brewing, the pour, the cap
      if (p > lastP) {
        if (lastP < 0.22 && p >= 0.22) play("crunch", { gain: 0.6 });
        if (lastP < 0.26 && p >= 0.26) play("burst");
        if (lastP < 0.44 && p >= 0.44) play("whoosh", { gain: 0.6 });
        if (lastP < 0.95 && p >= 0.95) play("cap");
      }
      const now = performance.now();
      if (p > 0.44 && p < 0.66 && Math.abs(p - lastP) > 0.0005 && now - lastDrip > 520) {
        lastDrip = now;
        play("drip", { pan: Math.random() * 1.2 - 0.6, gain: 0.6 });
      }
      if (p !== lastP) lastMove = performance.now();
      const pouring = p > 0.7 && p < 0.93;
      pourLoop.setLevel(pouring && performance.now() - lastMove < 400 ? 1 : pouring ? 0.35 : 0);
      lastP = p;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const io = new IntersectionObserver(([e]) => scene?.setRunning(e.isIntersecting), { rootMargin: "200px" });

    const start = async () => {
      if (reduced) return;
      const test = document.createElement("canvas");
      if (!test.getContext("webgl2")) return;
      const { createBeanScene } = await import("@/lib/beanScene");
      if (cancelled || !canvas.current) return;
      try {
        scene = createBeanScene(canvas.current);
      } catch (err) {
        console.error(err);
        return;
      }
      io.observe(el);
      update();
      setReady(true);
      // dev only: lets automated snapshots jump to an exact moment
      if (process.env.NODE_ENV !== "production") Object.assign(window, { __beanScene: scene });
    };
    // load once the section is getting close
    const near = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        near.disconnect();
        void start();
      },
      { rootMargin: "1200px 0px" },
    );
    near.observe(el);

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelled = true;
      near.disconnect();
      io.disconnect();
      scene?.dispose();
      pourLoop.stop();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reduced]);

  return (
    <div ref={wrap} id="origin" className="relative bg-[#050403]" style={{ height: "620svh" }}>
      {/* soft fades where this section meets its neighbours */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[35svh] bg-gradient-to-b from-ink to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[35svh] bg-gradient-to-t from-ink to-transparent" />
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <canvas
          ref={canvas}
          role="img"
          aria-label="A coffee bean is crushed and bursts into grounds; water falls through them, turns into coffee and pours into a bottle."
          className={`absolute inset-0 h-full w-full touch-pan-y transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`}
        />
        {(reduced || !ready) && (
          <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(ellipse 40% 45% at 50% 50%, #2a170b, #050403 75%)" }} />
        )}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050403] via-transparent to-transparent lg:bg-gradient-to-r lg:from-[#050403]/85 lg:via-transparent" />

        {CH.map((c, i) => (
          <div
            key={c.kicker}
            data-ochapter
            className="pointer-events-none absolute inset-x-0 bottom-12 px-5 pb-6 sm:px-8 lg:bottom-auto lg:top-1/2 lg:w-[40%] lg:-translate-y-1/2 lg:pl-12"
            style={{ opacity: i === 0 ? 1 : 0, visibility: i === 0 ? "visible" : "hidden" }}
          >
            <p className="mono text-muted">
              Origin <span className="text-glow">{"// "}{c.kicker}</span>
            </p>
            <h2 className="hud mt-3 text-[clamp(2.4rem,5.6vw,5.4rem)] font-extralight leading-[0.92] text-cream">{c.title}</h2>
            <p className="mt-4 max-w-sm text-[16px] leading-relaxed text-muted">{c.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
