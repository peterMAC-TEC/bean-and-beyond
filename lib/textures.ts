/**
 * Textures painted in the browser for the 3D studio (no image files needed):
 * the redesigned label (colour + gold-foil maps), condensation droplets,
 * surface noise, bokeh and the cap's knurling.
 */
import * as THREE from "three";

const canvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
};

const tex = (c: HTMLCanvasElement, srgb = true) => {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

// ---------------------------------------------------------------- label ----
// The label is drawn twice with the same code: once in colour, once as a
// white-on-black "foil mask" that becomes the metalness/roughness maps, so
// every gold element is real metal in 3D and catches the light.

type Ink = { gold: string | CanvasGradient; foil: boolean };

const W = 1536;
const H = 2048;

function labelPath(g: CanvasRenderingContext2D, inset: number) {
  const l = 40 + inset;
  const r = W - 40 - inset;
  const t = 150 + inset;
  const b = H - 60 - inset;
  const n = 90 - inset * 0.5; // corner notch
  const arch = 110; // the top rises into an arch around the crest
  g.beginPath();
  g.moveTo(l + n, t);
  g.lineTo(W / 2 - 300, t);
  g.bezierCurveTo(W / 2 - 200, t, W / 2 - 170, t - arch, W / 2, t - arch);
  g.bezierCurveTo(W / 2 + 170, t - arch, W / 2 + 200, t, W / 2 + 300, t);
  g.lineTo(r - n, t);
  g.quadraticCurveTo(r - n, t + n, r, t + n);
  g.lineTo(r, b - n);
  g.quadraticCurveTo(r - n, b - n, r - n, b);
  g.lineTo(l + n, b);
  g.quadraticCurveTo(l + n, b - n, l, b - n);
  g.lineTo(l, t + n);
  g.quadraticCurveTo(l + n, t + n, l + n, t);
  g.closePath();
}

function flourish(g: CanvasRenderingContext2D, x: number, y: number, dir: 1 | -1, s = 1) {
  g.save();
  g.translate(x, y);
  g.scale(dir * s, s);
  g.beginPath();
  g.moveTo(0, 0);
  g.bezierCurveTo(60, -40, 140, -40, 190, 0);
  g.bezierCurveTo(220, 25, 260, 20, 270, -5);
  g.moveTo(40, 4);
  g.bezierCurveTo(90, 30, 150, 30, 180, 10);
  g.moveTo(190, 0);
  g.bezierCurveTo(200, -30, 240, -45, 262, -28);
  g.stroke();
  g.beginPath();
  g.arc(272, -8, 7, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

function bean(g: CanvasRenderingContext2D, x: number, y: number, rot: number, s: number, foilPass: boolean) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(s, s);
  if (!foilPass) {
    const grd = g.createRadialGradient(-20, -30, 10, 0, 0, 110);
    grd.addColorStop(0, "#e9cf98");
    grd.addColorStop(0.55, "#b88d50");
    grd.addColorStop(1, "#5e3c1c");
    g.fillStyle = grd;
    g.beginPath();
    g.ellipse(0, 0, 70, 100, 0, 0, Math.PI * 2);
    g.fill();
    // engraved hatching that follows the bean's curve
    g.save();
    g.clip();
    g.strokeStyle = "rgba(60,36,16,.55)";
    g.lineWidth = 2;
    for (let i = -100; i < 110; i += 9) {
      g.beginPath();
      g.ellipse(40, i, 70, 30, 0.4, Math.PI * 0.55, Math.PI * 1.15);
      g.stroke();
    }
    g.restore();
    g.strokeStyle = "#3a2210";
    g.lineWidth = 5;
    g.beginPath();
    g.ellipse(0, 0, 70, 100, 0, 0, Math.PI * 2);
    g.stroke();
    // the centre crease
    g.lineWidth = 9;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(-4, -92);
    g.bezierCurveTo(-34, -30, 30, 30, 4, 92);
    g.stroke();
    g.strokeStyle = "rgba(255,240,200,.5)";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(8, -88);
    g.bezierCurveTo(-20, -30, 42, 30, 16, 88);
    g.stroke();
  }
  g.restore();
}

function leaf(g: CanvasRenderingContext2D, x: number, y: number, rot: number, s: number) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(s, s);
  const grd = g.createLinearGradient(0, -40, 0, 40);
  grd.addColorStop(0, "#d8bd86");
  grd.addColorStop(1, "#7d5a2e");
  g.fillStyle = grd;
  g.beginPath();
  g.moveTo(0, 0);
  g.bezierCurveTo(70, -70, 210, -60, 280, 0);
  g.bezierCurveTo(210, 60, 70, 70, 0, 0);
  g.fill();
  g.strokeStyle = "#3e2712";
  g.lineWidth = 4;
  g.stroke();
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(6, 0);
  g.lineTo(272, 0);
  for (let i = 40; i < 250; i += 34) {
    g.moveTo(i, 0);
    g.quadraticCurveTo(i + 20, -18, i + 34, -36 + i * 0.06);
    g.moveTo(i, 0);
    g.quadraticCurveTo(i + 20, 18, i + 34, 36 - i * 0.06);
  }
  g.stroke();
  g.restore();
}

function drawLabel(g: CanvasRenderingContext2D, ink: Ink, fonts: { display: string; body: string }) {
  const foilPass = ink.foil;
  // stock
  labelPath(g, 0);
  if (foilPass) {
    g.fillStyle = "#000";
    g.fill();
  } else {
    const paper = g.createRadialGradient(W / 2, H * 0.45, 200, W / 2, H / 2, H * 0.75);
    paper.addColorStop(0, "#1a1511");
    paper.addColorStop(1, "#080605");
    g.fillStyle = paper;
    g.fill();
    // paper grain
    g.save();
    labelPath(g, 0);
    g.clip();
    // paper grain: one small noise tile, repeated
    const [nc, ng] = canvas(256, 256);
    const ni = ng.createImageData(256, 256);
    for (let i = 0; i < ni.data.length; i += 4) {
      ni.data[i] = 255;
      ni.data[i + 1] = 240;
      ni.data[i + 2] = 210;
      ni.data[i + 3] = Math.random() * 18;
    }
    ng.putImageData(ni, 0, 0);
    g.fillStyle = g.createPattern(nc, "repeat")!;
    g.fillRect(0, 0, W, H);
    g.restore();
  }

  g.strokeStyle = ink.gold;
  g.fillStyle = ink.gold;
  // frame: heavy foil rule, fine inner rule, dotted rule
  g.lineWidth = 12;
  labelPath(g, 0);
  g.stroke();
  g.lineWidth = 3;
  labelPath(g, 34);
  g.stroke();
  g.setLineDash([2, 14]);
  g.lineCap = "round";
  g.lineWidth = 5;
  labelPath(g, 52);
  g.stroke();
  g.setLineDash([]);

  // crest with crown
  const cx = W / 2;
  const cy = 210;
  g.lineWidth = 6;
  g.beginPath();
  g.arc(cx, cy, 120, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 2.5;
  g.beginPath();
  g.arc(cx, cy, 102, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.moveTo(cx - 48, cy - 40);
  g.lineTo(cx - 34, cy - 74);
  g.lineTo(cx - 16, cy - 50);
  g.lineTo(cx, cy - 86);
  g.lineTo(cx + 16, cy - 50);
  g.lineTo(cx + 34, cy - 74);
  g.lineTo(cx + 48, cy - 40);
  g.closePath();
  g.fill();
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `600 40px ${fonts.display}`;
  g.fillText("E S T D", cx, cy + 6);
  g.font = `700 54px ${fonts.display}`;
  g.fillText("2026", cx, cy + 58);
  g.lineWidth = 5;
  flourish(g, cx - 150, cy + 30, -1, 1.25);
  flourish(g, cx + 150, cy + 30, 1, 1.25);

  // title: condensed foil serif
  g.save();
  g.translate(cx, 560);
  g.scale(0.72, 1);
  g.font = `700 236px ${fonts.display}`;
  g.fillText("BEAN & BEYOND", 0, 0, (W - 260) / 0.72);
  g.restore();
  // rule with a diamond
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(170, 720);
  g.lineTo(cx - 60, 720);
  g.moveTo(cx + 60, 720);
  g.lineTo(W - 170, 720);
  g.stroke();
  g.beginPath();
  g.moveTo(cx, 694);
  g.lineTo(cx + 34, 720);
  g.lineTo(cx, 746);
  g.lineTo(cx - 34, 720);
  g.closePath();
  g.fill();
  g.font = `600 46px ${fonts.display}`;
  g.fillText("HAND-CRAFTED  ·  BATCH NO. 01  ·  VIETNAMESE COFFEE", cx, 800);

  // maroon band and the parchment oval
  const oy = 1190;
  if (!foilPass) {
    const band = g.createLinearGradient(0, oy - 170, 0, oy + 170);
    band.addColorStop(0, "#3a1714");
    band.addColorStop(0.5, "#5a2420");
    band.addColorStop(1, "#3a1714");
    g.fillStyle = band;
    g.fillRect(96, oy - 160, W - 192, 320);
  }
  g.fillStyle = ink.gold;
  g.fillRect(96, oy - 166, W - 192, 6);
  g.fillRect(96, oy + 160, W - 192, 6);
  g.lineWidth = 10;
  g.beginPath();
  g.ellipse(cx, oy, 470, 360, 0, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 3;
  g.beginPath();
  g.ellipse(cx, oy, 440, 330, 0, 0, Math.PI * 2);
  g.stroke();
  if (foilPass) {
    g.fillStyle = "#000";
    g.beginPath();
    g.ellipse(cx, oy, 436, 326, 0, 0, Math.PI * 2);
    g.fill();
  } else {
    const parch = g.createRadialGradient(cx, oy - 60, 40, cx, oy, 460);
    parch.addColorStop(0, "#f3e3bd");
    parch.addColorStop(0.7, "#d9bd86");
    parch.addColorStop(1, "#a9874e");
    g.fillStyle = parch;
    g.beginPath();
    g.ellipse(cx, oy, 436, 326, 0, 0, Math.PI * 2);
    g.fill();
    // engraving: leaves, cherries and three beans
    g.save();
    g.beginPath();
    g.ellipse(cx, oy, 436, 326, 0, 0, Math.PI * 2);
    g.clip();
    leaf(g, cx - 40, oy + 40, Math.PI + 0.5, 1.15);
    leaf(g, cx + 40, oy + 40, -0.5, 1.15);
    leaf(g, cx - 30, oy - 30, Math.PI + 1.1, 0.95);
    leaf(g, cx + 30, oy - 30, -1.1, 0.95);
    leaf(g, cx, oy - 40, -Math.PI / 2, 0.8);
    for (const [dx, dy] of [[-40, -200], [0, -230], [40, -200], [-20, -170], [20, -170], [0, -140]]) {
      const grd = g.createRadialGradient(cx + dx - 8, oy + dy - 8, 2, cx + dx, oy + dy, 26);
      grd.addColorStop(0, "#d9b888");
      grd.addColorStop(1, "#6b4520");
      g.fillStyle = grd;
      g.beginPath();
      g.arc(cx + dx, oy + dy, 26, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "#3e2712";
      g.lineWidth = 3;
      g.stroke();
    }
    bean(g, cx - 120, oy + 90, 0.5, 1.05, false);
    bean(g, cx + 120, oy + 95, -0.55, 1.05, false);
    bean(g, cx, oy + 10, -0.25, 1.3, false);
    g.restore();
  }

  // warning panel
  const wy = 1590;
  if (!foilPass) {
    g.fillStyle = "#ecdcb4";
    g.fillRect(170, wy, W - 340, 270);
    const age = g.createLinearGradient(170, wy, W - 170, wy + 270);
    age.addColorStop(0, "rgba(120,80,30,0)");
    age.addColorStop(1, "rgba(120,80,30,.22)");
    g.fillStyle = age;
    g.fillRect(170, wy, W - 340, 270);
    g.fillStyle = "#b8251a";
    g.font = `800 64px ${fonts.body}`;
    g.fillText("WARNING:", cx, wy + 62);
    g.fillStyle = "#24170d";
    g.font = `500 40px ${fonts.body}`;
    g.fillText("(1) Consuming this causes extreme alertness, sudden", cx, wy + 128);
    g.fillText("bursts of productivity, and an urge to conquer the day.", cx, wy + 176);
    g.fillText("(2) Contains 0% alcohol. 100% pure focus.", cx, wy + 224);
  }
  g.fillStyle = ink.gold;
  g.strokeStyle = ink.gold;
  g.lineWidth = 6;
  g.strokeRect(170, wy, W - 340, 270);

  // bottom medallion
  const my = H - 150;
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(cx - 330, my);
  g.lineTo(cx - 70, my);
  g.moveTo(cx + 70, my);
  g.lineTo(cx + 330, my);
  g.stroke();
  g.beginPath();
  g.arc(cx, my, 46, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? 13 : 30;
    g.lineTo(cx + Math.cos(a) * rr, my + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
}

export async function labelMaps() {
  const css = getComputedStyle(document.documentElement);
  const display = css.getPropertyValue("--font-display").trim() || "serif";
  const body = css.getPropertyValue("--font-hud").trim() || "sans-serif";
  // the page fonts are normally loaded already; never wait more than a moment
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 600))]);
  const fonts = { display, body };

  const [cc, cg] = canvas(W, H);
  const foil = cg.createLinearGradient(0, 0, W, H * 0.6);
  ["#7a5a26", "#e9cf8e", "#a37c3a", "#fff0c2", "#b48c45", "#f2d894", "#7f5f2a"].forEach((c, i, a) => foil.addColorStop(i / (a.length - 1), c));
  drawLabel(cg, { gold: foil, foil: false }, fonts);

  const [mc, mg] = canvas(W, H);
  mg.fillStyle = "#000";
  mg.fillRect(0, 0, W, H);
  drawLabel(mg, { gold: "#fff", foil: true }, fonts);

  // roughness: foil is polished (low), paper is matte (high)
  const [rc, rg] = canvas(W, H);
  const mask = mg.getImageData(0, 0, W, H);
  const rough = rg.createImageData(W, H);
  for (let i = 0; i < mask.data.length; i += 4) {
    const v = 205 - mask.data[i] * 0.72;
    rough.data[i] = rough.data[i + 1] = rough.data[i + 2] = v;
    rough.data[i + 3] = 255;
  }
  rg.putImageData(rough, 0, 0);

  return { map: tex(cc), metalnessMap: tex(mc, false), roughnessMap: tex(rc, false), aspect: W / H };
}

// ---------------------------------------------------------- condensation ----
/** Normal map of cold-glass condensation: thousands of tiny droplets and a few runs. */
export function dropletNormalMap(size = 1024) {
  const [c, g] = canvas(size, size);
  const img = g.createImageData(size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 128;
    d[i + 1] = 128;
    d[i + 2] = 255;
    d[i + 3] = 255;
  }
  const drop = (cx: number, cy: number, rx: number, ry: number) => {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
      for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const nx = (x - cx) / rx;
        const ny = (y - cy) / ry;
        const q = nx * nx + ny * ny;
        if (q > 1) continue;
        const nz = Math.sqrt(1 - q);
        const px = ((y + size) % size) * size + ((x + size) % size);
        d[px * 4] = 128 + nx * 120;
        d[px * 4 + 1] = 128 - ny * 120;
        d[px * 4 + 2] = 128 + nz * 127;
      }
    }
  };
  for (let i = 0; i < 2600; i++) {
    const r = 1.5 + Math.pow(Math.random(), 3) * 9;
    drop(Math.random() * size, Math.random() * size, r, r * (0.9 + Math.random() * 0.25));
  }
  // a few drips running down
  for (let i = 0; i < 14; i++) {
    const x = Math.random() * size;
    let y = Math.random() * size;
    const len = 60 + Math.random() * 200;
    const w = 2.5 + Math.random() * 2.5;
    for (let k = 0; k < len; k += 2) drop(x + Math.sin(k * 0.05) * 2, y + k, w, w * 1.4);
    drop(x, y + len, w * 1.9, w * 2.4);
    y = 0;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Soft grey noise for bump / roughness variation. */
export function noiseTexture(size = 256, scale = 1) {
  const [c, g] = canvas(size, size);
  const img = g.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * 255 * scale;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  g.filter = "blur(1px)";
  g.drawImage(c, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Vertical knurling for the aluminium cap, as a bump map. */
export function knurlTexture() {
  const [c, g] = canvas(1024, 64);
  for (let x = 0; x < 1024; x += 8) {
    const grd = g.createLinearGradient(x, 0, x + 8, 0);
    grd.addColorStop(0, "#202020");
    grd.addColorStop(0.5, "#f0f0f0");
    grd.addColorStop(1, "#202020");
    g.fillStyle = grd;
    g.fillRect(x, 0, 8, 64);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

/** A soft disc for out-of-focus bar lights. */
export function bokehTexture() {
  const [c, g] = canvas(128, 128);
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.6, "rgba(255,255,255,.75)");
  grd.addColorStop(0.85, "rgba(255,255,255,.9)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  return tex(c);
}
