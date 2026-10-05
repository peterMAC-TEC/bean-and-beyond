"use client";

import { site } from "@/content/site";
import { play } from "@/lib/sound";
import { TextReveal } from "./TextReveal";
import { FluidBottle, type BottleColours, type BottleLayout } from "./FluidBottle";

// each flavour's liquid: coffee, the caramel in-between, and its milk
const COLOURS: Record<string, BottleColours> = {
  classic: { coffee: "#150a04", caramel: "#94551f", milk: "#f3e6c8" },
  vanilla: { coffee: "#1d0f07", caramel: "#bb8c4f", milk: "#fcf2da" },
  hazelnut: { coffee: "#180b05", caramel: "#a8602c", milk: "#edd3aa" },
};
const CARD_LAYOUT: BottleLayout = () => ({ x: 0.5, y: 0.09, h: 0.74 });

const wa = (text: string) => `https://wa.me/${site.contact.whatsapp}?text=${encodeURIComponent(text)}`;

/** The line-up: one card per flavour, then the packs. TODO (Phase 3): buttons add to the cart. */
export function LineUp() {
  const { lineup, flavours, packs, addOns } = site;
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
              className="group overflow-hidden rounded-lg border border-line bg-panel transition duration-500 hover:-translate-y-1 hover:border-gold/40"
            >
              <div className="relative aspect-[4/4.4] overflow-hidden">
                <FluidBottle variant="card" colours={COLOURS[f.id] ?? COLOURS.classic} layout={CARD_LAYOUT} autoPour className="absolute inset-0" />
                <p className="mono pointer-events-none absolute left-4 top-4 rounded-sm border border-line bg-ink/60 px-2 py-1 text-muted backdrop-blur">
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
                <a
                  href={wa(`Hi! I'd like to order a ${f.name} bottle.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => play("clink")}
                  className="hud mt-5 block rounded-sm border border-gold/40 py-3 text-center text-[15px] text-gold transition hover:border-glow hover:bg-glow hover:text-ink"
                >
                  + Add to order
                </a>
              </div>
            </article>
          ))}
        </div>

        {/* packs */}
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {packs.map((p) => {
            const save = p.size * single - p.price;
            const free = !p.delivery.startsWith("TODO");
            return (
              <div key={p.id} className="brackets flex flex-col justify-between gap-6 rounded-lg border border-line bg-panel-2 p-6 sm:flex-row sm:items-center">
                <div>
                  <p className="mono text-muted">Mix &amp; match · {p.size} bottles</p>
                  <p className="hud mt-2 text-4xl font-extralight text-cream">The {p.size}-pack</p>
                  <p className="mono mt-2 text-glow">
                    Save ₹{save} · {free ? p.delivery : "+ delivery"}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="hud text-4xl text-glow">₹{p.price}</p>
                  <a
                    href={wa(`Hi! I'd like the ${p.size}-pack. Flavours: `)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => play("clink")}
                    className="hud mt-3 inline-block rounded-sm bg-glow px-5 py-2.5 text-[15px] font-medium text-ink transition hover:bg-cream"
                  >
                    + Build my {p.size}-pack
                  </a>
                </div>
              </div>
            );
          })}
        </div>
        {milk && (
          <p className="mono mt-5 text-muted">
            Add-on: {milk.name} · ₹{milk.price} — for the ones who like it sweeter.
          </p>
        )}
      </div>
    </section>
  );
}
