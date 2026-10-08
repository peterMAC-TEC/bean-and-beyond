"use client";

import { useEffect, useRef, useState } from "react";
import { site } from "@/content/site";
import { play } from "@/lib/sound";
import { useReducedMotion } from "@/lib/useReducedMotion";
import type { PouchScene } from "@/lib/pouchScene";

/**
 * The instant coffee pouch in 3D (lib/pouchScene.ts): drag to turn it, tap to read the back.
 * It builds once the section is about a screen away. Until then, and wherever 3D can't run
 * (or motion is reduced), a still render of the same pouch stands in.
 */
export function InstantPouch() {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState(false);
  const [back, setBack] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const el = box.current!;
    let scene: PouchScene | null = null;
    let cancelled = false;
    let onScreen = false;
    let locked = false;
    const run = () => scene?.setRunning(onScreen && !locked);
    const io = new IntersectionObserver(
      ([e]) => {
        onScreen = e.isIntersecting;
        run();
      },
      { rootMargin: "120px" },
    );
    // the order panel pauses everything behind it
    const lock = () => ((locked = true), run());
    const unlock = () => ((locked = false), run());
    window.addEventListener("bb:lock", lock);
    window.addEventListener("bb:unlock", unlock);

    const start = async () => {
      try {
        const { createPouchScene } = await import("@/lib/pouchScene");
        if (cancelled) return;
        const s = await createPouchScene(canvas.current!, (b) => {
          setBack(b);
          play("whoosh", { gain: 0.25 });
        });
        if (cancelled) return s.dispose();
        scene = s;
        setLive(true);
        io.observe(el);
      } catch (err) {
        console.error(err);
      }
    };
    const idle = window.requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 1));
    const near = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        near.disconnect();
        idle(() => void start(), { timeout: 1200 });
      },
      { rootMargin: "100% 0px" },
    );
    near.observe(el);
    return () => {
      cancelled = true;
      near.disconnect();
      io.disconnect();
      window.removeEventListener("bb:lock", lock);
      window.removeEventListener("bb:unlock", unlock);
      scene?.dispose();
    };
  }, [reduced]);

  return (
    <div ref={box} className="relative mx-auto aspect-square w-full max-w-[720px] select-none">
      {/* a warm pool of light on the bar top behind it */}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 55% 45% at 50% 58%, rgba(138,92,44,.28), transparent 72%)" }} />
      {/* eslint-disable-next-line @next/next/no-img-element -- a plain still; next/image adds nothing for one decorative frame */}
      <img
        src="/instant/pouch.jpg"
        alt={`${site.brand.name} ${site.instant.name} coffee: a matte black stand-up pouch with the gold-foil label`}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_62%,transparent_100%)] ${live ? "opacity-0" : "opacity-100"}`}
      />
      <canvas
        ref={canvas}
        aria-label={`The ${site.instant.name} coffee pouch in 3D. Drag to turn it, tap to see the ${back ? "front" : "back"}.`}
        className={`absolute inset-0 h-full w-full cursor-grab touch-pan-y transition-opacity duration-700 [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_62%,transparent_100%)] active:cursor-grabbing ${live ? "opacity-100" : "opacity-0"}`}
      />
      <p className="mono pointer-events-none absolute bottom-0 left-0 text-muted">
        {live ? `Drag to turn · tap for the ${back ? "front" : "back"}` : "Instant · stand-up zip pouch"}
      </p>
      <p className="mono pointer-events-none absolute right-0 top-0 rotate-[-4deg] border border-glow/70 px-2 py-1 text-glow">{site.instant.tag}</p>
    </div>
  );
}
