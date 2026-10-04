"use client";

import { useEffect, useRef, type ElementType } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/useReducedMotion";

type Props = {
  text: string;
  as?: ElementType;
  className?: string;
  /** "start" is a ScrollTrigger start position */
  start?: string;
};

/** Heading whose letters rise into place as it scrolls into view. */
export function TextReveal({ text, as: Tag = "h2", className = "", start = "top 85%" }: Props) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const letters = el.querySelectorAll<HTMLElement>("[data-l]");
    if (reduced) {
      gsap.set(letters, { clearProps: "transform" });
      return;
    }
    // y: 0 overrides the inline translateY used to hide letters before JS runs
    const tween = gsap.fromTo(
      letters,
      { y: 0, yPercent: 115, rotate: 6 },
      {
        y: 0,
        yPercent: 0,
        rotate: 0,
        duration: 0.8,
        ease: "power4.out",
        stagger: 0.025,
        scrollTrigger: { trigger: el, start, once: true },
      },
    );
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [reduced, text, start]);

  return (
    <Tag ref={ref} aria-label={text} className={className}>
      {text.split(" ").map((word, wi) => (
        <span key={wi} aria-hidden className="inline-block overflow-hidden whitespace-nowrap pb-[0.18em] -mb-[0.18em] align-bottom">
          {word.split("").map((ch, ci) => (
            <span key={ci} data-l className="inline-block" style={{ transform: "translateY(115%)" }}>
              {ch}
            </span>
          ))}
          {wi < text.split(" ").length - 1 ? " " : ""}
        </span>
      ))}
    </Tag>
  );
}

/** A brush stroke that paints itself in under a heading. */
export function BrushStroke({ className = "", color = "var(--brick)" }: { className?: string; color?: string }) {
  const ref = useRef<SVGPathElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const p = ref.current;
    if (!p) return;
    const len = p.getTotalLength();
    gsap.set(p, { strokeDasharray: len, strokeDashoffset: reduced ? 0 : len });
    if (reduced) return;
    const t = gsap.to(p, { strokeDashoffset: 0, duration: 1.1, ease: "power2.inOut", delay: 0.4, scrollTrigger: { trigger: p, start: "top 95%", once: true } });
    return () => {
      t.scrollTrigger?.kill();
      t.kill();
    };
  }, [reduced]);

  return (
    <svg viewBox="0 0 400 24" preserveAspectRatio="none" className={className} aria-hidden>
      <path ref={ref} d="M4 14 C60 4 120 20 190 11 S320 6 396 12" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" />
    </svg>
  );
}

export { ScrollTrigger };
