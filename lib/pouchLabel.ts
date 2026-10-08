/**
 * The instant coffee pouch label, painted on canvases for the 3D pouch (components/Instant.tsx).
 * Same artwork as the print files in brand/instant-pouch/ (that page also carries the statutory
 * back panel; the website's back shows the how-to instead of blank MRP / licence fields).
 * Each side is drawn twice: in colour, and as a white-on-black foil mask that becomes polished metal.
 */
import { site } from "@/content/site";

export const LABEL_W = 1536;
export const LABEL_H = 2048;
const W = LABEL_W;
const H = LABEL_H;

type Ink = { gold: string | CanvasGradient; foil: boolean };
type Fonts = { display: string; hud: string };
type G = CanvasRenderingContext2D;
export type InstantFlavour = (typeof site.instant.flavours)[number];

/** a hex colour, darkened (k < 1) or lightened (k > 1) */
const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * k))));
  return `rgb(${c.join(",")})`;
};

const canvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
};

/** The notched label outline with the arch around the crest. Also used to cut the sticker out in 3D. */
export function labelPath(g: G, inset: number) {
  const l = 40 + inset, r = W - 40 - inset, t = 150 + inset, b = H - 60 - inset, n = 90 - inset * 0.5, arch = 110;
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

function flourish(g: G, x: number, y: number, dir: 1 | -1, s = 1) {
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

function bean(g: G, x: number, y: number, rot: number, s: number) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(s, s);
  const grd = g.createRadialGradient(-20, -30, 10, 0, 0, 110);
  grd.addColorStop(0, "#e9cf98");
  grd.addColorStop(0.55, "#b88d50");
  grd.addColorStop(1, "#5e3c1c");
  g.fillStyle = grd;
  g.beginPath();
  g.ellipse(0, 0, 70, 100, 0, 0, Math.PI * 2);
  g.fill();
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
  g.restore();
}

function leaf(g: G, x: number, y: number, rot: number, s: number) {
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

const seeded = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

/** An engraved hazelnut: round body, pale textured cap, a little point on top. */
function hazelnut(g: G, x: number, y: number, rot: number, s: number) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(s, s);
  const body = g.createRadialGradient(-16, -6, 6, 0, 8, 70);
  body.addColorStop(0, "#e2bb82");
  body.addColorStop(0.6, "#a8743c");
  body.addColorStop(1, "#5e3a18");
  g.fillStyle = body;
  g.beginPath();
  g.moveTo(0, -58);
  g.bezierCurveTo(40, -50, 58, -8, 54, 22);
  g.bezierCurveTo(50, 56, 22, 66, 0, 66);
  g.bezierCurveTo(-22, 66, -50, 56, -54, 22);
  g.bezierCurveTo(-58, -8, -40, -50, 0, -58);
  g.fill();
  g.strokeStyle = "#3e2712";
  g.lineWidth = 4;
  g.stroke();
  // grain lines running down the shell
  g.strokeStyle = "rgba(62,39,18,.45)";
  g.lineWidth = 2;
  for (let i = -40; i <= 40; i += 10) {
    g.beginPath();
    g.moveTo(i * 0.6, -40);
    g.quadraticCurveTo(i * 1.1, 10, i * 0.7, 60);
    g.stroke();
  }
  // the pale rough cap
  g.save();
  g.beginPath();
  g.ellipse(0, 40, 50, 28, 0, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = "#d8bd8a";
  g.fillRect(-60, 0, 120, 80);
  g.fillStyle = "rgba(62,39,18,.5)";
  const rnd = seeded(11);
  for (let i = 0; i < 70; i++) g.fillRect(-50 + rnd() * 100, 14 + rnd() * 52, 2.5, 2.5);
  g.restore();
  g.strokeStyle = "#3e2712";
  g.lineWidth = 3;
  g.beginPath();
  g.ellipse(0, 40, 50, 28, 0, Math.PI * 1.05, Math.PI * 1.95);
  g.stroke();
  g.fillStyle = "#5e3a18";
  g.beginPath();
  g.moveTo(-6, -56);
  g.lineTo(0, -72);
  g.lineTo(6, -56);
  g.fill();
  g.restore();
}

/** An engraved caramel: a soft-edged amber cube with a glossy top. */
function caramel(g: G, x: number, y: number, rot: number, s: number) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(s, s);
  const r = 14, w = 96;
  const grd = g.createLinearGradient(-w / 2, -w / 2, w / 2, w / 2);
  grd.addColorStop(0, "#f2c77e");
  grd.addColorStop(0.5, "#c98a3a");
  grd.addColorStop(1, "#7a4614");
  g.fillStyle = grd;
  g.beginPath();
  g.roundRect(-w / 2, -w / 2, w, w, r);
  g.fill();
  g.strokeStyle = "#3e2712";
  g.lineWidth = 4;
  g.stroke();
  // a bevel and a glossy streak, like a boiled sweet
  g.strokeStyle = "rgba(255,236,190,.55)";
  g.lineWidth = 3;
  g.beginPath();
  g.roundRect(-w / 2 + 10, -w / 2 + 10, w - 20, w - 20, r - 6);
  g.stroke();
  g.fillStyle = "rgba(255,248,225,.6)";
  g.beginPath();
  g.ellipse(-18, -22, 22, 7, -0.6, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

/** An engraved antique spoon heaped with granules: the hero of the instant label. */
function spoon(g: G, x: number, y: number, rot: number, s: number) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(s, s);
  const hg = g.createLinearGradient(-20, 0, 20, 0);
  hg.addColorStop(0, "#8f7a56");
  hg.addColorStop(0.45, "#efe2c4");
  hg.addColorStop(1, "#7a6545");
  g.fillStyle = hg;
  g.beginPath();
  g.moveTo(-16, 96);
  g.bezierCurveTo(-10, 200, -12, 330, -26, 410);
  g.bezierCurveTo(-30, 450, 30, 450, 26, 410);
  g.bezierCurveTo(12, 330, 10, 200, 16, 96);
  g.closePath();
  g.fill();
  g.strokeStyle = "#3e2712";
  g.lineWidth = 4;
  g.stroke();
  g.strokeStyle = "rgba(62,39,18,.45)";
  g.lineWidth = 2;
  for (let i = 120; i < 420; i += 12) {
    g.beginPath();
    g.moveTo(-9, i);
    g.lineTo(-3, i + 6);
    g.stroke();
  }
  const bg = g.createRadialGradient(-26, -40, 8, 0, 0, 120);
  bg.addColorStop(0, "#f6ecd2");
  bg.addColorStop(0.6, "#c7b28a");
  bg.addColorStop(1, "#7d6844");
  g.fillStyle = bg;
  g.beginPath();
  g.ellipse(0, 0, 76, 108, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#3e2712";
  g.lineWidth = 5;
  g.stroke();
  g.save();
  g.beginPath();
  g.ellipse(0, 4, 64, 94, 0, 0, Math.PI * 2);
  g.clip();
  const rnd = seeded(7);
  for (let i = 0; i < 260; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd());
    const gx = Math.cos(a) * r * 62, gy = Math.sin(a) * r * 92 + 6;
    const sz = 5 + rnd() * 8;
    g.fillStyle = ["#2a170b", "#4a2c14", "#6b4520", "#3a2210"][i % 4];
    g.beginPath();
    for (let k = 0; k < 5; k++) {
      const b = (k / 5) * Math.PI * 2 + rnd();
      g.lineTo(gx + Math.cos(b) * sz * (0.6 + rnd() * 0.5), gy + Math.sin(b) * sz * (0.6 + rnd() * 0.5));
    }
    g.closePath();
    g.fill();
    if (i % 3 === 0) {
      g.fillStyle = "rgba(255,236,200,.35)";
      g.fillRect(gx - 2, gy - 3, 2.5, 2.5);
    }
  }
  g.restore();
  g.restore();
}

function crest(g: G, cx: number, cy: number, s: number, f: Fonts) {
  g.save();
  g.translate(cx, cy);
  g.scale(s, s);
  g.lineWidth = 6;
  g.beginPath();
  g.arc(0, 0, 120, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 2.5;
  g.beginPath();
  g.arc(0, 0, 102, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.moveTo(-48, -40);
  g.lineTo(-34, -74);
  g.lineTo(-16, -50);
  g.lineTo(0, -86);
  g.lineTo(16, -50);
  g.lineTo(34, -74);
  g.lineTo(48, -40);
  g.closePath();
  g.fill();
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `600 40px ${f.display}`;
  g.fillText("E S T D", 0, 6);
  g.font = `700 54px ${f.display}`;
  g.fillText(String(site.brand.established), 0, 58);
  g.lineWidth = 5;
  flourish(g, -150, 30, -1, 1.25);
  flourish(g, 150, 30, 1, 1.25);
  g.restore();
}

function diamondRule(g: G, y: number, half: number) {
  const cx = W / 2;
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(cx - half, y);
  g.lineTo(cx - 60, y);
  g.moveTo(cx + 60, y);
  g.lineTo(cx + half, y);
  g.stroke();
  g.beginPath();
  g.moveTo(cx, y - 26);
  g.lineTo(cx + 34, y);
  g.lineTo(cx, y + 26);
  g.lineTo(cx - 34, y);
  g.closePath();
  g.fill();
}

function stock(g: G, foil: boolean) {
  labelPath(g, 0);
  if (foil) {
    g.fillStyle = "#000";
    g.fill();
    return;
  }
  const paper = g.createRadialGradient(W / 2, H * 0.45, 200, W / 2, H / 2, H * 0.75);
  paper.addColorStop(0, "#1a1511");
  paper.addColorStop(1, "#080605");
  g.fillStyle = paper;
  g.fill();
  g.save();
  labelPath(g, 0);
  g.clip();
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

function frame(g: G, ink: Ink) {
  g.strokeStyle = ink.gold;
  g.fillStyle = ink.gold;
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
}

function vegMark(g: G, x: number, y: number, size: number) {
  g.fillStyle = "#fff";
  g.fillRect(x - 8, y - 8, size + 16, size + 16);
  g.strokeStyle = "#0b8a3a";
  g.lineWidth = size * 0.09;
  g.strokeRect(x + size * 0.045, y + size * 0.045, size * 0.91, size * 0.91);
  g.fillStyle = "#0b8a3a";
  g.beginPath();
  g.arc(x + size / 2, y + size / 2, size * 0.26, 0, Math.PI * 2);
  g.fill();
}


function drawFront(g: G, ink: Ink, f: Fonts, flavour: InstantFlavour) {
  const { instant } = site;
  const foil = ink.foil, cx = W / 2;
  stock(g, foil);
  frame(g, ink);
  crest(g, cx, 210, 1, f);

  g.textAlign = "center";
  g.textBaseline = "middle";
  g.save();
  g.translate(cx, 488);
  g.scale(0.72, 1);
  g.font = `700 224px ${f.display}`;
  g.fillText(site.brand.name.toUpperCase(), 0, 0, (W - 260) / 0.72);
  g.restore();
  diamondRule(g, 616, W / 2 - 170);
  g.font = `600 44px ${f.display}`;
  g.fillText("HAND-CRAFTED  ·  BATCH NO. 01  ·  DARK ROAST", cx, 672);

  // the flavour colours the ribbon behind the oval
  const oy = 1030, rx = 430, ry = 272;
  if (!foil) {
    const band = g.createLinearGradient(0, oy - 150, 0, oy + 150);
    band.addColorStop(0, shade(flavour.band, 0.62));
    band.addColorStop(0.5, flavour.band);
    band.addColorStop(1, shade(flavour.band, 0.62));
    g.fillStyle = band;
    g.fillRect(96, oy - 140, W - 192, 280);
  }
  g.fillStyle = ink.gold;
  g.fillRect(96, oy - 146, W - 192, 6);
  g.fillRect(96, oy + 140, W - 192, 6);
  g.lineWidth = 10;
  g.beginPath();
  g.ellipse(cx, oy, rx + 30, ry + 30, 0, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 3;
  g.beginPath();
  g.ellipse(cx, oy, rx, ry, 0, 0, Math.PI * 2);
  g.stroke();
  if (foil) {
    g.fillStyle = "#000";
    g.beginPath();
    g.ellipse(cx, oy, rx - 4, ry - 4, 0, 0, Math.PI * 2);
    g.fill();
  } else {
    const parch = g.createRadialGradient(cx, oy - 60, 40, cx, oy, 460);
    parch.addColorStop(0, "#f3e3bd");
    parch.addColorStop(0.7, "#d9bd86");
    parch.addColorStop(1, "#a9874e");
    g.fillStyle = parch;
    g.beginPath();
    g.ellipse(cx, oy, rx - 4, ry - 4, 0, 0, Math.PI * 2);
    g.fill();
    g.save();
    g.beginPath();
    g.ellipse(cx, oy, rx - 4, ry - 4, 0, 0, Math.PI * 2);
    g.clip();
    leaf(g, cx - 60, oy + 50, Math.PI + 0.45, 1.05);
    leaf(g, cx + 60, oy + 60, -0.4, 1.05);
    leaf(g, cx - 40, oy - 40, Math.PI + 1.0, 0.9);
    leaf(g, cx + 50, oy - 50, -1.0, 0.85);
    for (const [dx, dy] of [[150, -200], [190, -175], [168, -150], [210, -205]]) {
      const grd = g.createRadialGradient(cx + dx - 8, oy + dy - 8, 2, cx + dx, oy + dy, 24);
      grd.addColorStop(0, "#d9b888");
      grd.addColorStop(1, "#6b4520");
      g.fillStyle = grd;
      g.beginPath();
      g.arc(cx + dx, oy + dy, 24, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "#3e2712";
      g.lineWidth = 3;
      g.stroke();
    }
    bean(g, cx + 210, oy + 70, -0.6, 0.95);
    bean(g, cx - 270, oy + 80, 0.7, 0.85);
    // the flavour's own engraving beside the beans
    if (flavour.id === "hazelnut") {
      hazelnut(g, cx + 305, oy - 30, 0.25, 0.95);
      hazelnut(g, cx + 330, oy + 110, -0.4, 0.75);
    } else if (flavour.id === "caramel") {
      caramel(g, cx + 300, oy - 30, 0.3, 0.9);
      caramel(g, cx + 340, oy + 100, -0.25, 0.7);
    } else bean(g, cx + 300, oy - 20, 0.4, 0.8);
    spoon(g, cx - 60, oy - 10, -0.95, 1.08);
    const rnd = seeded(3);
    for (let i = 0; i < 26; i++) {
      g.fillStyle = i % 2 ? "#3a2210" : "#5e3c1c";
      const gx = cx - 230 + rnd() * 160, gy = oy + 90 + rnd() * 110, sz = 4 + rnd() * 6;
      g.beginPath();
      for (let k = 0; k < 5; k++) {
        const b = (k / 5) * Math.PI * 2 + rnd();
        g.lineTo(gx + Math.cos(b) * sz, gy + Math.sin(b) * sz);
      }
      g.fill();
    }
    g.restore();
  }

  // the flavour, as large as the label allows, then what it is
  g.fillStyle = ink.gold;
  g.strokeStyle = ink.gold;
  g.save();
  g.translate(cx, 1458);
  g.scale(0.8, 1);
  g.font = `700 250px ${f.display}`;
  g.fillText(flavour.name.toUpperCase(), 0, 0, (W - 280) / 0.8);
  g.restore();
  diamondRule(g, 1602, W / 2 - 260);
  g.save();
  g.translate(cx, 1678);
  g.scale(0.9, 1);
  g.font = `600 92px ${f.display}`;
  g.fillText(`${instant.name} coffee`.toUpperCase().split("").join(String.fromCharCode(8202)), 0, 0, (W - 360) / 0.9);
  g.restore();
  g.font = `600 40px ${f.display}`;
  g.fillText("INSTANT GRANULES  ·  ONE SPOON, ONE CUP", cx, 1760);

  const by = 1858;
  if (instant.size) {
    g.textAlign = "left";
    g.font = `600 46px ${f.display}`;
    g.fillText(`NET WT. ${instant.size}`, 196, by);
  }
  g.textAlign = "center";
  g.lineWidth = 4;
  g.beginPath();
  g.arc(cx, by, 38, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 11 : 25;
    g.lineTo(cx + Math.cos(a) * rr, by + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
  if (!foil) vegMark(g, W - 196 - 64, by - 32, 64);
}

function wrap(g: G, text: string, x: number, y: number, maxW: number, lh: number) {
  let line = "";
  for (const w of text.split(" ")) {
    const t = line ? `${line} ${w}` : w;
    if (g.measureText(t).width > maxW && line) {
      g.fillText(line, x, y);
      y += lh;
      line = w;
    } else line = t;
  }
  if (line) g.fillText(line, x, y);
  return y + lh;
}

function drawBack(g: G, ink: Ink, f: Fonts, flavour: InstantFlavour) {
  const { instant } = site;
  const foil = ink.foil, cx = W / 2, cream = "#eadfc6";
  stock(g, foil);
  frame(g, ink);
  crest(g, cx, 200, 0.82, f);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.save();
  g.translate(cx, 392);
  g.scale(0.72, 1);
  g.font = `700 132px ${f.display}`;
  g.fillText(site.brand.name.toUpperCase(), 0, 0);
  g.restore();
  g.font = `600 46px ${f.display}`;
  g.fillText(`${flavour.name}  ·  ${instant.name} coffee`.toUpperCase() + (instant.size ? `  ·  ${instant.size}` : ""), cx, 474, W - 340);
  diamondRule(g, 534, W / 2 - 200);

  const L = 170, R = W - 170;
  const heading = (t: string, y: number) => {
    g.fillStyle = ink.gold;
    g.textAlign = "left";
    g.font = `600 44px ${f.hud}`;
    g.fillText(t.split("").join(String.fromCharCode(8202)), L, y);
  };

  // how to make it: a 2 × 2 grid of numbered steps
  heading("HOW TO MAKE IT", 640);
  const colW = (R - L) / 2;
  instant.howTo.forEach((s, i) => {
    const x = L + (i % 2) * colW, y = 760 + Math.floor(i / 2) * 250;
    g.fillStyle = ink.gold;
    g.textAlign = "left";
    g.font = `700 104px ${f.display}`;
    g.fillText(String(i + 1).padStart(2, "0"), x, y);
    if (!foil) {
      g.fillStyle = cream;
      g.font = `500 52px ${f.hud}`;
      wrap(g, s, x + 148, y - 4, colW - 180, 54);
    }
  });
  g.strokeStyle = ink.gold;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(L + colW - 20, 690);
  g.lineTo(L + colW - 20, 1080);
  g.moveTo(L, 885);
  g.lineTo(R, 885);
  g.stroke();

  heading("STORAGE", 1200);
  if (!foil) {
    g.fillStyle = cream;
    g.font = `500 46px ${f.hud}`;
    wrap(g, "Store in a cool, dry place. Use a dry spoon and seal the zip after every use.", L, 1264, R - L, 54);
  }

  diamondRule(g, 1430, W / 2 - 260);
  g.fillStyle = ink.gold;
  g.textAlign = "center";
  g.font = `italic 600 64px ${f.display}`;
  g.fillText(site.brand.tagline, cx, 1560);
  g.font = `600 38px ${f.hud}`;
  g.fillText(`@${site.contact.instagram}  ·  ${site.contact.city.toUpperCase()}`, cx, 1650);
  if (!foil) vegMark(g, L, 1790, 64);
}

function make(draw: (g: G, ink: Ink, f: Fonts, fl: InstantFlavour) => void, f: Fonts, flavour: InstantFlavour) {
  const [cc, cg] = canvas(W, H);
  const gold = cg.createLinearGradient(0, 0, W, H * 0.6);
  ["#7a5a26", "#e9cf8e", "#a37c3a", "#fff0c2", "#b48c45", "#f2d894", "#7f5f2a"].forEach((c, i, a) => gold.addColorStop(i / (a.length - 1), c));
  draw(cg, { gold, foil: false }, f, flavour);
  const [mc, mg] = canvas(W, H);
  mg.fillStyle = "#000";
  mg.fillRect(0, 0, W, H);
  draw(mg, { gold: "#fff", foil: true }, f, flavour);
  return { color: cc, foil: mc };
}

export type PouchLabel = ReturnType<typeof make>;

export async function pouchLabels(flavour: InstantFlavour = site.instant.flavours[0]) {
  const css = getComputedStyle(document.documentElement);
  const fonts: Fonts = {
    display: css.getPropertyValue("--font-display").trim() || "serif",
    hud: css.getPropertyValue("--font-hud").trim() || "sans-serif",
  };
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 800))]);
  return { front: make(drawFront, fonts, flavour), back: make(drawBack, fonts, flavour) };
}
