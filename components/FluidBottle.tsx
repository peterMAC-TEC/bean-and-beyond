"use client";

import { useEffect, useRef, useState } from "react";
import type { Fluid } from "@/lib/fluid";
import { returnCrate, takeCrate, type Pooled } from "@/lib/cratePool";
import { play } from "@/lib/sound";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { Label } from "./Label";

export type BottleColours = { coffee: string; caramel: string; milk: string };
/** where the bottle stands, as a share of the canvas: base centre x/y (y up) and height */
export type BottleLayout = (w: number, h: number) => { x: number; y: number; h: number };

type Props = {
  /** crate: no backdrop, no touch; the liquid sloshes as the bottle itself is moved around the page */
  variant: "hero" | "card" | "crate";
  colours: BottleColours;
  layout: BottleLayout;
  /** pour milk in by itself once it's on screen */
  autoPour?: boolean;
  /** ms to wait before that pour */
  pourDelay?: number;
  /** stop the simulation and keep its last frame as a still picture (frees the WebGL context) */
  frozen?: boolean;
  className?: string;
};

/** a still frame per flavour, for crate bottles beyond the live limit (browsers allow ~16 WebGL contexts a page) */
const STILLS = new WeakMap<BottleColours, string>();
/** a live crate simulation per flavour, to take that still from only when one is needed (a capture is a GPU readback) */
const SOURCES = new WeakMap<BottleColours, Fluid>();
const stillOf = (colours: BottleColours) => {
  const have = STILLS.get(colours);
  if (have) return have;
  const f = SOURCES.get(colours);
  if (!f || !f.ready()) return undefined;
  const url = f.snapshot();
  STILLS.set(colours, url);
  return url;
};

// label position on the glass, in bottle heights from the base centre
// (as big as the flat of the flask allows, so the print has the most room)
const LABEL = { halfW: 0.172, top: 0.53, h: 0.482 };
/** the reading lens: the label under the cursor at a size where the warning reads at ~15px */
const LENS_TEXT_PX = 15;
const WARNING_UNITS = 13 / 560; // warning type size as a share of the label's height (components/Label.tsx)
const LEVEL = 0.73; // coffee fills into the shoulders, so the marbling shows above the label

/**
 * A bottle full of live liquid. Hover to stir, tap to pour condensed milk in,
 * drag sideways to tilt it (the coffee stays level and sloshes), double-tap to
 * shake it into latte. The light follows the cursor; the gold label shimmers.
 */
export function FluidBottle({ variant, colours, layout, autoPour, pourDelay = 600, frozen = false, className = "" }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const label = useRef<HTMLDivElement>(null);
  const glint = useRef<HTMLDivElement>(null);
  const lens = useRef<HTMLDivElement>(null);
  const lensInner = useRef<HTMLDivElement>(null);
  const stillImg = useRef<HTMLImageElement>(null);
  const live = useRef<Fluid | null>(null);
  const isFrozen = useRef(frozen);
  const [ok, setOk] = useState(true);
  const reduced = useReducedMotion();
  const crate = variant === "crate";

  // frozen: the loop swaps the simulation for its last frame (see below)
  useEffect(() => {
    isFrozen.current = frozen;
  }, [frozen]);

  useEffect(() => {
    const el = box.current!;
    // crate bottles borrow a ready simulation (and its canvas) from the pool, see lib/cratePool.ts
    let c = canvas.current!;
    let pooled: Pooled | null = null;
    const release = (f: Fluid) => {
      if (pooled && pooled.fluid === f) {
        returnCrate(pooled);
        pooled = null;
      } else f.dispose();
    };
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

    let shown = false;
    let asleep = false;
    let quiet = performance.now();
    const showStill = (src: string) => {
      if (!stillImg.current) return;
      stillImg.current.src = src;
      stillImg.current.style.opacity = "1";
      c.style.opacity = "0";
      shown = true;
    };

    // the crate bottle is carried around by its parent: follow its motion, measured against the
    // nearest [data-motion-frame] (the crate), so sliding the whole panel or crate doesn't swing it
    const frame = crate ? el.closest<HTMLElement>("[data-motion-frame]") : null;
    const mv = { x: 0, y: 0, vx: 0, vy: 0, seen: false, moving: false };
    const follow = (dt: number, f: Fluid) => {
      const r = el.getBoundingClientRect();
      const o = frame?.getBoundingClientRect();
      const x = r.left + r.width / 2 - (o?.left ?? 0);
      const y = r.bottom - (o?.top ?? 0);
      if (mv.seen && dt > 0.004) {
        const vx = (x - mv.x) / dt;
        const vy = (y - mv.y) / dt;
        mv.moving = Math.abs(vx) > 4 || Math.abs(vy) > 4;
        mv.vx += (vx - mv.vx) * 0.35;
        // it swings back against the way it is carried, and the coffee keeps going
        T.target = Math.max(-0.38, Math.min(0.38, -mv.vx * 0.0011));
        // landing: falling fast, then stopped dead
        if (mv.vy > 120 && vy < mv.vy * 0.3) {
          T.wave = 0.03;
          const [u, v] = toUv(0, 0.25);
          f.splat(u, v, 0, Math.min(1400, mv.vy * 3), 0, 0.5);
          T.vel += (Math.random() - 0.5) * 3;
        }
        mv.vy = vy;
      }
      mv.x = x;
      mv.y = y;
      mv.seen = true;
    };

    // ------------------------------------------------------------- loop ---
    let last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (isFrozen.current) {
        if (fluid && live.current === fluid) {
          // the last frame becomes a picture and the simulation (and its WebGL context) goes away
          showStill(fluid.snapshot());
          STILLS.set(colours, stillImg.current?.src ?? "");
          if (SOURCES.get(colours) === fluid) SOURCES.delete(colours);
          release(fluid);
          live.current = null;
        } else if (!shown) {
          const src = stillOf(colours);
          if (src) showStill(src);
        }
        return glue();
      }
      // nothing on the glass until the shaders are ready (they compile in the background)
      if (!fluid || !visible || live.current !== fluid || !fluid.ready()) return;
      if (crate) {
        follow(dt, fluid);
        // a picture of this flavour for crate bottles that never get a live simulation
        if (!SOURCES.has(colours)) SOURCES.set(colours, fluid);
        // settled in the crate and the liquid has stopped: let the simulation sleep (its last frame stays up)
        const calm = !mv.moving && T.pour < 0 && T.shake < 0 && Math.abs(T.vel) < 0.02 && Math.abs(T.angle - T.target) < 0.004 && T.wave < 0.002;
        if (!calm) quiet = now;
        const sleep = now - quiet > 2600;
        if (sleep !== asleep) {
          asleep = sleep;
          fluid.setRunning(!sleep);
        }
        if (asleep) return;
      }

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

      glue();
    };

    // keep the printed label glued to the glass (styles written only when it actually moved)
    let glued = "";
    const glue = () => {
      if (label.current) {
        const bx = B.x * W;
        const by = (1 - B.y) * H;
        const ph = B.h * H;
        const key = `${bx.toFixed(1)} ${by.toFixed(1)} ${ph.toFixed(1)} ${T.angle.toFixed(4)}`;
        if (key === glued) return;
        glued = key;
        const s = label.current.style;
        s.left = `${bx - LABEL.halfW * ph}px`;
        s.top = `${by - LABEL.top * ph}px`;
        s.width = `${LABEL.halfW * 2 * ph}px`;
        s.height = `${LABEL.h * ph}px`;
        s.transformOrigin = `${LABEL.halfW * ph}px ${LABEL.top * ph}px`;
        s.transform = `rotate(${-T.angle}rad)`;
        // first frame on the glass: fade the label and the liquid in together (no jump)
        if (s.opacity !== "1") {
          s.opacity = "1";
          if (!isFrozen.current) c.style.opacity = "1";
        }
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
    // ------------------------------------------------------- reading lens ---
    // hover the label (or press and hold it on a phone) to read the fine print
    const lensSize = () => lens.current?.offsetWidth ?? 0;
    const hideLens = () => {
      const ln = lens.current;
      if (ln && ln.style.visibility !== "hidden") {
        ln.style.opacity = "0";
        ln.style.visibility = "hidden";
      }
    };
    const lensAt = (cx: number, cy: number, lift = false) => {
      const L = label.current;
      const ln = lens.current;
      const inner = lensInner.current;
      if (!L || !ln || !inner) return false;
      const r = L.getBoundingClientRect();
      const inside = cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
      if (!inside || Math.abs(T.angle) > 0.08) {
        hideLens();
        return false;
      }
      const b = el.getBoundingClientRect();
      const w = L.offsetWidth;
      const h = L.offsetHeight;
      const z = Math.max(2, Math.min(5, LENS_TEXT_PX / (WARNING_UNITS * h)));
      const R = lensSize() / 2;
      // the lens floats just above the pointer, so the cursor (or a finger) doesn't cover the text
      const oy = lift ? -R - 28 : 0;
      ln.style.transform = `translate(${cx - b.left - R}px, ${cy - b.top - R + oy}px)`;
      inner.style.width = `${w * z}px`;
      inner.style.height = `${h * z}px`;
      inner.style.transform = `translate(${R - (cx - r.left) * z}px, ${R - (cy - r.top) * z}px)`;
      ln.style.opacity = "1";
      ln.style.visibility = "visible";
      return true;
    };
    let reading = false;
    let hold = 0;

    const onMove = (e: PointerEvent) => {
      if (reading) {
        lensAt(e.clientX, e.clientY, true);
        return;
      }
      if (!down && e.pointerType !== "touch") lensAt(e.clientX, e.clientY, true);
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
      if (e.pointerType === "touch") {
        const { clientX: x, clientY: y } = e;
        clearTimeout(hold);
        hold = window.setTimeout(() => {
          if (down && !dragging && lensAt(x, y, true)) reading = true;
        }, 280);
      }
    };
    const onUp = (e: PointerEvent) => {
      clearTimeout(hold);
      if (reading) {
        // that was a read, not a tap: no pour
        reading = false;
        hideLens();
        down = null;
        if (c.hasPointerCapture(e.pointerId)) c.releasePointerCapture(e.pointerId);
        return;
      }
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
      if (!reading) hideLens();
      document.documentElement.dataset.cursor = "";
      if (!down) T.target = 0;
    };

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        asleep = false;
        quiet = performance.now();
        fluid?.setRunning(visible);
        if (visible && autoPour && T.milk === 0 && T.pour < 0) setTimeout(pour, pourDelay);
      },
      { threshold: 0.2 },
    );

    const start = async () => {
      if (reduced) return;
      const [{ createFluid }, shader] = await Promise.all([import("@/lib/fluid"), import("@/lib/bottleShader")]);
      if (cancelled || isFrozen.current) return;
      place();
      const card = variant === "card";
      if (crate) {
        const p = await takeCrate();
        if (!p) return setOk(false);
        if (cancelled || isFrozen.current) return returnCrate(p);
        pooled = p;
        fluid = p.fluid;
        // the borrowed canvas takes the place of ours
        p.canvas.className = c.className;
        p.canvas.style.cssText = "opacity:0";
        p.canvas.setAttribute("aria-hidden", "true");
        c.parentElement?.insertBefore(p.canvas, c);
        c = p.canvas;
        fluid.reset();
        fluid.setRunning(true);
      } else try {
        fluid = createFluid(c, {
          sim: crate ? 64 : card ? 96 : window.innerWidth < 768 ? 128 : 176,
          dye: crate ? 320 : card ? 560 : window.innerWidth < 768 ? 768 : 1280,
          curl: 28,
          velocityDissipation: 0.4,
          dyeDissipation: 0.004,
          mask: shader.MASK,
          display: shader.DISPLAY,
          alpha: crate,
          overPanel: crate,
        });
      } catch (err) {
        console.error(err);
        fluid = null;
      }
      if (!fluid) return setOk(false);
      live.current = fluid;
      Object.assign(fluid.uniforms, {
        uCoffee: shader.lin(colours.coffee),
        uCaramel: shader.lin(colours.caramel),
        uMilk: shader.lin(colours.milk),
        uBg: crate ? 2 : card ? 1 : 0,
        uBottle: [B.x, B.y, B.h, 0],
        uSurf: [LEVEL, 0, 0],
        uLight: T.light,
        uStream: [0, 0],
      });
      io.observe(el);
    };
    // the hero starts straight away; bottles further down wait until they are about
    // a screen away (then start when the browser is idle), so they never compete with
    // whatever you are looking at
    const idle = window.requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 1));
    const near = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        near.disconnect();
        idle(() => void start(), { timeout: 800 });
      },
      { rootMargin: "100% 0px" },
    );
    if (variant !== "card") void start();
    else near.observe(el);

    const ro = new ResizeObserver(place);
    ro.observe(el);
    raf = requestAnimationFrame(loop);
    if (!crate) {
      c.addEventListener("pointermove", onMove);
      c.addEventListener("pointerdown", onDown);
      c.addEventListener("pointerup", onUp);
      c.addEventListener("pointercancel", onUp);
      c.addEventListener("pointerleave", onLeave);
    }
    return () => {
      cancelled = true;
      clearTimeout(hold);
      cancelAnimationFrame(raf);
      near.disconnect();
      io.disconnect();
      ro.disconnect();
      if (fluid && SOURCES.get(colours) === fluid) SOURCES.delete(colours);
      if (fluid && live.current === fluid) release(fluid);
      else if (fluid && !pooled) fluid.dispose();
      if (live.current === fluid) live.current = null;
      c.removeEventListener("pointermove", onMove);
      c.removeEventListener("pointerdown", onDown);
      c.removeEventListener("pointerup", onUp);
      c.removeEventListener("pointercancel", onUp);
      c.removeEventListener("pointerleave", onLeave);
    };
  }, [variant, crate, colours, layout, autoPour, pourDelay, reduced]);

  const still = reduced || !ok;

  // no live liquid in the crate: the photographed bottle stands in
  if (crate && still) {
    return (
      <div ref={box} className={`${className.includes("absolute") ? "" : "relative"} ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/order/bottle.webp" alt="" className="absolute inset-x-0 bottom-[4%] mx-auto h-[88%] w-auto" draggable={false} />
        <canvas ref={canvas} hidden />
      </div>
    );
  }

  return (
    <div ref={box} className={`${crate ? "" : "overflow-hidden"} ${className.includes("absolute") ? "" : "relative"} ${className}`}>
      <canvas ref={canvas} aria-hidden className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${crate ? "pointer-events-none" : "touch-pan-y"}`} style={{ opacity: still ? 1 : 0 }} />
      {crate && (
        // eslint-disable-next-line @next/next/no-img-element
        <img ref={stillImg} alt="" className="pointer-events-none absolute inset-0 h-full w-full" style={{ opacity: 0 }} />
      )}
      {still && (
        <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(ellipse 50% 55% at 50% 45%, #2a1d12, #0b0907 75%)" }} />
      )}
      {/* the printed label, glued to the glass, with a light glint that follows the cursor */}
      <div ref={label} className={`pointer-events-none absolute ${still ? "left-1/2 top-[15%] h-[60%] w-[43%] -translate-x-1/2" : ""}`} style={{ filter: "drop-shadow(0 4px 10px rgba(0,0,0,.45))", opacity: still ? 1 : 0, transition: "opacity .7s" }}>
        <Label className="h-full w-full" shimmer={!crate} />
        <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(0,0,0,.55), rgba(0,0,0,0) 18%, rgba(255,250,235,.07) 38%, rgba(0,0,0,0) 58%, rgba(0,0,0,.6))" }} />
        <div ref={glint} aria-hidden className="absolute inset-0" />
      </div>
      {!crate && (
        <div
          ref={lens}
          aria-hidden
          className={`pointer-events-none absolute left-0 top-0 z-10 overflow-hidden rounded-full bg-[#15110d] ${variant === "hero" ? "h-[200px] w-[200px]" : "h-[160px] w-[160px]"}`}
          style={{ opacity: 0, visibility: "hidden", transition: "opacity .18s, visibility .18s", boxShadow: "0 0 0 2px rgba(233,196,106,.85), 0 0 0 6px rgba(20,14,8,.9), 0 20px 44px rgba(0,0,0,.65)" }}
        >
          <div ref={lensInner} className="absolute left-0 top-0 origin-top-left">
            <Label className="h-full w-full" shimmer={false} />
          </div>
          {/* the glass of the lens: a highlight and a little darkening at the rim */}
          <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle at 32% 26%, rgba(255,255,255,.16), transparent 40%), radial-gradient(circle, transparent 62%, rgba(0,0,0,.4))" }} />
        </div>
      )}
    </div>
  );
}
