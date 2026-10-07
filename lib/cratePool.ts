/**
 * Ready-made live-liquid simulations for the bottles in the order panel's crate.
 *
 * A new WebGL simulation costs a hitch: the GPU finishes its shaders on the first draw, and on
 * Windows (ANGLE/D3D11) that can freeze every animation on the page for 100–300 ms. So crate bottles
 * don't make their own: spares are made ahead of time, while nothing is moving, drawn a few frames
 * off-screen, then paused. A bottle takes one (its canvas moves into the bottle; a canvas keeps its
 * WebGL context when moved) and gives it back, wiped, when it leaves the crate or freezes.
 * All crate canvases are the same size (CrateStage draws every bottle box at full size and scales
 * it), so any spare fits any bottle.
 */
import type { Fluid } from "./fluid";

export type Pooled = { canvas: HTMLCanvasElement; fluid: Fluid };

const BOX = { w: 80, h: 100 }; // CrateStage's bottle box, in CSS px
const CAP = 7; // the crate's live limit plus one spare; browsers allow ~16 WebGL contexts a page
const free: Pooled[] = [];
let total = 0;
let warming = false;
let holder: HTMLDivElement | null = null;

const hold = () => {
  if (!holder) {
    holder = document.createElement("div");
    holder.setAttribute("aria-hidden", "true");
    Object.assign(holder.style, { position: "fixed", left: "-400px", top: "0", width: `${BOX.w}px`, height: `${BOX.h}px`, opacity: "0", pointerEvents: "none" });
    document.body.appendChild(holder);
  }
  return holder;
};
const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

async function create(): Promise<Pooled | null> {
  const [{ createFluid }, shader] = await Promise.all([import("./fluid"), import("./bottleShader")]);
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
  hold().appendChild(canvas);
  let fluid: Fluid | null = null;
  try {
    fluid = createFluid(canvas, {
      sim: 64,
      dye: 320,
      curl: 28,
      velocityDissipation: 0.4,
      dyeDissipation: 0.004,
      mask: shader.MASK,
      display: shader.DISPLAY,
      alpha: true,
      overPanel: true,
    });
  } catch (err) {
    console.error(err);
  }
  if (!fluid) {
    canvas.remove();
    return null;
  }
  total++;
  Object.assign(fluid.uniforms, {
    uCoffee: shader.lin("#150a04"),
    uCaramel: shader.lin("#94551f"),
    uMilk: shader.lin("#f3e6c8"),
    uBg: 2,
    uBottle: [0.5, 0.03, 0.9, 0],
    uSurf: [0.73, 0, 0],
    uLight: [0.3, 0.8],
    uStream: [0, 0],
  });
  // compiled, then a few real frames so the driver has finished everything
  while (!fluid.ready()) await nextFrame();
  for (let i = 0; i < 3; i++) await nextFrame();
  fluid.setRunning(false);
  return { canvas, fluid };
}

/** a simulation for a crate bottle: a ready spare if there is one, else a new one */
export async function takeCrate(): Promise<Pooled | null> {
  return free.pop() ?? (await create());
}

/** back to the pool, wiped to plain coffee (or let go if the pool is full) */
export function returnCrate(p: Pooled) {
  p.fluid.setRunning(false);
  p.fluid.reset();
  p.canvas.className = "";
  p.canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
  hold().appendChild(p.canvas);
  if (free.length < 2 && total <= CAP) free.push(p);
  else {
    p.fluid.dispose();
    p.canvas.remove();
    total--;
  }
}

/** make spares (up to `spares`) one at a time, each only when `quiet()` says nothing is moving */
export async function warmCrates(spares: number, quiet: () => boolean = () => true) {
  if (warming) return;
  warming = true;
  try {
    while (free.length < spares && total < CAP) {
      while (!quiet()) await new Promise((r) => setTimeout(r, 250));
      const p = await create();
      if (!p) break;
      free.push(p);
    }
  } finally {
    warming = false;
  }
}
