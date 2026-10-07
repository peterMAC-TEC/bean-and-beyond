"use client";

import { site } from "@/content/site";
import { play } from "@/lib/sound";
import { openOrder } from "@/lib/order";
import { TextReveal } from "./TextReveal";
import { FluidBottle, type BottleColours, type BottleLayout } from "./FluidBottle";

// each flavour's liquid: coffee, the caramel in-between, and its milk
export const COLOURS: Record<string, BottleColours> = {
  classic: { coffee: "#150a04", caramel: "#94551f", milk: "#f3e6c8" },
  vanilla: { coffee: "#1d0f07", caramel: "#bb8c4f", milk: "#fcf2da" },
  hazelnut: { coffee: "#180b05", caramel: "#a8602c", milk: "#edd3aa" },
};
const CARD_LAYOUT: BottleLayout = () => ({ x: 0.5, y: 0.09, h: 0.74 });

/** The line-up: one card per flavour. "Add to order" opens the order panel (components/OrderDrawer.tsx). */
export function LineUp() {
  const { lineup, flavours, addOns, delivery } = site;
  const single = flavours[0].price;
  const milk = addOns.find((a) => a.show);

  return (
    <section id="lineup" className="relative bg-ink px-5 pb-28 pt-28 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 border-b border-line pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="mono text-muted">
              Menu <span className="text-glow">{"// "}{lineup.kicker}</span>
            </p>
            <TextReveal text={lineup.title} className="hud mt-3 text-[clamp(2.4rem,5vw,4.8rem)] font-extralight leading-none text-cream" />
          </div>
          <p className="mono text-muted">
            {flavours.length} flavours · ₹{single} each · 0% ABV
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {flavours.map((f, i) => (
            <article
              key={f.id}
              className="group surface overflow-hidden rounded-lg border border-line bg-panel transition duration-500 hover:-translate-y-1 hover:border-gold/40"
            >
              <div className="relative aspect-[4/4.4] overflow-hidden">
                <FluidBottle variant="card" colours={COLOURS[f.id] ?? COLOURS.classic} layout={CARD_LAYOUT} autoPour className="absolute inset-0" />
                <p className="mono pointer-events-none absolute left-4 top-4 rounded-sm border border-line bg-ink/80 px-2 py-1 text-muted">
                  {String(i + 1).padStart(2, "0")} / {lineup.tags[i] ?? f.name}
                </p>
                <p className="mono pointer-events-none absolute right-4 top-4 rotate-[-4deg] border border-brick/70 px-2 py-1 text-[#e0604f]">0% ABV</p>
              </div>

              <div className="p-5">
                <div className="flex items-baseline justify-between">
                  <h3 className="hud text-3xl font-medium text-cream">{f.name}</h3>
                  <p className="hud text-2xl text-glow">₹{f.price}</p>
                </div>
                <p className="mt-2 min-h-[3em] text-[15px] leading-relaxed text-muted">{f.oneLiner}</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {["180 ml", "+30 ml milk", "Serve on ice"].map((c) => (
                    <li key={c} className="mono rounded-sm border border-line px-2 py-1 text-muted">
                      {c}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => {
                    play("clink");
                    openOrder({ add: f.id });
                  }}
                  className="hud mt-5 block w-full rounded-sm border border-gold/40 py-3 text-center text-[15px] text-gold transition hover:border-glow hover:bg-glow hover:text-ink"
                >
                  + Add to order
                </button>
              </div>
            </article>
          ))}
        </div>

        {/* the order panel takes any number of bottles; one quiet line points to it */}
        <div className="mt-6 flex flex-col items-start justify-between gap-3 border-t border-line pt-5 sm:flex-row sm:items-center">
          <p className="mono text-muted">
            Mix &amp; match any number · free delivery from {delivery.freeFrom} bottles
            {milk && ` · ${milk.name} +₹${milk.price}`}
          </p>
          <button
            type="button"
            onClick={() => {
              play("clink");
              openOrder();
            }}
            className="hud text-[15px] text-glow underline-offset-4 transition hover:underline"
          >
            Fill a crate →
          </button>
        </div>
      </div>
    </section>
  );
}
