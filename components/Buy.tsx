"use client";

import { useState } from "react";
import { site } from "@/content/site";
import { play } from "@/lib/sound";
import { openOrder } from "@/lib/order";
import { TextReveal } from "./TextReveal";
import { Magnetic } from "./Magnetic";
import { FluidBottle, type BottleColours, type BottleLayout } from "./FluidBottle";

// fixed for the life of the page: changing it would rebuild the live liquid
const COLOURS: BottleColours = { coffee: "#160a04", caramel: "#9a5a26", milk: "#f4e8cc" };
const LAYOUT: BottleLayout = (w, h) => (w / h > 0.9 ? { x: 0.5, y: 0.08, h: 0.8 } : { x: 0.5, y: 0.08, h: 0.78 });

/** The last stop: pick a flavour and how many, then buy (opens the order panel). */
export function Buy() {
  const { buy, flavours, delivery } = site;
  const [pick, setPick] = useState(flavours[0].id);
  const [qty, setQty] = useState(1);
  const flavour = flavours.find((f) => f.id === pick) ?? flavours[0];
  const total = flavour.price * qty;
  const step = (d: number) => {
    play("tick", { gain: 0.7 });
    setQty((q) => Math.max(1, Math.min(9, q + d)));
  };

  return (
    <section id="buy" className="relative overflow-hidden bg-ink px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
      {/* a warm pool of light behind the bottle */}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 45% 55% at 30% 50%, rgba(138,92,44,.22), transparent 70%)" }} />

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
        {/* the bottle: live coffee you can tap, stir and tilt */}
        <div className="relative mx-auto aspect-[4/5] w-full max-w-[460px] overflow-hidden rounded-lg border border-line bg-panel">
          <FluidBottle variant="card" colours={COLOURS} layout={LAYOUT} autoPour className="absolute inset-0" />
          <p className="mono pointer-events-none absolute left-4 top-4 rounded-sm border border-line bg-ink/80 px-2 py-1 text-muted">Tap to pour · drag to tilt · read the label</p>
          <p className="mono pointer-events-none absolute right-4 top-4 rotate-[-4deg] border border-brick/70 px-2 py-1 text-[#e0604f]">0% ABV</p>
        </div>

        <div>
          <p className="mono text-muted">
            Buy <span className="text-glow">{"// "}{buy.kicker}</span>
          </p>
          <TextReveal text={buy.title} className="hud mt-3 text-[clamp(2.8rem,6vw,5.6rem)] font-extralight leading-[0.92] text-cream" />
          <p className="mt-5 max-w-md text-[17px] leading-relaxed text-muted">{buy.text}</p>

          {/* flavour */}
          <div role="radiogroup" aria-label="Flavour" className="mt-9 grid grid-cols-3 gap-2 sm:gap-3">
            {flavours.map((f) => {
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
                  <span className={`hud block text-2xl transition-colors ${on ? "text-glow" : "text-cream"}`}>{f.name}</span>
                  <span className="mono mt-1 block text-muted">₹{f.price}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 min-h-[1.6em] text-[15px] text-muted">{flavour.oneLiner}</p>

          {/* how many, and buy */}
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1 rounded-sm border border-line p-1" aria-label="Quantity">
              <button type="button" onClick={() => step(-1)} disabled={qty === 1} aria-label="One less bottle" className="grid h-11 w-11 place-items-center rounded-sm text-xl text-cream transition hover:bg-panel-2 disabled:opacity-25">
                −
              </button>
              <span className="hud w-8 text-center text-2xl text-cream" aria-live="polite">
                {qty}
              </span>
              <button type="button" onClick={() => step(1)} disabled={qty === 9} aria-label="One more bottle" className="grid h-11 w-11 place-items-center rounded-sm text-xl text-cream transition hover:bg-panel-2 disabled:opacity-25">
                +
              </button>
            </div>
            <Magnetic strength={0.2}>
              <button
                type="button"
                onClick={() => {
                  play("clink");
                  openOrder({ mode: "bottles", add: flavour.id, qty });
                }}
                className="hud rounded-sm bg-glow px-8 py-[14px] text-[17px] font-semibold text-ink shadow-[0_0_40px_rgba(233,196,106,.25)] transition hover:bg-cream"
              >
                Buy {qty === 1 ? "a bottle" : `${qty} bottles`} · ₹{total}
              </button>
            </Magnetic>
          </div>

          <button
            type="button"
            onClick={() => {
              play("clink");
              openOrder();
            }}
            className="mono mt-6 text-muted transition hover:text-glow"
          >
            Mix &amp; match any number · free delivery from {delivery.freeFrom} bottles →
          </button>
        </div>
      </div>
    </section>
  );
}
