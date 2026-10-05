"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

const INTERACTIVE = "a, button, [role=button], [role=tab], input, select, textarea, label, [data-magnetic]";

/** A small gold dot with a trailing ring that opens up over anything clickable. Real pointers only. */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const d = dot.current!;
    const r = ring.current!;
    document.documentElement.classList.add("custom-cursor");
    const dx = gsap.quickTo(d, "x", { duration: 0.08 });
    const dy = gsap.quickTo(d, "y", { duration: 0.08 });
    const rx = gsap.quickTo(r, "x", { duration: 0.4, ease: "power3" });
    const ry = gsap.quickTo(r, "y", { duration: 0.4, ease: "power3" });
    gsap.set([d, r], { opacity: 0 });

    const move = (e: MouseEvent) => {
      dx(e.clientX);
      dy(e.clientY);
      rx(e.clientX);
      ry(e.clientY);
      // the 3D studio sets data-cursor when you're over the bottle
      const over = (e.target as Element | null)?.closest?.(INTERACTIVE) || document.documentElement.dataset.cursor;
      gsap.to(r, { scale: over ? 1.8 : 1, borderColor: over ? "rgba(233,196,106,.9)" : "rgba(220,192,138,.45)", duration: 0.25, overwrite: "auto" });
      gsap.to([d, r], { opacity: 1, duration: 0.2, overwrite: "auto" });
    };
    const down = () => gsap.fromTo(r, { scale: 0.7 }, { scale: 1, duration: 0.4, ease: "back.out(3)" });
    const leave = () => gsap.to([d, r], { opacity: 0, duration: 0.2 });
    window.addEventListener("mousemove", move);
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
      <div ref={ring} className="absolute left-0 top-0 -ml-4 -mt-4 h-8 w-8 rounded-full border border-gold/45 opacity-0" />
      <div ref={dot} className="absolute left-0 top-0 -ml-[3px] -mt-[3px] h-1.5 w-1.5 rounded-full bg-glow opacity-0" />
    </div>
  );
}
