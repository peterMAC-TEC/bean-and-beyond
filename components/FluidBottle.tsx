"use client";

import { useEffect, useRef, useState } from "react";
import type { Fluid } from "@/lib/fluid";
import { play } from "@/lib/sound";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { Label } from "./Label";

export type BottleColours = { coffee: string; caramel: string; milk: string };
/** where the bottle stands, as a share of the canvas: base centre x/y (y up) and height */
export type BottleLayout = (w: number, h: number) => { x: number; y: number; h: number };

type Props = {
  variant: "hero" | "card";
  colours: BottleColours;
  layout: BottleLayout;
  /** pour milk in by itself once it's on screen */
  autoPour?: boolean;
  className?: string;
};

// label position on the glass, in bottle heights from the base centre
const LABEL = { halfW: 0.157, top: 0.52, h: 0.44 };
const LEVEL = 0.73; // coffee fills into the shoulders, so the marbling shows above the label

/**
 * A bottle full of live liquid. Hover to stir, tap to pour condensed milk in,
 * drag sideways to tilt it (the coffee stays level and sloshes), double-tap to
 * shake it into latte. The light follows the cursor; the gold label shimmers.
 */
export function FluidBottle({ variant, colours, layout, autoPour, className = "" }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const label = useRef<HTMLDivElement>(null);
  const glint = useRef<HTMLDivElement>(null);
  const [ok, setOk] = useState(true);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = box.current!;
    const c = canvas.current!;
    let fluid: Fluid | null = null;
    let cancelled = false;
    let raf = 0;
    let visible = false;

    const B = { x: 0.5, y: 0.1, h: 0.8 };
    const T = { angle: 0, vel: 0, target: 0, wave: 0, phase: 0, stream: 0, pour: -1, shake: -1, light: [0.3, 0.8] as [number, number], milk: 0 };
    let W = 1;
    let H = 1;

    const place = () => {
      W = el.clientWidth;
      H = el.clientHeight;
      Object.assign(B, layout(W, H));
    };

    // bottle-space <-> canvas uv (y up)
    const toUv = (lx: number, ly: number) => {
      const ca = Math.cos(T.angle);
      const sa = Math.sin(T.angle);
      const rx = ca * lx - sa * ly;
      const ry = sa * lx + ca * ly;
      return [B.x + (rx * B.h * H) / W, B.y + ry * B.h] as const;
    };
    const toLocal = (u: number, v: number) => {
      const rx = ((u - B.x) * W) / H / B.h;
      const ry = (v - B.y) / B.h;
      const ca = Math.cos(-T.angle);
      const sa = Math.sin(-T.angle);
      return [ca * rx - sa * ry, sa * rx + ca * ry] as const;
    };
    const overBottle = (u: number, v: number) => {
      const [lx, ly] = toLocal(u, v);
      return Math.abs(lx) < 0.21 && ly > 0 && ly < 1.02;
    };

    const panOf = () => B.x * 2 - 1;
    const pour = () => {
      if (T.pour < 0) {
        T.pour = 0;
        play("pour", { pan: panOf() });
      }
    };
    const shake = () => {
      T.shake = 0;
      play("slosh", { pan: panOf() });
      setTimeout(() => play("slosh", { pan: panOf(), gain: 0.8 }), 280);
      setTimeout(() => play("slosh", { pan: panOf(), gain: 0.6 }), 560);
    };
    let lastSlosh = 0;

    // ------------------------------------------------------------- loop ---
    let last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!fluid || !visible) return;

      // tilt: a spring toward the drag target; angular speed sloshes the liquid
      const prev = T.angle;
      T.vel += ((T.target - T.angle) * 60 - T.vel * 9) * dt;
      T.angle += T.vel * dt;
      const av = (T.angle - prev) / Math.max(dt, 0.001);
      T.wave = Math.min(0.03, T.wave * Math.pow(0.25, dt) + Math.abs(av) * 0.004);
      T.phase += dt * 9;
      if (Math.abs(av) > 0.05) {
        const [u, v] = toUv(0, 0.3);
        fluid.splat(u, v, -av * 900, 0, 0, 0.6);
        if (Math.abs(av) > 0.9 && now - lastSlosh > 500 && T.shake < 0) {
          lastSlosh = now;
          play("slosh", { pan: panOf(), gain: Math.min(1, Math.abs(av) / 3) });
        }
      }

      // pouring: a milk stream, and milk plunging into the coffee
      if (T.pour >= 0) {
        T.pour += dt;
        const k = T.pour < 0.25 ? T.pour / 0.25 : T.pour > 1.5 ? Math.max(0, 1 - (T.pour - 1.5) / 0.25) : 1;
        T.stream = k;
        if (T.pour < 1.6) {
          const [u, v] = toUv((Math.random() - 0.5) * 0.02, LEVEL * Math.cos(T.angle) - 0.03);
          // a thin, fast stream: ribbons of cream, not a cloud
          if (Math.random() < 0.6) fluid.splat(u, v, (Math.random() - 0.5) * 1300, -450, 0.28, 0.02 + Math.random() * 0.025);
          T.milk = Math.min(30, T.milk + dt * 19);
        }
        // once the milk is in, a lazy swirl draws it out into marble
        if (T.pour > 1.6 && T.pour < 3.2) {
          const [vu, vv] = toUv(0, 0.42);
          fluid.vortex(vu, vv, 70 * Math.sin(((T.pour - 1.6) / 1.6) * Math.PI));
        }
        if (T.pour > 3.2) {
          T.pour = -1;
          T.stream = 0;
        }
      }
      // shaking: violent sloshing that mixes everything
      if (T.shake >= 0) {
        T.shake += dt;
        T.target = Math.sin(T.shake * 22) * 0.18 * Math.max(0, 1 - T.shake / 1.1);
        for (let i = 0; i < 2; i++) {
          const [u, v] = toUv((Math.random() - 0.5) * 0.3, Math.random() * 0.5 + 0.05);
          fluid.splat(u, v, (Math.random() - 0.5) * 2400, (Math.random() - 0.5) * 2400, 0, 0.05);
        }
        if (T.shake > 1.1) {
          T.shake = -1;
          T.target = 0;
        }
      }

      const u = fluid.uniforms;
      u.uBottle = [B.x, B.y, B.h, T.angle];
      u.uSurf = [LEVEL * Math.cos(T.angle), T.wave, T.phase];
      u.uLight = T.light;
      u.uStream = [T.stream, now / 1000 * 12];

      // keep the printed label glued to the glass
      if (label.current) {
        const bx = B.x * W;
        const by = (1 - B.y) * H;
        const ph = B.h * H;
        const s = label.current.style;
        s.left = `${bx - LABEL.halfW * ph}px`;
        s.top = `${by - LABEL.top * ph}px`;
        s.width = `${LABEL.halfW * 2 * ph}px`;
        s.height = `${LABEL.h * ph}px`;
        s.transformOrigin = `${LABEL.halfW * ph}px ${LABEL.top * ph}px`;
        s.transform = `rotate(${-T.angle}rad)`;
      }
    };

    // ------------------------------------------------------ interaction ---
    let down: { x: number; y: number; t: number } | null = null;
    let dragging = false;
    let lastTap = 0;
    let px = 0;
    let py = 0;
    const uvOf = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      return [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height] as const;
    };
    const onMove = (e: PointerEvent) => {
      const [u, v] = uvOf(e);
      T.light = [u, v];
      if (glint.current) {
        const r = label.current?.getBoundingClientRect();
        if (r) glint.current.style.background = `radial-gradient(circle at ${e.clientX - r.left}px ${e.clientY - r.top}px, rgba(255,240,200,.35), transparent 45%)`;
      }
      const over = overBottle(u, v);
      document.documentElement.dataset.cursor = over || dragging ? "grab" : "";
      if (down) {
        const dx = e.clientX - down.x;
        if (Math.abs(dx) > 8) dragging = true;
        if (dragging) T.target = Math.max(-0.5, Math.min(0.5, -dx / (W * 0.35)));
      } else if (fluid && over) {
        // stirring
        const dx = (u - px) * 5000;
        const dy = (v - py) * 5000;
        if (Math.abs(dx) + Math.abs(dy) > 2) fluid.splat(u, v, dx, dy, 0, 0.04);
        const now = performance.now();
        if (Math.hypot(dx, dy) > 80 && now - lastSlosh > 600) {
          lastSlosh = now;
          play("slosh", { pan: u * 2 - 1, gain: 0.5 });
        }
      }
      px = u;
      py = v;
    };
    const onDown = (e: PointerEvent) => {
      const [u, v] = uvOf(e);
      if (!overBottle(u, v)) return;
      down = { x: e.clientX, y: e.clientY, t: performance.now() };
      dragging = false;
      c.setPointerCapture(e.pointerId);
    };
    const onUp = (e: PointerEvent) => {
      if (!down) return;
      if (!dragging) {
        const now = performance.now();
        if (now - lastTap < 320) shake();
        else pour();
        lastTap = now;
      }
      down = null;
      dragging = false;
      T.target = 0;
      if (c.hasPointerCapture(e.pointerId)) c.releasePointerCapture(e.pointerId);
    };
    const onLeave = () => {
      document.documentElement.dataset.cursor = "";
      if (!down) T.target = 0;
    };

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        fluid?.setRunning(visible);
        if (visible && autoPour && T.milk === 0) setTimeout(pour, 600);
      },
      { threshold: 0.2 },
    );

    const start = async () => {
      if (reduced) return;
      const [{ createFluid }, shader] = await Promise.all([import("@/lib/fluid"), import("@/lib/bottleShader")]);
      if (cancelled) return;
      place();
      const card = variant === "card";
      try {
        fluid = createFluid(c, {
          sim: card ? 96 : window.innerWidth < 768 ? 144 : 224,
          dye: card ? 560 : window.innerWidth < 768 ? 900 : 1600,
          curl: 28,
          velocityDissipation: 0.4,
          dyeDissipation: 0.004,
          mask: shader.MASK,
          display: shader.DISPLAY,
        });
      } catch (err) {
        console.error(err);
        fluid = null;
      }
      if (!fluid) return setOk(false);
      Object.assign(fluid.uniforms, {
        uCoffee: shader.lin(colours.coffee),
        uCaramel: shader.lin(colours.caramel),
        uMilk: shader.lin(colours.milk),
        uBg: card ? 1 : 0,
        uBottle: [B.x, B.y, B.h, 0],
        uSurf: [LEVEL, 0, 0],
        uLight: T.light,
        uStream: [0, 0],
      });
      io.observe(el);
    };
    void start();

    const ro = new ResizeObserver(place);
    ro.observe(el);
    raf = requestAnimationFrame(loop);
    c.addEventListener("pointermove", onMove);
    c.addEventListener("pointerdown", onDown);
    c.addEventListener("pointerup", onUp);
    c.addEventListener("pointercancel", onUp);
    c.addEventListener("pointerleave", onLeave);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      fluid?.dispose();
      c.removeEventListener("pointermove", onMove);
      c.removeEventListener("pointerdown", onDown);
      c.removeEventListener("pointerup", onUp);
      c.removeEventListener("pointercancel", onUp);
      c.removeEventListener("pointerleave", onLeave);
    };
  }, [variant, colours, layout, autoPour, reduced]);

  const still = reduced || !ok;

  return (
    <div ref={box} className={`overflow-hidden ${className.includes("absolute") ? "" : "relative"} ${className}`}>
      <canvas ref={canvas} aria-hidden className="absolute inset-0 h-full w-full touch-pan-y" />
      {still && (
        <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(ellipse 50% 55% at 50% 45%, #2a1d12, #0b0907 75%)" }} />
      )}
      {/* the printed label, glued to the glass, with a light glint that follows the cursor */}
      <div ref={label} className={`pointer-events-none absolute ${still ? "left-1/2 top-[15%] h-[60%] w-[43%] -translate-x-1/2" : ""}`} style={{ filter: "drop-shadow(0 4px 10px rgba(0,0,0,.45))" }}>
        <Label className="h-full w-full" />
        <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(0,0,0,.55), rgba(0,0,0,0) 18%, rgba(255,250,235,.07) 38%, rgba(0,0,0,0) 58%, rgba(0,0,0,.6))" }} />
        <div ref={glint} aria-hidden className="absolute inset-0 mix-blend-screen" />
      </div>
    </div>
  );
}
