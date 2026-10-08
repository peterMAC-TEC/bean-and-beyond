/**
 * A single roasted coffee bean drawn as a fine vintage engraving (one sepia ink on cream), for the
 * oval on the instant coffee label. Built line by line like a hand-cut plate: lines run along the
 * bean from tip to tip, following the crease and the rim, and swell where the form turns from the
 * light; cross-hatching deepens the shadows, highlights are left as bare paper. A cast shadow and a
 * fine sunburst sit behind it; the crease shows a sliver of paper, as if it has just begun to open.
 *
 * The same code is copied into brand/instant-pouch/index.html (the print-file page): keep them in step.
 */

type G = CanvasRenderingContext2D;

const INK = "#2e1a0b";
const PAPER = "#f3e3bd";

// the bean, in its own units: half-width A, half-length B (long axis along y)
const A = 1;
const B = 1.36;
const rimAt = (y: number) => A * Math.sqrt(Math.max(0, 1 - (y / B) ** 2));
const creaseAt = (y: number) => 0.1 * Math.sin(y * 2.3) + 0.03 * Math.sin(y * 6);

function height(x: number, y: number) {
  const e = 1 - (x / A) ** 2 - (y / B) ** 2;
  if (e <= 0) return 0;
  let z = Math.sqrt(e) * 0.62; // the flat face of the bean, the crease side, faces us
  const along = Math.sqrt(Math.max(0, 1 - (y / (B * 0.96)) ** 2));
  const dx = x - creaseAt(y);
  z -= 0.42 * along * Math.exp(-((dx / 0.075) ** 2)); // the crease
  z += 0.07 * along * Math.exp(-(((Math.abs(dx) - 0.17) / 0.09) ** 2)); // its raised lips
  return z;
}

/** 0 = full light (bare paper), 1 = deepest shadow */
function darkness(x: number, y: number, L: [number, number, number]) {
  const e = 0.004;
  const gx = (height(x + e, y) - height(x - e, y)) / (2 * e);
  const gy = (height(x, y + e) - height(x, y - e)) / (2 * e);
  const n = [-gx, -gy, 1];
  const len = Math.hypot(n[0], n[1], n[2]);
  const lit = Math.max(0, (n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) / len);
  let d = 1 - Math.pow(lit, 0.75);
  // the form falls away into shadow at the rim on the side away from the light
  const r = Math.hypot(x / A, y / B);
  const away = Math.max(0, -(x * L[0] + y * L[1]) / Math.hypot(x, y || 1e-6));
  d += 0.45 * Math.max(0, (r - 0.7) / 0.3) * (0.4 + away);
  // the bottom of the crease is always black
  const dx = Math.abs(x - creaseAt(y));
  d += 0.9 * Math.exp(-((dx / 0.05) ** 2)) * Math.sqrt(Math.max(0, 1 - (y / B) ** 2));
  return Math.min(1, Math.max(0, d));
}

/** a line whose weight follows the shading, drawn as short round-capped strokes */
function swell(g: G, pts: [number, number][], weight: (x: number, y: number) => number, px: number) {
  g.lineCap = "round";
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const w = weight((x0 + x1) / 2, (y0 + y1) / 2);
    if (w <= 0) continue;
    g.lineWidth = w / px;
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.stroke();
  }
}

/**
 * Draw the engraving centred on (cx, cy). `size` is the bean's half-length in canvas px, `rot` its
 * tilt in radians. `clip` is the oval it sits in (the sunburst fills it).
 */
export function engravedBean(g: G, cx: number, cy: number, size: number, rot: number, clip: { rx: number; ry: number }) {
  const px = size / B; // canvas px per bean unit
  // light from the top left of the label, turned into the bean's own frame
  const ls: [number, number] = [-0.55, -0.62];
  const c = Math.cos(-rot), s = Math.sin(-rot);
  const L: [number, number, number] = [ls[0] * c - ls[1] * s, ls[0] * s + ls[1] * c, 0.62];
  const ll = Math.hypot(...L);
  L[0] /= ll;
  L[1] /= ll;
  L[2] /= ll;

  g.save();
  g.strokeStyle = INK;
  g.fillStyle = INK;

  // ---- behind: a fine sunburst filling the oval, leaving a halo round the bean ----
  // the sunburst stops short of a clear halo round the bean and its shadow (an ellipse in the bean's tilt)
  g.save();
  const burst = new Path2D();
  burst.ellipse(cx, cy, clip.rx, clip.ry, 0, 0, Math.PI * 2);
  burst.ellipse(cx + size * 0.07, cy + size * 0.1, (A / B) * size * 1.22, size * 1.2, rot, 0, Math.PI * 2);
  g.clip(burst, "evenodd");
  g.lineWidth = 1.1;
  g.globalAlpha = 0.55;
  for (let i = 0; i < 300; i++) {
    const a = (i / 300) * Math.PI * 2;
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(a) * clip.rx * 1.2, cy + Math.sin(a) * clip.rx * 1.2);
    g.stroke();
  }
  g.globalAlpha = 1;
  g.restore();

  // ---- the cast shadow: level hatching to the bottom right, heavy under the bean, fading out ----
  {
    const sx = cx + size * 0.13, sy = cy + size * 0.19;
    const ca = Math.cos(rot), sa = Math.sin(rot);
    const ex = (A / B) * size * 1.06, ey = size * 1.02;
    const r2 = (x: number, y: number) => {
      const lx = (x - sx) * ca + (y - sy) * sa, ly = -(x - sx) * sa + (y - sy) * ca;
      return (lx / ex) ** 2 + (ly / ey) ** 2;
    };
    g.lineCap = "round";
    for (let y = sy - size * 1.1; y < sy + size * 1.1; y += 5.5) {
      for (let x = sx - size * 1.1; x < sx + size * 1.1; x += 4) {
        const r = r2(x + 2, y);
        if (r >= 1) continue;
        g.lineWidth = 0.4 + 2.6 * (1 - r) ** 1.4;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + 4.2, y);
        g.stroke();
      }
    }
  }

  // ---- the bean ----
  g.translate(cx, cy);
  g.rotate(rot);
  g.scale(px, px);

  // its silhouette, in paper, so nothing behind shows through
  const outline: [number, number][] = [];
  for (let i = 0; i <= 120; i++) {
    const y = -B + (2 * B * i) / 120;
    outline.push([rimAt(y), y]);
  }
  for (let i = 120; i >= 0; i--) {
    const y = -B + (2 * B * i) / 120;
    outline.push([-rimAt(y), y]);
  }
  g.beginPath();
  outline.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.fillStyle = PAPER;
  g.fill();
  g.save();
  g.clip();

  const dark = (x: number, y: number) => darkness(x, y, L);

  // 1. the main lines: tip to tip, each half running from the crease out to the rim
  const N = 30;
  for (const side of [-1, 1]) {
    for (let k = 1; k <= N; k++) {
      const t = (k - 0.35) / N;
      const pts: [number, number][] = [];
      for (let i = 0; i <= 160; i++) {
        const y = -B * 0.985 + (2 * B * 0.985 * i) / 160;
        const xc = creaseAt(y) * (1 - Math.min(1, Math.abs(y) / B) ** 4);
        pts.push([xc + (side * rimAt(y) - xc) * t, y]);
      }
      swell(g, pts, (x, y) => {
        const d = dark(x, y);
        return d < 0.13 ? 0 : 0.35 + 3.3 * Math.pow((d - 0.13) / 0.87, 1.25);
      }, px);
    }
  }

  // 2. cross-hatching in the shadows: lines across the bean, bowed with its curve
  for (let y0 = -B; y0 <= B; y0 += 0.055) {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 90; i++) {
      const x = -A + (2 * A * i) / 90;
      pts.push([x, y0 + 0.16 * (1 - (x / A) ** 2) * Math.sign(y0 || 1) * -0.6]);
    }
    swell(g, pts, (x, y) => {
      const d = dark(x, y);
      return d < 0.55 ? 0 : 0.3 + 2.4 * ((d - 0.55) / 0.45);
    }, px);
  }

  // 3. a third, diagonal pass only in the very deepest shadow
  for (let k = -3; k <= 3; k += 0.05) {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 60; i++) {
      const tt = -1.6 + (3.2 * i) / 60;
      pts.push([k * 0.5 + tt * 0.7, tt * 0.7 - k * 0.5]);
    }
    swell(g, pts, (x, y) => {
      const d = dark(x, y);
      return d < 0.8 ? 0 : 0.3 + 2.0 * ((d - 0.8) / 0.2);
    }, px);
  }

  // 4. the crease: a deep black split, with paper showing on its lit lip (it's just starting to open)
  const crease = (off: number) => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 120; i++) {
      const y = -B * 0.93 + (2 * B * 0.93 * i) / 120;
      pts.push([creaseAt(y) + off, y]);
    }
    return pts;
  };
  swell(g, crease(0), (_x, y) => 3 + 13 * Math.pow(Math.max(0, 1 - (y / B) ** 2), 0.8), px);
  g.strokeStyle = PAPER;
  swell(g, crease(-0.055), (_x, y) => 2.2 * Math.max(0, 1 - (y / (B * 0.7)) ** 2), px);
  g.strokeStyle = INK;
  g.restore();

  // 5. the outline: hairline where the light falls, heavy on the shadow side
  for (let i = 1; i < outline.length; i++) {
    const [x0, y0] = outline[i - 1];
    const [x1, y1] = outline[i];
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    const facing = -(mx * L[0] + my * L[1]) / (Math.hypot(mx, my) || 1); // 1 = away from the light
    g.lineWidth = (1.4 + 3.6 * Math.max(0, facing)) / px;
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.stroke();
  }
  g.restore();
}
