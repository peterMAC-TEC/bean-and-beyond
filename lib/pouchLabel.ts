/**
 * The instant coffee pouch label, painted on canvases for the 3D pouch (components/Instant.tsx).
 * Same artwork as the print files in brand/instant-pouch/ (that page also carries the statutory
 * back panel; the website's back shows the how-to instead of blank MRP / licence fields).
 * Each side is drawn twice: in colour, and as a white-on-black foil mask that becomes polished metal.
 */
import { site } from "@/content/site";
import { engravedBean } from "./engraving";

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
    // one hero bean, engraved (lib/engraving.ts)
    engravedBean(g, cx, oy, 218, -1.05, { rx: rx - 4, ry: ry - 4 });
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
