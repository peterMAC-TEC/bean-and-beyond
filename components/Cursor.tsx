"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

const INTERACTIVE = "a, button, [role=button], [role=tab], [role=radio], input, select, textarea, label, [data-magnetic]";

// the bean's S-shaped crease, and the two halves it splits the bean into
const CREASE = "M21 5 C 12 15, 28 22, 20 30 S 15 42, 19 48";
const LEFT = `${CREASE} L 19 53 L -2 53 L -2 -1 L 21 -1 Z`;
const RIGHT = `${CREASE} L 19 53 L 42 53 L 42 -1 L 21 -1 Z`;

/**
 * The cursor is a roasted coffee bean. It turns to point the way you move, and over anything
 * clickable it splits open along its crease, the two halves easing apart. It squashes when you click.
 * Real mouse/trackpad only; touch screens keep their normal behaviour.
 */
export function Cursor() {
  const bean = useRef<HTMLDivElement>(null);
  const left = useRef<SVGGElement>(null);
  const right = useRef<SVGGElement>(null);
  const core = useRef<SVGEllipseElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const b = bean.current!;
    const l = left.current!;
    const r = right.current!;
    const glow = core.current!;
    document.documentElement.classList.add("custom-cursor");
    const bx = gsap.quickTo(b, "x", { duration: 0.09, ease: "power3" });
    const by = gsap.quickTo(b, "y", { duration: 0.09, ease: "power3" });
    const turn = gsap.quickTo(b, "rotation", { duration: 0.6, ease: "power3" });
    gsap.set(b, { opacity: 0, xPercent: -50, yPercent: -50 });
    gsap.set([l, r], { svgOrigin: "20 30" });

    let shown = false;
    let over = false;
    let angle = 0;
    let lx = 0;
    let ly = 0;
    const split = (open: boolean) => {
      gsap.to(l, { x: open ? -5 : 0, rotation: open ? -16 : 0, duration: open ? 0.45 : 0.35, ease: open ? "back.out(2.2)" : "power3.out" });
      gsap.to(r, { x: open ? 5 : 0, rotation: open ? 16 : 0, duration: open ? 0.45 : 0.35, ease: open ? "back.out(2.2)" : "power3.out" });
      gsap.to(glow, { opacity: open ? 1 : 0, duration: 0.3 });
      gsap.to(b, { scale: open ? 1.25 : 1, duration: 0.35, ease: "power3.out" });
    };
    const move = (e: MouseEvent) => {
      bx(e.clientX);
      by(e.clientY);
      // point the bean's long side along the direction of travel (shortest way round)
      const vx = e.clientX - lx;
      const vy = e.clientY - ly;
      lx = e.clientX;
      ly = e.clientY;
      if (vx * vx + vy * vy > 9 && !over) {
        const target = (Math.atan2(vy, vx) * 180) / Math.PI + 90;
        let d = target - angle;
        d -= Math.round(d / 360) * 360;
        angle += d * 0.35; // only lean part-way: it drifts round instead of snapping
        turn(angle);
      }
      if (!shown) {
        shown = true;
        gsap.to(b, { opacity: 1, duration: 0.25 });
      }
      // only animate when the hover state actually changes
      const now = !!((e.target as Element | null)?.closest?.(INTERACTIVE) || document.documentElement.dataset.cursor);
      if (now !== over) {
        over = now;
        // stand upright while split, so it reads as an opened bean
        if (over) {
          angle = Math.round(angle / 360) * 360;
          turn(angle);
        }
        split(over);
      }
    };
    const down = () => gsap.fromTo(b, { scaleX: over ? 1.45 : 1.2, scaleY: over ? 1.05 : 0.82 }, { scaleX: over ? 1.25 : 1, scaleY: over ? 1.25 : 1, duration: 0.5, ease: "elastic.out(1, 0.45)" });
    const leave = () => {
      shown = false;
      gsap.to(b, { opacity: 0, duration: 0.2 });
    };
    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("mousedown", down);
    document.addEventListener("mouseleave", leave);
    return () => {
      document.documentElement.classList.remove("custom-cursor");
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mousedown", down);
      document.removeEventListener("mouseleave", leave);
    };
  }, []);

  const half = (clip: string, ref: React.RefObject<SVGGElement | null>, lip: "l" | "r") => (
    <g ref={ref} clipPath={`url(#${clip})`}>
      <ellipse cx="20" cy="26" rx="17" ry="23" fill="url(#bb-bean)" stroke="rgba(233,196,106,.45)" strokeWidth="1.1" />
      {/* the cut face along the crease: a pale roasted lip that shows when the halves part */}
      <path d={CREASE} fill="none" stroke={lip === "l" ? "rgba(214,170,120,.45)" : "rgba(190,140,95,.4)"} strokeWidth="4.2" strokeLinecap="round" />
      <path d={CREASE} fill="none" stroke="url(#bb-crease)" strokeWidth="2.4" strokeLinecap="round" />
      {lip === "l" && <ellipse cx="12.5" cy="15" rx="3.2" ry="6" fill="rgba(255,230,190,.28)" transform="rotate(-18 12.5 15)" />}
    </g>
  );

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[9999]">
      <div ref={bean} className="absolute left-0 top-0 h-[26px] w-5 opacity-0 will-change-transform" style={{ filter: "drop-shadow(0 2px 5px rgba(0,0,0,.6))" }}>
        <svg viewBox="-4 -2 48 56" className="h-full w-full overflow-visible">
          <defs>
            <radialGradient id="bb-bean" cx="38%" cy="32%" r="75%">
              <stop offset="0" stopColor="#8a5430" />
              <stop offset="0.45" stopColor="#5a3018" />
              <stop offset="1" stopColor="#24110a" />
            </radialGradient>
            <linearGradient id="bb-crease" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#170a05" />
              <stop offset="1" stopColor="#0d0603" />
            </linearGradient>
            <radialGradient id="bb-core" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="rgba(255,214,140,.85)" />
              <stop offset="1" stopColor="rgba(255,190,100,0)" />
            </radialGradient>
            <clipPath id="bb-half-l">
              <path d={LEFT} />
            </clipPath>
            <clipPath id="bb-half-r">
              <path d={RIGHT} />
            </clipPath>
          </defs>
          {/* a warm glow from inside, seen through the split */}
          <ellipse ref={core} cx="20" cy="28" rx="7" ry="20" fill="url(#bb-core)" opacity="0" />
          {half("bb-half-l", left, "l")}
          {half("bb-half-r", right, "r")}
        </svg>
      </div>
    </div>
  );
}
