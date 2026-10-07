import { UNBOX_BOXES } from "@/content/unboxing";
import { Button } from "./Button";

/** A band on the home page that leads to the 3D Diwali hamper unboxing (/unbox). */
export function DiwaliBand() {
  const boxes = UNBOX_BOXES.filter((b) => b.id !== "build");
  return (
    <section aria-labelledby="diwali-title" className="relative overflow-hidden border-y border-line bg-panel px-5 py-20 sm:px-8 lg:px-12">
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(60% 120% at 80% 50%, rgba(233,196,106,.10), transparent 70%)" }} />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mono text-muted">
            Diwali 2026 <span className="text-glow">{"// "}Gift hampers</span>
          </p>
          <h2 id="diwali-title" className="serif mt-3 text-[clamp(2.2rem,4.6vw,4.2rem)] leading-[1.02] text-cream">
            Open a Diwali hamper <em className="text-glow">in 3D.</em>
          </h2>
          <p className="mt-4 max-w-xl text-lg text-cream/75">
            Untie the ribbon, lift the lid and see every piece up close, from rice husk kulhads to a French press. Or build your own box, piece by piece.
          </p>
          <ul className="hud mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[15px] text-muted">
            {boxes.map((b) => (
              <li key={b.id}>
                {b.name} <span className="text-glow">{b.price}</span>
              </li>
            ))}
            <li className="text-glow">+ Build your own</li>
          </ul>
        </div>
        <Button href="/unbox">Open the box ↗</Button>
      </div>
    </section>
  );
}
