"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { site } from "@/content/site";
import { FluidBottle, type BottleColours, type BottleLayout } from "./FluidBottle";
import { Button } from "./Button";

const COLOURS: BottleColours = { coffee: "#170b05", caramel: "#9a5a26", milk: "#f4e8cc" };
// right of the copy on wide screens, above it on phones
const LAYOUT: BottleLayout = (w, h) => (w / h > 1.1 ? { x: 0.66, y: 0.12, h: 0.8 } : { x: 0.5, y: 0.4, h: 0.49 });

/** Opening page: a bottle of live coffee you can stir, pour, tilt and shake. */
export function Hero() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current!;
    const items = el.querySelectorAll(".h-in");
    const intro = gsap.fromTo(items, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1, stagger: 0.08, ease: "power3.out", paused: true });
    const start = () => intro.play();
    if (document.getElementById("bb-loader")) window.addEventListener("bb:ready", start, { once: true });
    else start();
    return () => {
      intro.kill();
      window.removeEventListener("bb:ready", start);
    };
  }, []);

  const { hero } = site;

  return (
    <section ref={root} id="bottle" className="relative h-[100svh] min-h-[560px] overflow-hidden bg-ink">
      <FluidBottle variant="hero" colours={COLOURS} layout={LAYOUT} autoPour className="absolute inset-0" />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-transparent to-transparent lg:bg-gradient-to-r lg:from-ink/80 lg:via-transparent" />

      <div className="pointer-events-none absolute inset-x-0 bottom-12 px-5 pb-4 sm:px-8 lg:bottom-auto lg:top-1/2 lg:w-[46%] lg:-translate-y-1/2 lg:pl-12">
        <p className="h-in mono text-muted">
          {hero.kicker} <span className="text-glow">{"// 01. The Bottle"}</span>
        </p>
        <h1 className="h-in hud mt-3 max-w-[15ch] text-[clamp(2.4rem,6.4vw,6.2rem)] lg:max-w-[13ch] font-extralight leading-[0.9] text-cream">{hero.headline}</h1>
        <p className="h-in mt-5 hidden max-w-md text-[17px] leading-relaxed text-muted sm:block">{hero.body}</p>
        <ul className="h-in mt-6 hidden max-w-sm space-y-2 lg:block">
          {hero.specs.slice(0, 4).map(([k, v]) => (
            <li key={k} className="spec hud text-[15px]">
              <span className="text-muted">{k}</span>
              <i />
              <b className="font-normal text-cream">{v}</b>
            </li>
          ))}
        </ul>
        <div className="h-in pointer-events-auto mt-7 flex flex-wrap items-center gap-4">
          <Button href="#lineup">+ Order a bottle · ₹249</Button>
          <span className="mono hidden text-muted sm:inline">0% ABV · ID not required</span>
        </div>
        <p className="h-in mono mt-4 text-muted lg:hidden">Tap the bottle to pour · drag to tilt · hold the label to read it</p>
      </div>

      <div className="h-in pointer-events-none absolute right-5 top-20 hidden text-right sm:right-8 lg:top-24 lg:block">
        <p className="mono text-glow">Interactive</p>
        <p className="mono mt-2 leading-relaxed text-muted">
          Tap the bottle to pour
          <br />
          Drag to tilt · Double-tap to shake
          <br />
          Hover to stir
          <br />
          Hover the label to read it
        </p>
      </div>
    </section>
  );
}
