"use client";

import { useEffect, useRef, useState } from "react";
import { site } from "@/content/site";
import { play } from "@/lib/sound";
import { openOrder } from "@/lib/order";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { head, type Fluid } from "@/lib/fluid";
import { TextReveal } from "./TextReveal";
import { InstantPouch } from "./InstantPouch";

const R = 0.4; // the liquid's radius, as a share of the canvas height

// only the inside of the cup is liquid
const MASK = `
uniform float aspect;
float inside(vec2 uv){ vec2 q = uv - 0.5; q.x *= aspect; return step(length(q), ${R.toFixed(3)}); }`;

// Looking down into a white cup of hot water. Granules land as dark specks, bleed amber, and the
// cup turns black as they dissolve; a fine crema gathers where it's strongest, with a meniscus at the rim.
const DISPLAY = head + `
uniform sampler2D uDye; uniform vec2 texel; uniform float aspect, time;
float h(vec2 uv){ return texture(uDye, uv).r; }
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
void main(){
  vec2 q = vUv - 0.5; q.x *= aspect;
  float r = length(q);
  float R = ${R.toFixed(3)};
  float a = smoothstep(R + 0.002, R - 0.002, r);
  if (a <= 0.0) { o = vec4(0.0); return; }
  float m = clamp(h(vUv), 0.0, 2.0);

  // clear hot water over white glaze, a little deeper (darker) towards the middle
  vec3 water = mix(vec3(0.80, 0.76, 0.70), vec3(0.70, 0.65, 0.58), smoothstep(R, 0.0, r));
  vec3 amber = vec3(0.46, 0.24, 0.09);
  vec3 brew = vec3(0.12, 0.058, 0.024);
  vec3 black = vec3(0.045, 0.022, 0.010);
  vec3 col = mix(water, amber, smoothstep(0.0, 0.14, m));
  col = mix(col, brew, smoothstep(0.12, 0.5, m));
  col = mix(col, black, smoothstep(0.45, 1.1, m));

  // crema: a fine tan foam that only forms on strong coffee, drifting slowly
  float foam = vnoise(vUv * 80.0 + time * 0.3) * 0.6 + vnoise(vUv * 46.0 - time * 0.15) * 0.4;
  foam = smoothstep(0.55, 0.85, foam) * smoothstep(0.5, 1.1, m) * smoothstep(R, R * 0.55, r);
  col = mix(col, vec3(0.42, 0.25, 0.12), foam * 0.22);

  // surface lighting from the coffee "height"
  vec2 e = texel * 1.5;
  float dx = h(vUv + vec2(e.x, 0.0)) - h(vUv - vec2(e.x, 0.0));
  float dy = h(vUv + vec2(0.0, e.y)) - h(vUv - vec2(0.0, e.y));
  vec3 n = normalize(vec3(-dx * 2.0, -dy * 2.0, 1.0));
  vec3 L = normalize(vec3(-0.4, 0.6, 0.9));
  float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 120.0);
  col *= 0.86 + 0.2 * clamp(dot(n, L), 0.0, 1.0);
  col += vec3(1.0, 0.95, 0.86) * spec * 0.5;

  // a window reflected in the surface, bent by it
  vec2 p = q / R;
  float win = smoothstep(0.16, 0.0, length(vec2(p.x + 0.38 + n.x * 0.4, (p.y - 0.42 + n.y * 0.4) * 1.6)) - 0.12);
  col += vec3(1.0, 0.94, 0.84) * win * 0.16;

  // meniscus: the liquid darkens into the wall, then a thin bright lip catches the light
  float edge = r / R;
  col *= mix(1.0, 0.62, smoothstep(0.82, 1.0, edge));
  float lip = smoothstep(0.955, 0.985, edge) * smoothstep(1.0, 0.985, edge);
  col += vec3(1.0, 0.95, 0.88) * lip * (0.25 + 0.35 * smoothstep(0.2, -0.6, dot(normalize(q), vec2(0.6, -0.8))));

  col += (hash(vUv * 900.0 + time) - 0.5) * 0.012;
  o = vec4(pow(col, vec3(1.0 / 2.2)), a);
}`;

/**
 * The instant coffee powder: its own section under the line-up. A live cup of hot water you look
 * down into. A spoon of granules drops in when it comes into view; tap to add another, drag to stir.
 */
export function Instant() {
  const { instant, contact } = site;
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ok, setOk] = useState(true);
  const [spoons, setSpoons] = useState(0);
  const [pick, setPick] = useState(instant.flavours[0].id);
  const flavour = instant.flavours.find((f) => f.id === pick) ?? instant.flavours[0];
  const reduced = useReducedMotion();
  const priced = instant.price > 0;

  useEffect(() => {
    const el = wrap.current!;
    const c = canvas.current!;
    let fluid: Fluid | null = null;
    let cancelled = false;
    let raf = 0;
    let last = performance.now();
    const timers: number[] = [];

    // hot water never sits still: slow convection keeps the surface alive
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!fluid || Math.random() > dt * 6) return;
      const a = Math.random() * Math.PI * 2;
      const d = Math.sqrt(Math.random()) * R * 0.8;
      fluid.splat(0.5 + (Math.cos(a) * d) / (c.width / c.height || 1), 0.5 + Math.sin(a) * d, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, 0, 0.3);
    };

    // one spoonful: a scatter of granules that land, then bloom outwards as they dissolve
    const spoon = (x: number, y: number) => {
      if (!fluid) return;
      const f = fluid;
      const aspect = c.width / c.height || 1;
      const n = 70;
      for (let i = 0; i < n; i++) {
        const delay = Math.random() * 260;
        timers.push(
          window.setTimeout(() => {
            const a = Math.random() * Math.PI * 2;
            const d = Math.pow(Math.random(), 0.7) * 0.09;
            const gx = x + (Math.cos(a) * d) / aspect;
            const gy = y + Math.sin(a) * d;
            const push = 40 + Math.random() * 140;
            f.splat(gx, gy, Math.cos(a) * push, Math.sin(a) * push, 0.5 + Math.random() * 0.5, 0.006 + Math.random() * 0.016);
          }, delay),
        );
      }
      // the dissolve: a soft dark bloom spreading from the middle of the scatter
      timers.push(
        window.setTimeout(() => {
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 + Math.random() * 0.4;
            f.splat(x, y, Math.cos(a) * 220, Math.sin(a) * 220, 0.12, 0.16);
          }
        }, 420),
      );
      play("drip", { gain: 0.5, pan: x * 2 - 1 });
      timers.push(window.setTimeout(() => play("drip", { gain: 0.3, pan: x * 2 - 1 }), 160));
      setSpoons((s) => s + 1);
    };

    // ---- the visitor's hand: tap adds a spoon, dragging stirs ----
    let down = false;
    let moved = 0;
    let lx = 0;
    let ly = 0;
    let lastSlosh = 0;
    const pos = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      return [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height] as const;
    };
    const inCup = (x: number, y: number) => Math.hypot((x - 0.5) * (c.width / c.height || 1), y - 0.5) < R;
    const onDown = (e: PointerEvent) => {
      const [x, y] = pos(e);
      if (!inCup(x, y)) return;
      down = true;
      moved = 0;
      lx = x;
      ly = y;
    };
    const onMove = (e: PointerEvent) => {
      if (!fluid) return;
      const [x, y] = pos(e);
      const dx = (x - lx) * 5000;
      const dy = (y - ly) * 5000;
      lx = x;
      ly = y;
      if (!inCup(x, y)) return;
      moved += Math.hypot(dx, dy);
      // a spoon moving through it when held, a breath of air when just hovering
      if (Math.abs(dx) + Math.abs(dy) > 1) fluid.splat(x, y, dx * (down ? 1 : 0.25), dy * (down ? 1 : 0.25), 0, down ? 0.25 : 0.5);
      const now = performance.now();
      if (down && Math.hypot(dx, dy) > 60 && now - lastSlosh > 500) {
        lastSlosh = now;
        play("slosh", { pan: x * 2 - 1, gain: Math.min(0.8, Math.hypot(dx, dy) / 260) });
      }
    };
    const onUp = (e: PointerEvent) => {
      if (!down) return;
      down = false;
      if (moved < 40) {
        const [x, y] = pos(e);
        if (inCup(x, y)) spoon(x, y);
      }
    };

    const io = new IntersectionObserver(([e]) => fluid?.setRunning(e.isIntersecting), { rootMargin: "200px" });
    // the first spoon drops in by itself when the cup is properly on screen
    let dropped = false;
    const seen = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || dropped || !fluid) return;
        dropped = true;
        seen.disconnect();
        timers.push(window.setTimeout(() => spoon(0.47, 0.54), 500));
      },
      { threshold: 0.55 },
    );

    const start = async () => {
      if (reduced) return setOk(false);
      const { createFluid } = await import("@/lib/fluid");
      if (cancelled) return;
      try {
        fluid = createFluid(c, { mask: MASK, display: DISPLAY, alpha: true, dyeDissipation: 0.004, velocityDissipation: 0.35, curl: 22 });
      } catch (err) {
        console.error(err);
        fluid = null;
      }
      if (!fluid) return setOk(false);
      io.observe(el);
      seen.observe(c);
    };
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
    c.addEventListener("pointerdown", onDown);
    c.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    const fresh = () => {
      fluid?.reset();
      setSpoons(0);
      play("pour", { gain: 0.5 });
    };
    el.addEventListener("bb:fresh-cup", fresh);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      near.disconnect();
      io.disconnect();
      seen.disconnect();
      fluid?.dispose();
      c.removeEventListener("pointerdown", onDown);
      c.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      el.removeEventListener("bb:fresh-cup", fresh);
    };
  }, [reduced]);

  if (!instant.show) return null;

  const ask = `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(`Hi! I'd like to know more about ${site.brand.name} ${flavour.name} ${instant.name.toLowerCase()} coffee.`)}`;

  return (
    <section ref={wrap} id="instant" aria-labelledby="instant-title" className="relative overflow-hidden bg-ink px-5 pb-28 pt-8 sm:px-8 lg:px-12">
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 40% 55% at 28% 50%, rgba(138,92,44,.18), transparent 70%)" }} />

      {/* the pouch, in 3D: what you actually get */}
      <div className="relative mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        <InstantPouch flavour={flavour} />
        <div>
          <p className="mono text-muted">
            {instant.kicker.split("//")[0].trim()} <span className="text-glow">{"// "}{instant.kicker.split("//")[1]?.trim() ?? instant.name}</span>
          </p>
          <TextReveal text={instant.title} className="hud mt-3 text-[clamp(2.6rem,5.4vw,5rem)] font-extralight leading-[0.92] text-cream" />
          <h3 id="instant-title" className="sr-only">
            {site.brand.name} {instant.name} coffee powder
          </h3>
          <p className="mt-5 max-w-md text-[17px] leading-relaxed text-muted">{instant.text}</p>

          {/* flavour: reprints the label on the pouch */}
          <div role="radiogroup" aria-label="Flavour" className="mt-8 grid max-w-md grid-cols-3 gap-2 sm:gap-3">
            {instant.flavours.map((f) => {
              const on = f.id === pick;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => {
                    play("tick");
                    setPick(f.id);
                  }}
                  className={`group relative overflow-hidden rounded-sm border px-3 py-4 text-left transition duration-300 ${on ? "border-glow/70 bg-glow/10" : "border-line hover:border-gold/40"}`}
                >
                  <span aria-hidden className={`absolute inset-x-0 top-0 h-[3px] transition-opacity duration-300 ${on ? "opacity-100" : "opacity-40 group-hover:opacity-70"}`} style={{ background: f.accent }} />
                  <span className={`hud block text-[22px] leading-tight transition-colors ${on ? "text-glow" : "text-cream"}`}>{f.name}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <div>
              <p className="hud text-3xl text-glow">{priced ? `₹${instant.price}` : "Price soon"}</p>
              <p className="mono mt-1 text-muted">
                {flavour.name} · {instant.name.toLowerCase()} coffee{instant.size && ` · ${instant.size}`}
              </p>
            </div>
            {priced ? (
              <button
                type="button"
                onClick={() => {
                  play("clink");
                  openOrder({ add: `${instant.id}:${flavour.id}` });
                }}
                className="hud rounded-sm bg-glow px-7 py-[13px] text-[16px] font-semibold text-ink transition hover:bg-cream"
              >
                + Add to order
              </button>
            ) : (
              <a href={ask} target="_blank" rel="noopener noreferrer" onClick={() => play("clink")} className="hud rounded-sm border border-gold/40 px-7 py-[13px] text-[16px] text-gold transition hover:border-glow hover:bg-glow hover:text-ink">
                Ask on WhatsApp ↗
              </a>
            )}
          </div>
        </div>
      </div>

      {/* make a cup: the live cup and the steps */}
      <div className="relative mx-auto mt-16 grid max-w-7xl items-center gap-10 border-t border-line pt-14 lg:mt-24 lg:grid-cols-[1fr_1fr] lg:gap-16 lg:pt-20">
        {/* the cup, seen from above, on a saucer */}
        <div className="relative mx-auto aspect-square w-full max-w-[520px] touch-none select-none">
          {/* one warm light from the top left: the saucer falls off into the dark bar top */}
          <div aria-hidden className="absolute inset-[-6%] rounded-full" style={{ background: "radial-gradient(circle at 46% 44%, rgba(233,196,106,.10), transparent 62%)" }} />
          {/* saucer: glazed stoneware, a raised outer ring and a shallow well */}
          <div aria-hidden className="absolute inset-[1%] rounded-full" style={{ background: "radial-gradient(circle at 36% 30%, #d9d1c4 0%, #b9b0a2 30%, #847a6c 58%, #3d362e 84%, #1a1612 100%)", boxShadow: "0 50px 80px -24px rgba(0,0,0,.95), 0 8px 18px rgba(0,0,0,.55)" }} />
          <div aria-hidden className="absolute inset-[1%] rounded-full" style={{ background: "conic-gradient(from 200deg, transparent 0deg, rgba(255,248,236,.28) 40deg, transparent 90deg, transparent 360deg)", WebkitMask: "radial-gradient(circle, transparent 66%, #000 67%, #000 71%, transparent 73%)", mask: "radial-gradient(circle, transparent 66%, #000 67%, #000 71%, transparent 73%)" }} />
          <div aria-hidden className="absolute inset-[9%] rounded-full" style={{ background: "radial-gradient(circle at 64% 70%, rgba(0,0,0,.55) 30%, rgba(0,0,0,.25) 58%, transparent 74%)", filter: "blur(6px)", transform: "translate(3%, 4%)" }} />
          {/* handle, seen from above: a short glazed loop with its own shadow */}
          <div aria-hidden className="absolute right-[1%] top-1/2 h-[17%] w-[12%] -translate-y-[40%] translate-x-[18%] rounded-full" style={{ background: "rgba(0,0,0,.5)", filter: "blur(7px)" }} />
          <div aria-hidden className="absolute right-[1.5%] top-1/2 h-[15%] w-[11%] -translate-y-1/2 rounded-r-full border-[clamp(5px,1.6vw,8px)] border-l-0" style={{ borderColor: "#e9e2d6 #b9ae9f #8d8374 transparent", boxShadow: "inset -2px 0 3px rgba(0,0,0,.25)" }} />
          {/* cup body: the outside wall curving away, then the rolled rim */}
          <div aria-hidden className="absolute inset-[7%] rounded-full" style={{ background: "radial-gradient(circle at 34% 28%, #fffdf8 0%, #efe9df 34%, #cfc6b8 66%, #93897a 90%, #6a6155 100%)", boxShadow: "0 14px 26px -8px rgba(0,0,0,.7)" }} />
          <div aria-hidden className="absolute inset-[7%] rounded-full" style={{ background: "conic-gradient(from 250deg, transparent 0deg, rgba(255,255,255,.9) 28deg, transparent 70deg, transparent 360deg)", WebkitMask: "radial-gradient(circle, transparent 92%, #000 94%, #000 97%, transparent 99%)", mask: "radial-gradient(circle, transparent 92%, #000 94%, #000 97%, transparent 99%)" }} />
          {/* inside wall: lit on the far (bottom right) side, in shadow under the near rim */}
          <div aria-hidden className="absolute inset-[9%] rounded-full" style={{ background: "radial-gradient(circle at 62% 68%, #f8f4ec 0%, #e3dbcd 52%, #b3a795 86%, #8a7f6e 100%)", boxShadow: "inset 6px 10px 18px rgba(0,0,0,.38), inset -1px -2px 2px rgba(255,255,255,.7)" }} />
          {/* steam */}
          <div aria-hidden className="pointer-events-none absolute inset-[18%] z-10 mix-blend-screen">
            {[0, 1, 2].map((i) => (
              <span key={i} className="bb-smoke absolute rounded-full" style={{ left: `${22 + i * 18}%`, top: `${18 + (i % 2) * 20}%`, width: "48%", height: "48%", background: "radial-gradient(circle, rgba(255,250,240,.10), transparent 65%)", filter: "blur(8px)", animationDelay: `${-i * 4.6}s`, animationDuration: "11s" }} />
            ))}
          </div>
          {/* the liquid (live), sized so its rim meets the cup's inner wall */}
          <canvas ref={canvas} aria-label="A cup of hot water. Tap to drop in a spoon of instant coffee, drag to stir." className="absolute inset-[9.5%] h-[81%] w-[81%] cursor-pointer rounded-full" />
          {!ok && <div aria-hidden className="absolute inset-[18%] rounded-full" style={{ background: "radial-gradient(circle at 40% 36%, #3b1e0c, #0d0603 70%)" }} />}

          <p className="mono pointer-events-none absolute right-0 top-0 text-muted">Tap for a spoon · drag to stir</p>
          <p className="mono pointer-events-none absolute bottom-0 left-0 text-muted" aria-live="polite">
            {spoons === 0 ? "Hot water, waiting" : `${spoons} spoon${spoons === 1 ? "" : "s"} in`}
          </p>
          {spoons > 0 && (
            <button type="button" onClick={() => wrap.current?.dispatchEvent(new Event("bb:fresh-cup"))} className="mono absolute bottom-0 right-0 text-muted transition hover:text-glow">
              Fresh cup ↺
            </button>
          )}
        </div>

        <div>
          <p className="mono text-muted">
            Make a cup <span className="text-glow">{"// "}Your turn</span>
          </p>
          <p className="hud mt-3 text-[clamp(2rem,3.6vw,3.2rem)] font-extralight leading-[0.95] text-cream">One spoon. Hot water. Stir.</p>
          <p className="mt-4 max-w-md text-[17px] leading-relaxed text-muted">Tap the cup to drop in a spoon and watch it dissolve. Drag to stir it black.</p>
          <ol className="mt-8 grid max-w-md grid-cols-2 gap-px overflow-hidden rounded-sm border border-line bg-line">
            {instant.howTo.map((s, i) => (
              <li key={s} className="bg-panel px-4 py-3">
                <span className="mono text-glow">{String(i + 1).padStart(2, "0")}</span>
                <span className="hud mt-1 block text-[17px] leading-tight text-cream">{s}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
