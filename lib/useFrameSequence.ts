"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Plays a video as an image sequence on a canvas, scrubbed by scroll.
 * Frames come from scripts/build-sequence.mjs (or extract-frames.mjs) (public/<name>/manifest.json).
 * Frames start loading when the canvas is within ~1.5 screens of view.
 * If the manifest is missing, `ready` stays false so callers can show a stand-in.
 *
 *   const seq = useFrameSequence("spin");
 *   <canvas ref={seq.canvas} />   ...   seq.draw.current(progress)
 */
type Manifest = { count: number; pattern: string };

type Options = {
  /** progress at which the last frame is reached (the rest holds the last frame) */
  end?: number;
  /** "cover" fills the canvas (cropping), "contain" shows the whole frame (for cut-out bottles) */
  fit?: "cover" | "contain";
};

export function useFrameSequence(name: string, { end = 1, fit = "cover" }: Options = {}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frames = useRef<HTMLImageElement[]>([]);
  const draw = useRef<(p: number) => void>(() => {});
  const [ready, setReady] = useState(false);

  // ---- load the frames when the canvas gets close ----
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let cancelled = false;
    const io = new IntersectionObserver(
      async ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        let m: Manifest;
        try {
          const res = await fetch(`/${name}/manifest.json`);
          if (!res.ok) return;
          m = await res.json();
        } catch {
          return;
        }
        if (cancelled) return;
        const size = window.innerWidth < 768 ? "m" : "d";
        const list: HTMLImageElement[] = [];
        for (let i = 1; i <= m.count; i++) {
          const img = new Image();
          img.decoding = "async";
          img.src = m.pattern.replace("{size}", size).replace("{i}", String(i).padStart(4, "0"));
          list.push(img);
        }
        frames.current = list;
        list[0].onload = () => !cancelled && setReady(true);
      },
      { rootMargin: "1500px 0px" },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, [name]);

  // ---- draw: progress 0..end maps to the first..last frame ----
  useEffect(() => {
    if (!ready) return;
    const c = canvas.current!;
    const ctx = c.getContext("2d")!;
    let last = -1;
    let lastP = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = c.clientWidth * dpr;
      c.height = c.clientHeight * dpr;
      last = -1;
      draw.current(lastP);
    };
    draw.current = (p: number) => {
      lastP = p;
      const list = frames.current;
      let i = Math.round(Math.min(Math.max(p / end, 0), 1) * (list.length - 1));
      while (i > 0 && !list[i].complete) i--; // nearest frame that has loaded
      if (i === last) return;
      const img = list[i];
      if (!img.complete || !img.naturalWidth) return;
      last = i;
      const s = (fit === "cover" ? Math.max : Math.min)(c.width / img.naturalWidth, c.height / img.naturalHeight);
      const w = img.naturalWidth * s;
      const h = img.naturalHeight * s;
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(img, (c.width - w) / 2, (c.height - h) / 2, w, h);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [ready, end, fit]);

  return { canvas, ready, draw };
}
