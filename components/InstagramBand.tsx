import { site } from "@/content/site";
import { Button } from "./Button";

/** The Instagram call-to-action (replaces the photo gallery). */
export function InstagramBand() {
  const { spotted, contact } = site;
  return (
    <section id="spotted" className="relative overflow-hidden border-y border-line bg-ink px-5 py-24 sm:px-8 lg:px-12">
      {/* a slow ticker of the handle, outlined */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 overflow-hidden whitespace-nowrap">
        <p className="bb-ticker hud inline-block text-[18vw] font-extralight leading-none text-transparent" style={{ WebkitTextStroke: "1px rgba(220,192,138,.14)" }}>
          @{contact.instagram} · @{contact.instagram} · @{contact.instagram} ·&nbsp;
        </p>
      </div>
      <div className="relative mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 md:flex-row md:items-end">
        <div>
          <p className="mono text-muted">
            Instagram <span className="text-glow">{"// "}{spotted.kicker}</span>
          </p>
          <h2 className="hud mt-3 text-[clamp(2.4rem,5vw,4.8rem)] font-extralight leading-none text-cream">Follow the pour.</h2>
          <p className="mt-4 max-w-md text-[16px] text-muted">Stall drops, new batches and the occasional bottle that didn&apos;t survive the party.</p>
        </div>
        <Button href={contact.instagramUrl} external>
          Follow @{contact.instagram} ↗
        </Button>
      </div>
    </section>
  );
}
