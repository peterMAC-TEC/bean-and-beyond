"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/useReducedMotion";

/** Smooth scrolling, kept in step with GSAP ScrollTrigger. Off for reduced motion. */
export function SmoothScroll() {
  const reduced = useReducedMotion();

  // once fonts and images settle, re-measure every scroll animation top to bottom
  useEffect(() => {
    const refresh = () => {
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
    };
    window.addEventListener("bb:ready", refresh);
    window.addEventListener("load", refresh);
    return () => {
      window.removeEventListener("bb:ready", refresh);
      window.removeEventListener("load", refresh);
    };
  }, []);

  useEffect(() => {
    if (reduced) return;
    const lenis = new Lenis({ lerp: 0.1, anchors: true });
    lenis.on("scroll", ScrollTrigger.update);
    // dev only: lets automated checks jump straight to a scroll position
    if (process.env.NODE_ENV !== "production") (window as unknown as { __lenis: Lenis }).__lenis = lenis;
    const tick = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, [reduced]);

  return null;
}
