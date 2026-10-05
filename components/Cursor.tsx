"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

const INTERACTIVE = "a, button, [role=button], [role=tab], [role=radio], input, select, textarea, label, [data-magnetic]";

/**
 * The cursor is a roasted coffee bean. It turns to point the way you move,
 * swells with a gold ring over anything clickable, and squashes when you click.
 * Real mouse/trackpad only; touch screens keep their normal behaviour.
 */
export function Cursor() {
  const bean = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const b = bean.current!;
    const r = ring.current!;
    document.documentElement.classList.add("custom-cursor");
    // position: the bean sticks to the pointer, the ring trails softly behind
    const bx = gsap.quickTo(b, "x", { duration: 0.09, ease: "power3" });
    const by = gsap.quickTo(b, "y", { duration: 0.09, ease: "power3" });
    const rx = gsap.quickTo(r, "x", { duration: 0.45, ease: "power3" });
    const ry = gsap.quickTo(r, "y", { duration: 0.45, ease: "power3" });
    const turn = gsap.quickTo(b, "rotation", { duration: 0.6, ease: "power3" });
    gsap.set([b, r], { opacity: 0, xPercent: -50, yPercent: -50 });

    let shown = false;
    let over = false;
    let angle = 0;
    let lx = 0;
    let ly = 0;
    const move = (e: MouseEvent) => {
      bx(e.clientX);
      by(e.clientY);
      rx(e.clientX);
      ry(e.clientY);
      // point the bean's long side along the direction of travel (shortest way round)
      const vx = e.clientX - lx;
      const vy = e.clientY - ly;
      lx = e.clientX;
      ly = e.clientY;
      if (vx * vx + vy * vy > 9) {
        const target = (Math.atan2(vy, vx) * 180) / Math.PI + 90;
        let d = target - angle;
        d -= Math.round(d / 360) * 360;
        angle += d * 0.35; // only lean part-way: it drifts round instead of snapping
        turn(angle);
      }
      if (!shown) {
        shown = true;
        gsap.to([b, r], { opacity: 1, duration: 0.25 });
      }
      // only animate when the hover state actually changes
      const now = !!((e.target as Element | null)?.closest?.(INTERACTIVE) || document.documentElement.dataset.cursor);
      if (now !== over) {
        over = now;
        gsap.to(b, { scale: over ? 1.35 : 1, duration: 0.35, ease: "back.out(2)" });
        gsap.to(r, { scale: over ? 1 : 0.4, opacity: over ? 1 : 0, duration: 0.35, ease: "power3.out" });
      }
    };
    const down = () => gsap.fromTo(b, { scaleX: over ? 1.6 : 1.25, scaleY: over ? 1.05 : 0.8 }, { scaleX: over ? 1.35 : 1, scaleY: over ? 1.35 : 1, duration: 0.5, ease: "elastic.out(1, 0.45)" });
    const leave = () => {
      shown = false;
      gsap.to([b, r], { opacity: 0, duration: 0.2 });
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

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[9999]">
      <div ref={ring} className="absolute left-0 top-0 h-11 w-11 rounded-full border border-glow/70 opacity-0 will-change-transform" />
      <div ref={bean} className="absolute left-0 top-0 h-[26px] w-5 opacity-0 will-change-transform" style={{ filter: "drop-shadow(0 2px 5px rgba(0,0,0,.6))" }}>
        <svg viewBox="0 0 40 52" className="h-full w-full">
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
          </defs>
          {/* the bean */}
          <ellipse cx="20" cy="26" rx="17" ry="23" fill="url(#bb-bean)" stroke="rgba(233,196,106,.55)" strokeWidth="1.2" />
          {/* its S-shaped crease, with a pale lip catching the light */}
          <path d="M21 5 C 12 15, 28 22, 20 30 S 15 42, 19 48" fill="none" stroke="rgba(214,170,120,.35)" strokeWidth="4.2" strokeLinecap="round" />
          <path d="M21 5 C 12 15, 28 22, 20 30 S 15 42, 19 48" fill="none" stroke="url(#bb-crease)" strokeWidth="2.6" strokeLinecap="round" />
          {/* an oily glint */}
          <ellipse cx="12.5" cy="15" rx="3.2" ry="6" fill="rgba(255,230,190,.28)" transform="rotate(-18 12.5 15)" />
        </svg>
      </div>
    </div>
  );
}
