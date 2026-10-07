"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { play } from "@/lib/sound";
import { warmCrates } from "@/lib/cratePool";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { FluidBottle, type BottleLayout } from "./FluidBottle";
import { COLOURS } from "./LineUp";

/**
 * The order panel's stage: a wooden crate and the live-liquid bottles from the line-up.
 * Every bottle you add drops in beside the crate (the coffee sloshes as it lands), is lifted over the
 * front wall and lowered into its slot, then gets its milk poured in. The crate grows a slot for each bottle.
 * When the order is sent the lid is nailed down, the crate is stamped and it ships out of frame.
 * The stage fills whatever height the panel gives it and scales to fit.
 */

const W = 340; // design size; the stage scales to fit its box, standing on its bottom edge
const H = 200;
const FLOOR = 188; // y of the floor line
const BH = 100; // a bottle's box (canvas) height at full size; the glass is ~91% of it
const BW = BH * 0.8; // wider than the glass, so the bottle can swing without clipping
const SLOT = 46; // the widest a slot gets
const POST = 12; // crate corner posts
const WALL_BACK = 86; // back wall: taller, so we see over the front wall into the crate
const WALL_FRONT = 52;
const MIN_SLOTS = 4;
const STAGING = BH * 0.4 + 30; // room at the right where each new bottle lands first
const LIFT = -(WALL_FRONT + 14); // bottom of a lifted bottle clears the front wall
const PATH_MS = 1750;
const GAP_MS = 480; // between bottles added together
/** live simulations at once (each is a WebGL context; older bottles keep a still frame) */
const MAX_LIVE = 6;

const LAYOUT: BottleLayout = () => ({ x: 0.5, y: 0.03, h: 0.9 });
/** bottles added together (or in quick succession) take turns */
const queue = { next: 0 };

/** a bottle's key: flavour + how many of that flavour came before it */
const keyOf = (bottles: string[], i: number) => `${bottles[i]}-${bottles.slice(0, i).filter((b) => b === bottles[i]).length}`;

/** a little seeded random, so the straw looks the same every render */
function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

/** wood wool (excelsior) packed round the bottles: curly straw strands as one SVG */
function WoodWool({ width, height }: { width: number; height: number }) {
  const strands = useMemo(() => {
    const r = rng(11);
    const out: { d: string; c: string; w: number }[] = [];
    const n = Math.round(width * 1.1);
    for (let i = 0; i < n; i++) {
      const x = r() * width;
      const y = height * (0.12 + r() * 0.88);
      const len = 10 + r() * 22;
      const a = (r() - 0.5) * 1.2 + (r() < 0.5 ? 0 : Math.PI);
      const x2 = x + Math.cos(a) * len;
      const y2 = y + Math.sin(a) * len * 0.5;
      const cx = (x + x2) / 2 + (r() - 0.5) * 14;
      const cy = (y + y2) / 2 - 4 - r() * 8;
      const t = r();
      const c = t < 0.4 ? "#c9a265" : t < 0.7 ? "#a77c44" : t < 0.9 ? "#dcbd83" : "#7d5a2e";
      out.push({ d: `M${x.toFixed(1)} ${y.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`, c, w: 0.6 + r() * 0.9 });
    }
    return out;
  }, [width, height]);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 overflow-visible" aria-hidden>
      {strands.map((s, i) => (
        <path key={i} d={s.d} stroke={s.c} strokeWidth={s.w} fill="none" strokeLinecap="round" opacity={0.92} />
      ))}
    </svg>
  );
}

/** one bottle: a live FluidBottle carried along its path into the crate (Web Animations, so it always finishes) */
function CrateBottle({
  id,
  x,
  bh,
  standX,
  headroom,
  frozen,
  reduced,
}: {
  id: string;
  x: number;
  bh: number;
  standX: number;
  /** design px of the box above the stage: the bottle starts its fall just above the top edge */
  headroom: number;
  frozen: boolean;
  reduced: boolean;
}) {
  const el = useRef<HTMLDivElement>(null);
  // The bottle box is always full size (BH) and scaled down to fit its slot, so its canvas never
  // changes size (resizing would reset the liquid, and re-allocate it every frame of a transition).
  const k = bh / BH;

  // before the first paint, so it never flashes in its slot first
  useLayoutEffect(() => {
    const node = el.current;
    if (!node || reduced) return;
    const now = performance.now();
    const wait = Math.max(now, queue.next) - now;
    queue.next = now + wait + GAP_MS;
    // this runs inside the slot scale k, so distances are divided by it and "full size" is 1 / k
    const s = 1 / k;
    const bx = (standX - x) / k; // over to the spot beside the crate
    const up = LIFT / k;
    const floor = 5 / k; // the slot sits 5px up off the floor
    const t = (dx: number, dy: number, sx: number, sy = sx) => `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    const anim = node.animate(
      [
        { offset: 0, transform: t(bx, -(FLOOR + headroom + 20) / k, s), easing: "cubic-bezier(.55, 0, 1, .45)" }, // falling
        { offset: 0.22, transform: t(bx, floor, s), easing: "ease-out" }, // lands beside the crate
        { offset: 0.27, transform: t(bx, floor, s * 1.05, s * 0.94), easing: "ease-in-out" }, // squash
        { offset: 0.33, transform: t(bx, floor, s), easing: "ease-in-out" },
        { offset: 0.46, transform: t(bx, floor, s), easing: "cubic-bezier(.45, 0, .3, 1)" }, // stands a moment
        { offset: 0.64, transform: t(bx, up, (s + 1) / 2), easing: "cubic-bezier(.45, 0, .55, 1)" }, // lifted
        { offset: 0.82, transform: t(0, up, 1), easing: "cubic-bezier(.3, 0, .2, 1)" }, // carried over the wall
        { offset: 1, transform: t(0, 0, 1) }, // lowered into its slot
      ],
      { duration: PATH_MS, delay: wait, fill: "backwards" },
    );
    const landed = setTimeout(() => play("tick", { gain: 0.5 }), wait + PATH_MS * 0.22);
    const placed = setTimeout(() => play("clink", { gain: 0.55 }), wait + PATH_MS);
    return () => {
      anim.cancel();
      clearTimeout(landed);
      clearTimeout(placed);
    };
    // the path is played once, when the bottle arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="crate-bottle absolute" style={{ left: x - BW / 2, top: FLOOR - 5 - BH, width: BW, height: BH, transform: `scale(${k})`, zIndex: 2 }}>
      <div ref={el} className="absolute inset-0" style={{ transformOrigin: "50% 100%", willChange: "transform" }}>
        {/* contact shadow: grounds it while it stands beside the crate (hidden by the wall once in) */}
        <span aria-hidden className="absolute bottom-[1%] left-1/2 h-[7%] w-[46%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(0,0,0,.6),transparent)]" />
        <FluidBottle variant="crate" colours={COLOURS[id] ?? COLOURS.classic} layout={LAYOUT} autoPour pourDelay={PATH_MS * 0.85} frozen={frozen} className="absolute inset-0" />
      </div>
    </div>
  );
}

export function CrateStage({ bottles, shipped, open }: { bottles: string[]; shipped: boolean; open: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 1, headroom: 0 });
  const { scale, headroom } = fit;
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = box.current!;
    const ro = new ResizeObserver(() => {
      const sc = Math.min(1.5, el.clientWidth / W, el.clientHeight / H);
      setFit({ scale: sc, headroom: Math.max(0, el.clientHeight / sc - H) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = bottles.length;

  // live liquid is made ahead of time (lib/cratePool.ts) so adding a bottle never stalls the page:
  // one spare when the page is first idle, more while the panel is open and nothing is moving in it
  useEffect(() => {
    if (reduced) return;
    const idle = window.requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 1));
    // (late, to stay clear of the page's own start-up: the bean scene and the bottles compile first)
    const t = window.setTimeout(() => idle(() => void warmCrates(1), { timeout: 4000 }), 12000);
    return () => clearTimeout(t);
  }, [reduced]);
  useEffect(() => {
    if (!open || reduced) return;
    const still = () => performance.now() > queue.next - GAP_MS + PATH_MS + 1800;
    const t = window.setTimeout(() => void warmCrates(2, still), 700);
    return () => clearTimeout(t);
  }, [open, n, reduced]);

  const slots = Math.max(MIN_SLOTS, n);
  const slotW = Math.min(SLOT, (W - 24 - STAGING - POST * 2) / slots);
  const bh = BH * (slotW / SLOT); // a bottle in its slot (smaller when the crate is long)
  const crateW = slots * slotW + POST * 2;
  const x0 = (W - crateW - STAGING) / 2;
  const standX = x0 + crateW + STAGING / 2 + 4; // centre of the spot beside the crate
  const inner = crateW - POST * 2;
  const lidTop = Math.min(FLOOR - WALL_BACK - 7, FLOOR - 5 - bh - 4); // clear of the tallest cap

  return (
    <div ref={box} className="absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="crate-stage absolute bottom-0 left-1/2"
        style={{ width: W, height: H, transform: `translateX(-50%) scale(${scale})`, transformOrigin: "50% 100%" }}
      >
        {/* floor: a worn plank floor with a soft pool of light */}
        <div className="crate-floor absolute inset-x-0" style={{ top: FLOOR, height: H - FLOOR + 20 }} />

        <div data-motion-frame className={`crate-ship absolute inset-0 ${shipped ? "is-shipped" : ""}`}>
          <div className="absolute rounded-[50%]" style={{ left: x0 - 14, width: crateW + 28, top: FLOOR - 7, height: 16, background: "radial-gradient(closest-side, rgba(0,0,0,.7), transparent)", transition: "left .6s, width .6s" }} />

          {/* back wall: its inside face, seen over the front wall */}
          <div className="crate absolute" style={{ left: x0, width: crateW, top: FLOOR - WALL_BACK, height: WALL_BACK }}>
            <div className="crate-back absolute inset-0">
              <span className="crate-back-seam" style={{ top: "34%" }} />
              <span className="crate-back-seam" style={{ top: "67%" }} />
            </div>
            <span className="crate-post crate-post-top left-0" />
            <span className="crate-post crate-post-top right-0" />
          </div>

          {/* empty slots waiting for a bottle */}
          {Array.from({ length: slots }, (_, i) => (
            <div
              key={`slot-${i}`}
              className={`crate-ghost absolute ${i < n ? "is-filled" : ""}`}
              style={{ left: x0 + POST + slotW * (i + 0.5) - bh * 0.19, top: FLOOR - 5 - bh * 0.94, width: bh * 0.38, height: bh * 0.91, zIndex: 1 }}
            />
          ))}

          {bottles.map((id, i) => (
            <CrateBottle
              key={keyOf(bottles, i)}
              id={id}
              x={x0 + POST + slotW * (i + 0.5)}
              bh={bh}
              standX={standX}
              headroom={headroom}
              frozen={i < n - MAX_LIVE}
              reduced={reduced}
            />
          ))}

          {/* wood wool packed round the bottles, peeking over the front wall */}
          <div className="absolute" style={{ left: x0 + POST - 2, width: inner + 4, top: FLOOR - WALL_FRONT - 9, height: WALL_FRONT + 4, zIndex: 3, transition: "left .6s, width .6s" }}>
            <WoodWool width={Math.round(inner + 4)} height={WALL_FRONT + 4} />
          </div>

          {/* front wall: two planks with a gap, corner posts with end grain, steel corners, rope handles, a branded stencil */}
          <div className="crate absolute" style={{ left: x0, width: crateW, top: FLOOR - WALL_FRONT, height: WALL_FRONT, zIndex: 4 }}>
            <div className="crate-front absolute inset-0">
              <span className="crate-plank" style={{ top: 0, height: "47%" }} />
              <span className="crate-plank" style={{ bottom: 0, height: "47%" }} />
              <span className="crate-post left-0" />
              <span className="crate-post right-0" />
              <span className="crate-corner left-0 top-0" />
              <span className="crate-corner right-0 top-0 -scale-x-100" />
              <span className="crate-corner bottom-0 left-0 -scale-y-100" />
              <span className="crate-corner bottom-0 right-0 -scale-100" />
              <span className="crate-stencil">BEAN &amp; BEYOND</span>
              <span className="crate-stencil-sub">COLD BREW · KEEP COOL{n ? ` · ${n} BTL` : ""}</span>
            </div>
            <span className="crate-rope left-0" />
            <span className="crate-rope right-0 -scale-x-100" />
          </div>

          {/* the lid: nailed down over the caps when the order is sent, then stamped */}
          <div className={`crate-lid absolute ${shipped ? "is-closed" : ""}`} style={{ left: x0 - 5, width: crateW + 10, top: lidTop, height: FLOOR - WALL_FRONT + 2 - lidTop, zIndex: 5 }}>
            <span className="crate-plank" style={{ top: 0, height: "32%" }} />
            <span className="crate-plank" style={{ top: "34%", height: "32%" }} />
            <span className="crate-plank" style={{ bottom: 0, height: "32%" }} />
            <span className="crate-batten" />
            <span className={`crate-label ${shipped ? "is-on" : ""}`}>SHIPPED</span>
          </div>
        </div>

        {n === 0 && (
          <p className="crate-hint mono absolute text-muted" style={{ left: x0 + crateW + 8, top: FLOOR - 74, width: STAGING + 10 }}>
            Add a bottle ↓
          </p>
        )}
        {shipped && (
          <p className="crate-done mono absolute inset-x-0 text-center text-glow" style={{ top: FLOOR - 70 }}>
            On its way ✓
          </p>
        )}
      </div>
    </div>
  );
}
