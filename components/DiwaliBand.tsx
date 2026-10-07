import { UNBOX_BOXES } from "@/content/unboxing";
import { Button } from "./Button";

// out-of-focus diya lights drifting behind the band: [left %, top %, size px, strength, drift x, drift y, seconds]
const BOKEH: [number, number, number, number, number, number, number][] = [
  [62, 18, 120, 0.22, 40, -20, 19], [74, 62, 70, 0.4, -24, -30, 15], [83, 30, 46, 0.55, 18, 22, 13], [90, 72, 150, 0.16, -30, -16, 23],
  [55, 70, 38, 0.5, 26, -18, 12], [68, 40, 26, 0.7, -14, 20, 11], [96, 12, 64, 0.3, -20, 28, 17], [47, 25, 90, 0.14, 30, 14, 21],
  [79, 88, 30, 0.6, 16, -24, 14], [88, 48, 22, 0.75, -10, -14, 10], [35, 80, 60, 0.12, 22, -20, 24], [58, 50, 16, 0.8, 12, 10, 9],
];

/** A band on the home page that leads to the 3D Diwali hamper unboxing (/unbox). */
export function DiwaliBand() {
  const boxes = UNBOX_BOXES.filter((b) => b.id !== "build");
  return (
    <section aria-labelledby="diwali-title" className="relative overflow-hidden border-y border-line bg-panel px-5 py-20 shadow-[inset_0_24px_40px_-24px_rgba(0,0,0,.85),inset_0_-24px_40px_-24px_rgba(0,0,0,.85)] sm:px-8 lg:px-12">
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(60% 120% at 80% 50%, rgba(233,196,106,.10), transparent 70%)" }} />
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {BOKEH.map(([x, y, d, a, dx, dy, t], i) => (
          <span key={i} className="bokeh" style={{ left: `${x}%`, top: `${y}%`, width: d, height: d, marginLeft: -d / 2, marginTop: -d / 2, "--a": a, "--dx": `${dx}px`, "--dy": `${dy}px`, "--t": `${t}s`, animationDelay: `${-i * 1.7}s` } as React.CSSProperties} />
        ))}
      </div>
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
