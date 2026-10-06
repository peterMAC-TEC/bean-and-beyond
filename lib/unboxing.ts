/**
 * The 3D Diwali hamper unboxing (the /unbox page), ported from the prototype in
 * bean-beyond-3d/unboxing-standalone.html (three r128) to this site's three r186.
 *
 * Porting notes: r155+ lights are physically based, so every intensity is the prototype's × π and point
 * lights use decay 1 (the old falloff) to keep the same look; colour space uses outputColorSpace /
 * texture.colorSpace. Canvas-drawn labels use the site's display font.
 *
 * Scene state: closed → opening → open (items float out; tap one to bring it forward) → closing → closed.
 * The React overlay (components/Unboxing3D.tsx) drives it through the returned API and listens via onChange.
 */
import * as THREE from "three";
import { UNBOX_BOXES, UNBOX_IMAGES as A, UNBOX_ITEMS as ITEMS } from "@/content/unboxing";

export type UnboxPhase = "closed" | "opening" | "open" | "closing";
export interface UnboxView {
  phase: UnboxPhase;
  box: number;
  focused: number | null;
}
export interface UnboxApi {
  loadBox(i: number): void;
  open(): void;
  close(): void;
  focus(k: number): void;
  unfocus(): void;
  dispose(): void;
}

const PI = Math.PI;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const ease = {
  io: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  back: (t: number) => {
    const c1 = 1.5, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

export function createUnboxing(canvas: HTMLCanvasElement, onChange: (v: UnboxView) => void, opts: { reduced?: boolean } = {}): UnboxApi {
  const REDUCE = !!opts.reduced;
  const fontVar = getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim() || "Georgia, serif";

  /* ── renderer ── */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x0b0907);
  const scene = new THREE.Scene();
  const fog = new THREE.Fog(0x0b0907, 11, 24);
  scene.fog = fog;
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);

  scene.add(new THREE.HemisphereLight(0xfff0dc, 0x1a1310, 0.45 * PI));
  const sun = new THREE.DirectionalLight(0xffe0b5, 1.05 * PI);
  sun.position.set(3.5, 7, 4.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 20 });
  sun.shadow.bias = -0.0008;
  scene.add(sun);
  const rim = new THREE.PointLight(0xffa64d, 0.7 * PI, 14, 1);
  rim.position.set(-4, 2.5, 2);
  scene.add(rim);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshStandardMaterial({ color: 0x120e0b, roughness: 0.95 }));
  floor.rotation.x = -PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  // one flame light for the scene, always present (a light appearing mid-animation recompiles every material)
  const flameLight = new THREE.PointLight(0xff9a3c, 0, 2.4, 1);
  scene.add(flameLight);

  /* ── helpers ── */
  const loader = new THREE.TextureLoader();
  const texCache: Record<string, THREE.Texture> = {};
  const photoTex = (key: string) => {
    if (texCache[key]) return texCache[key];
    const t = loader.load(A[key].src);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return (texCache[key] = t);
  };
  const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) => {
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    draw(cv.getContext("2d")!, w, h);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  const speckle = (base: string, dot: string, rep: [number, number] = [4, 2]) => {
    const t = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 1500; i++) {
        g.globalAlpha = rnd(0.15, 0.7);
        g.fillStyle = dot;
        g.beginPath();
        g.arc(rnd(0, w), rnd(0, h), rnd(0.3, 1.4), 0, 7);
        g.fill();
      }
      g.globalAlpha = 1;
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...rep);
    return t;
  };
  // rice husk: a matte colour with fine flecks of husk fibre through it
  const husk = (base: string) => {
    const t = canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) {
        const dark = Math.random() < 0.3;
        g.strokeStyle = dark ? `rgba(58,52,40,${rnd(0.18, 0.4)})` : `rgba(238,226,196,${rnd(0.22, 0.55)})`;
        g.lineWidth = rnd(0.8, 1.6);
        const x = rnd(0, w), y = rnd(0, h), a = rnd(0, 6.28), l = rnd(1.5, 5);
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
        g.stroke();
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(5, 2);
    return t;
  };
  let glowT: THREE.Texture | null = null;
  const glowTex = () =>
    (glowT ??= canvasTex(128, 128, (g, w) => {
      const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      r.addColorStop(0, "rgba(255,200,120,1)");
      r.addColorStop(0.4, "rgba(255,150,60,.35)");
      r.addColorStop(1, "rgba(255,120,40,0)");
      g.fillStyle = r;
      g.fillRect(0, 0, w, w);
    }));
  const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o);
  const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[]) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };
  const lathe = (pts: number[][], segs = 56) => new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), segs);
  const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number) => {
    o.position.set(x, y, z);
    return o;
  };

  /* ── item models (the prototype's) ── */
  const buildKulhad = (color: string) => {
    const g = lathe([[0, 0], [0.29, 0], [0.31, 0.03], [0.42, 0.74], [0.43, 0.76], [0.4, 0.76], [0.3, 0.08], [0, 0.08]]);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      if (Math.hypot(x, z) < 0.05 || y > 0.6) continue;
      const k = 1 + 0.045 * Math.cos(Math.atan2(z, x) * 14) * (1 - y / 0.6);
      p.setX(i, x * k);
      p.setZ(i, z * k);
    }
    g.computeVertexNormals();
    const grp = new THREE.Group();
    grp.add(mesh(g, std({ map: husk(color), roughness: 0.95, side: THREE.DoubleSide })));
    return grp;
  };
  const buildMug = ({ color, dot, lid = false, text = null }: { color: string; dot: string; lid?: boolean; text?: string[] | null }) => {
    const grp = new THREE.Group();
    const mat = std({ map: speckle(color, dot), roughness: 0.85, side: THREE.DoubleSide });
    grp.add(mesh(lathe([[0, 0], [0.31, 0], [0.34, 0.03], [0.38, 0.84], [0.385, 0.86], [0.36, 0.86], [0.33, 0.08], [0, 0.08]]), mat));
    const h = mesh(new THREE.TorusGeometry(0.21, 0.055, 14, 32, PI), mat);
    h.rotation.z = -PI / 2;
    h.scale.set(1, 1.15, 1);
    grp.add(at(h, 0.36, 0.45, 0));
    if (lid) {
      grp.add(at(mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 48), mat), 0, 0.885, 0));
      const ring = mesh(new THREE.TorusGeometry(0.26, 0.018, 8, 48), mat);
      ring.rotation.x = PI / 2;
      grp.add(at(ring, 0, 0.912, 0));
    }
    if (text) {
      const tt = canvasTex(512, 256, (g, w) => {
        g.fillStyle = "#d9b45f";
        g.textAlign = "center";
        g.font = `italic 600 52px ${fontVar}`;
        text.forEach((l, i) => g.fillText(l, w / 2, 82 + i * 62));
      });
      const d = new THREE.Mesh(new THREE.CylinderGeometry(0.379, 0.357, 0.42, 40, 1, true, -0.75, 1.5), std({ map: tt, transparent: true, roughness: 0.35, metalness: 0.5, depthWrite: false }));
      grp.add(at(d, 0, 0.5, 0));
    }
    return grp;
  };
  // Borosil insulated travel mug: matte charcoal, a slight flare, a flip lid with a front push latch
  const buildTravel = () => {
    const grp = new THREE.Group();
    const body = std({ color: 0x232427, roughness: 0.55, metalness: 0.25 });
    const cap = std({ color: 0x2b2d31, roughness: 0.5, metalness: 0.2 });
    const dark = std({ color: 0x141517, roughness: 0.6 });
    grp.add(mesh(lathe([[0, 0], [0.28, 0], [0.3, 0.02], [0.33, 0.92], [0, 0.92]]), body));
    grp.add(at(mesh(new THREE.CylinderGeometry(0.336, 0.333, 0.02, 48), dark), 0, 0.93, 0)); // seam
    grp.add(at(mesh(new THREE.CylinderGeometry(0.34, 0.336, 0.24, 48), cap), 0, 1.06, 0));
    grp.add(at(mesh(new THREE.CylinderGeometry(0.325, 0.34, 0.05, 48), cap), 0, 1.205, 0));
    // the push latch on the front, and the hinge at the back
    grp.add(at(mesh(new THREE.BoxGeometry(0.16, 0.17, 0.07), cap), 0, 1.07, 0.34));
    grp.add(at(mesh(new THREE.BoxGeometry(0.1, 0.05, 0.02), dark), 0, 1.04, 0.38));
    grp.add(at(mesh(new THREE.BoxGeometry(0.2, 0.06, 0.06), dark), 0, 1.2, -0.33));
    return grp;
  };
  // a printed ml scale on the glass (plain numbers, no brand marks)
  let scaleT: THREE.Texture | null = null;
  const scaleTex = () =>
    (scaleT ??= canvasTex(512, 512, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = "rgba(255,255,255,.9)";
      g.font = "600 34px Arial, sans-serif";
      const marks: [string, number][] = [["200 ml", 0.78], ["300 ml", 0.6], ["400 ml", 0.42], ["500 ml", 0.24], ["600 ml", 0.08]];
      for (const [t, y] of marks) {
        g.fillText(t, w * 0.32, h * y);
        g.fillRect(w * 0.32, h * y + 8, 120, 3);
      }
    }));
  const pressGlass = () => new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
  /** carafe, coffee, crema, spout, lid and plunger: shared by both AGARO presses */
  const pressCore = (grp: THREE.Group, knob: "disc" | "ball") => {
    const black = std({ color: 0x151515, roughness: 0.45, metalness: 0.35 });
    const steel = std({ color: 0xbfc2c6, roughness: 0.25, metalness: 0.9 });
    const g = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 1, 48, 1, true), pressGlass());
    g.renderOrder = 2;
    grp.add(at(g, 0, 0.6, 0));
    const marks = new THREE.Mesh(new THREE.CylinderGeometry(0.333, 0.333, 0.9, 40, 1, true, -0.7, 1.4), std({ map: scaleTex(), transparent: true, roughness: 0.4, depthWrite: false }));
    grp.add(at(marks, 0, 0.6, 0));
    grp.add(at(mesh(new THREE.CylinderGeometry(0.315, 0.315, 0.56, 48), std({ color: 0x1f0f06, roughness: 0.2 })), 0, 0.38, 0));
    grp.add(at(mesh(new THREE.CylinderGeometry(0.315, 0.315, 0.05, 48), std({ color: 0xb98a55, roughness: 0.7 })), 0, 0.685, 0));
    const spout = mesh(new THREE.ConeGeometry(0.07, 0.1, 16, 1, true), pressGlass());
    spout.rotation.z = Math.PI / 2 + 0.5;
    grp.add(at(spout, -0.36, 1.06, 0));
    grp.add(at(mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.07, 48), black), 0, 1.13, 0)); // lid
    grp.add(at(mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.06, 48), black), 0, 1.19, 0));
    grp.add(at(mesh(new THREE.CylinderGeometry(0.315, 0.315, 0.02, 48), steel), 0, 0.84, 0)); // filter plate
    grp.add(at(mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 12), steel), 0, 1.42, 0));
    if (knob === "disc") {
      grp.add(at(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.1, 16), black), 0, 1.62, 0));
      grp.add(at(mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.04, 32), black), 0, 1.68, 0));
    } else grp.add(at(mesh(new THREE.SphereGeometry(0.1, 32, 20), black), 0, 1.68, 0));
    return black;
  };
  // AGARO classic: tall black base, a band at mid height, front struts and a D handle
  const buildPress = () => {
    const grp = new THREE.Group();
    const black = pressCore(grp, "disc");
    grp.add(at(mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.26, 48), black), 0, 0.13, 0));
    grp.add(at(mesh(new THREE.CylinderGeometry(0.345, 0.345, 0.1, 48), black), 0, 0.72, 0));
    for (const a of [PI / 2 - 0.35, PI / 2 + 0.35, -PI / 2]) {
      const bar = mesh(new THREE.BoxGeometry(0.07, 0.48, 0.03), black);
      bar.position.set(Math.cos(a) * 0.345, 0.47, Math.sin(a) * 0.345);
      bar.rotation.y = -a + PI / 2;
      grp.add(bar);
    }
    grp.add(at(mesh(new THREE.BoxGeometry(0.075, 0.62, 0.08), black), 0.66, 0.45, 0));
    grp.add(at(mesh(new THREE.BoxGeometry(0.32, 0.075, 0.08), black), 0.52, 0.73, 0));
    grp.add(at(mesh(new THREE.BoxGeometry(0.32, 0.075, 0.08), black), 0.52, 0.17, 0));
    return grp;
  };
  // AGARO ball-knob: a black sleeve over most of the carafe, with oval windows onto the coffee
  let sleeveT: THREE.Texture | null = null;
  const sleeveAlpha = () =>
    (sleeveT ??= canvasTex(512, 256, (g, w, h) => {
      g.fillStyle = "#fff";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#000";
      for (const cx of [0.25, 0.75]) {
        g.beginPath();
        g.ellipse(w * cx, h * 0.52, w * 0.085, h * 0.36, 0, 0, PI * 2);
        g.fill();
      }
    }));
  const buildPressKnob = () => {
    const grp = new THREE.Group();
    const black = pressCore(grp, "ball");
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.36, 0.86, 48, 1, true), std({ color: 0x151515, roughness: 0.5, metalness: 0.3, alphaMap: sleeveAlpha(), alphaTest: 0.5, side: THREE.DoubleSide }));
    sleeve.castShadow = true;
    grp.add(at(sleeve, 0, 0.45, 0));
    grp.add(at(mesh(new THREE.CylinderGeometry(0.365, 0.37, 0.05, 48), black), 0, 0.025, 0));
    // a rounded loop handle
    const h = mesh(new THREE.TorusGeometry(0.24, 0.045, 12, 32, PI), black);
    h.rotation.z = -PI / 2;
    h.scale.set(1, 1.2, 1);
    grp.add(at(h, 0.36, 0.55, 0));
    return grp;
  };
  const buildJar = () => {
    const grp = new THREE.Group();
    const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false });
    const g = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.58, 40, 1, true), glass);
    g.renderOrder = 2;
    grp.add(at(g, 0, 0.29, 0));
    grp.add(at(mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.1, 40), std({ color: 0xc9a24a, metalness: 0.85, roughness: 0.3 })), 0, 0.63, 0));
    const inst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.055, 10, 8), std({ roughness: 0.6 }), 80);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
    const cols = ["#c58b4f", "#a5683a", "#e2c08a", "#8a5229", "#d7a76a"];
    for (let i = 0; i < 80; i++) {
      const r = Math.sqrt(Math.random()) * 0.24, a = rnd(0, 6.28);
      q.setFromEuler(e.set(rnd(0, 3), rnd(0, 3), rnd(0, 3)));
      m4.compose(new THREE.Vector3(Math.cos(a) * r, rnd(0.06, 0.5), Math.sin(a) * r), q, new THREE.Vector3(1.4, 0.8, 0.9));
      inst.setMatrixAt(i, m4);
      inst.setColorAt(i, c.set(cols[i % cols.length]));
    }
    inst.castShadow = true;
    grp.add(inst);
    const lbl = canvasTex(256, 160, (g2, w, h) => {
      g2.fillStyle = "#16120f";
      g2.fillRect(0, 0, w, h);
      g2.strokeStyle = "#c9a24a";
      g2.lineWidth = 3;
      g2.strokeRect(8, 8, w - 16, h - 16);
      g2.fillStyle = "#d9b45f";
      g2.textAlign = "center";
      g2.font = `600 28px ${fontVar}`;
      g2.fillText("Roasted Nuts", w / 2, 92);
    });
    grp.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.302, 0.302, 0.17, 32, 1, true, -0.55, 1.1), std({ map: lbl, roughness: 0.6 })), 0, 0.3, 0));
    return grp;
  };
  // a kraft stand-up pouch: puffed in the middle, flat at the side seams and the heat-sealed top, wider at the gusset
  const buildPouch = (tex: string) => {
    const grp = new THREE.Group();
    const h = 1.05, w = h * A[tex].ar, d = 0.22;
    const geo = new THREE.BoxGeometry(w, h, d, 16, 28, 1);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) / (w / 2), v = (p.getY(i) + h / 2) / h;
      const seam = 1 - Math.pow(Math.min(1, Math.abs(u)), 4);
      const top = v > 0.9 ? 0.08 : v > 0.78 ? 0.08 + ((0.9 - v) / 0.12) * 0.92 : 1;
      const gusset = v < 0.1 ? 1.2 : 1;
      p.setZ(i, p.getZ(i) * Math.max(0.06, seam * top) * gusset);
      p.setX(i, p.getX(i) * (1 + (v < 0.1 ? 0.03 : 0)));
    }
    geo.computeVertexNormals();
    const kraft = std({ color: 0xb48a5c, roughness: 0.9 });
    const front = std({ map: photoTex(tex), roughness: 0.78 });
    grp.add(at(mesh(geo, [kraft, kraft, kraft, kraft, front, kraft]), 0, h / 2, 0));
    return grp;
  };
  const buildFlat = (tex: string, h: number, d: number, side: number) => {
    const grp = new THREE.Group();
    const w = h * A[tex].ar;
    const s = std({ color: side, roughness: 0.8 });
    const f = std({ map: photoTex(tex), roughness: 0.7 });
    const b = mesh(new THREE.BoxGeometry(w, h, d), [s, s, s, s, f, s]);
    b.rotation.x = -0.12;
    grp.add(at(b, 0, h / 2, 0));
    return grp;
  };
  const flames: { flame: THREE.Group; seed: number }[] = [];
  const buildDiya = () => {
    const grp = new THREE.Group();
    const g = lathe([[0, 0], [0.14, 0], [0.28, 0.07], [0.36, 0.17], [0.345, 0.19], [0.27, 0.11], [0.12, 0.07], [0, 0.07]], 72);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = p.getY(i);
      const k = 1 + 0.55 * Math.pow(Math.max(0, Math.cos(Math.atan2(z, x))), 6);
      p.setX(i, x * k * 1.15);
      p.setY(i, y + 0.05 * (k - 1) * (y / 0.19));
    }
    g.computeVertexNormals();
    const tex = canvasTex(512, 256, (c, w, h) => {
      c.fillStyle = "#8f2219";
      c.fillRect(0, 0, w, h);
      c.fillStyle = "#d4a548";
      c.fillRect(0, h * 0.43, w, h * 0.05);
      c.fillRect(0, h * 0.53, w, h * 0.04);
      for (let i = 0; i < 16; i++) {
        const x = ((i + 0.5) * w) / 16;
        c.beginPath(); c.ellipse(x, h * 0.22, 7, 20, 0, 0, 7); c.fill();
        c.beginPath(); c.arc(x, h * 0.75, 4, 0, 7); c.fill();
        c.beginPath(); c.arc(x + w / 32, h * 0.66, 2.5, 0, 7); c.fill();
      }
    });
    grp.add(mesh(g, std({ map: tex, roughness: 0.7, side: THREE.DoubleSide })));
    grp.add(at(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.07, 8), std({ color: 0x2b1a10 })), 0.6, 0.21, 0));
    const flame = new THREE.Group();
    const outer = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffa53a }));
    outer.scale.set(1, 2.3, 1);
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 10), new THREE.MeshBasicMaterial({ color: 0xfff2c2 }));
    inner.scale.set(1, 2, 1);
    inner.position.y = -0.02;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xffa040, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.set(0.55, 0.55, 1);
    flame.add(outer, inner, glow);
    grp.add(at(flame, 0.6, 0.32, 0));
    flames.push({ flame, seed: Math.random() * 10 });
    return grp;
  };
  const BUILD: Record<string, () => THREE.Group> = {
    kulhadTeal: () => buildKulhad("#6f9aa0"),
    kulhadLav: () => buildKulhad("#82709a"),
    coffeeArtisan: () => buildPouch("t_pouchArtisan"),
    diya: buildDiya,
    card700: () => buildFlat("t_card700", 0.62, 0.015, 0xefe6d6),
    mugCharcoal: () => buildMug({ color: "#3b3631", dot: "#b9ab98", lid: true }),
    mugCream: () => buildMug({ color: "#e3d9c8", dot: "#7d6f5e", lid: true }),
    coffeeFestive: () => buildPouch("t_pouchFestive"),
    choc: () => buildFlat("t_choc", 0.8, 0.1, 0x4a1d24),
    card800: () => buildFlat("t_card800", 0.62, 0.015, 0xefe6d6),
    press: buildPress,
    pressKnob: buildPressKnob,
    mugBlack: () => buildMug({ color: "#151413", dot: "#3a3530", text: ["Brew", "something", "bright"] }),
    pouchPremium: () => buildPouch("t_pouchPremium"),
    mithai: () => buildFlat("t_mithai", 1, 0.12, 0xe9d9b6),
    nuts: buildJar,
    guide: () => buildFlat("t_guide", 0.8, 0.02, 0xefe6d6),
    travel: buildTravel,
    mugRed: () => buildMug({ color: "#8e2a26", dot: "#e0a49a" }),
  };
  const makeItem = (key: string) => {
    const raw = BUILD[key]();
    const bb = new THREE.Box3().setFromObject(raw);
    const size = bb.getSize(new THREE.Vector3()), center = bb.getCenter(new THREE.Vector3());
    const s = ITEMS[key].size / Math.max(size.x, size.y, size.z);
    raw.scale.setScalar(s);
    raw.position.copy(center).multiplyScalar(-s);
    const pivot = new THREE.Group();
    pivot.add(raw);
    pivot.userData = { key };
    return pivot;
  };

  /* ── gift box ── */
  const buildGiftBox = (style: string, W: number, D: number, H: number) => {
    const noir = style === "noir";
    const surf = canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = noir ? "#171514" : "#9c7347";
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) {
        g.strokeStyle = noir ? `rgba(255,255,255,${rnd(0.01, 0.035)})` : Math.random() < 0.5 ? `rgba(90,60,30,${rnd(0.05, 0.14)})` : `rgba(240,210,160,${rnd(0.05, 0.12)})`;
        g.lineWidth = rnd(0.5, 1.4);
        const x = rnd(0, w), y = rnd(0, h), a = rnd(0, 6.28), l = rnd(3, 14);
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
      }
    });
    const mat = std({ map: surf, roughness: noir ? 0.5 : 0.92, metalness: noir ? 0.15 : 0 });
    const ribbonMat = noir ? std({ color: 0xc9a24a, metalness: 0.65, roughness: 0.32 }) : std({ color: 0x4a0d18, roughness: 0.45, metalness: 0.1 });
    const t = 0.06;
    const root = new THREE.Group(), base = new THREE.Group();
    base.add(at(mesh(new THREE.BoxGeometry(W, t, D), mat), 0, t / 2, 0));
    base.add(at(mesh(new THREE.BoxGeometry(W, H, t), mat), 0, H / 2, D / 2 - t / 2));
    base.add(at(mesh(new THREE.BoxGeometry(W, H, t), mat), 0, H / 2, -D / 2 + t / 2));
    base.add(at(mesh(new THREE.BoxGeometry(t, H, D), mat), W / 2 - t / 2, H / 2, 0));
    base.add(at(mesh(new THREE.BoxGeometry(t, H, D), mat), -W / 2 + t / 2, H / 2, 0));
    const shred = canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = "#4a2f18";
      g.fillRect(0, 0, w, h);
      const cols = ["#8a5a2e", "#a56f3a", "#6e4522", "#c08a4e", "#94653a"];
      for (let i = 0; i < 1100; i++) {
        g.strokeStyle = cols[i % cols.length];
        g.lineWidth = rnd(2, 3.5);
        let x = rnd(-10, w), y = rnd(-10, h);
        const a = rnd(0, 6.28);
        g.beginPath(); g.moveTo(x, y);
        for (let s = 0; s < 7; s++) {
          x += Math.cos(a) * 6 + (s % 2 ? 4 : -4) * Math.sin(a);
          y += Math.sin(a) * 6 + (s % 2 ? -4 : 4) * Math.cos(a);
          g.lineTo(x, y);
        }
        g.stroke();
      }
    });
    shred.wrapS = shred.wrapT = THREE.RepeatWrapping;
    shred.repeat.set(2, 1.5);
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(W - 2 * t, D - 2 * t), std({ map: shred, bumpMap: shred, bumpScale: 0.04, roughness: 1 }));
    paper.rotation.x = -PI / 2;
    paper.position.y = H * 0.35;
    paper.receiveShadow = true;
    base.add(paper);
    root.add(base);

    const lid = new THREE.Group();
    lid.position.y = H;
    const LW = W + 0.1, LD = D + 0.1, sk = 0.32;
    lid.add(at(mesh(new THREE.BoxGeometry(LW, 0.06, LD), mat), 0, 0.03, 0));
    lid.add(at(mesh(new THREE.BoxGeometry(LW, sk, 0.05), mat), 0, 0.06 - sk / 2, LD / 2 - 0.025));
    lid.add(at(mesh(new THREE.BoxGeometry(LW, sk, 0.05), mat), 0, 0.06 - sk / 2, -LD / 2 + 0.025));
    lid.add(at(mesh(new THREE.BoxGeometry(0.05, sk, LD), mat), LW / 2 - 0.025, 0.06 - sk / 2, 0));
    lid.add(at(mesh(new THREE.BoxGeometry(0.05, sk, LD), mat), -LW / 2 + 0.025, 0.06 - sk / 2, 0));

    const ribbon = new THREE.Group();
    const rw = 0.24;
    ribbon.add(at(mesh(new THREE.BoxGeometry(LW + 0.02, 0.014, rw), ribbonMat), 0, 0.067, 0));
    ribbon.add(at(mesh(new THREE.BoxGeometry(rw, 0.016, LD + 0.02), ribbonMat), 0, 0.068, 0));
    for (const s of [1, -1]) {
      ribbon.add(at(mesh(new THREE.BoxGeometry(rw, sk + 0.02, 0.012), ribbonMat), 0, 0.06 - sk / 2, s * (LD / 2 + 0.006)));
      ribbon.add(at(mesh(new THREE.BoxGeometry(0.012, sk + 0.02, rw), ribbonMat), s * (LW / 2 + 0.006), 0.06 - sk / 2, 0));
      const loop = mesh(new THREE.TorusGeometry(0.2, 0.045, 10, 32), ribbonMat);
      loop.scale.set(1.15, 0.62, 1);
      loop.rotation.set(0, s * 0.55, s * 0.35);
      ribbon.add(at(loop, s * 0.2, 0.2, 0));
      const tail = mesh(new THREE.BoxGeometry(0.13, 0.012, 0.5), ribbonMat);
      tail.rotation.y = s * 0.45;
      ribbon.add(at(tail, s * 0.12, 0.085, 0.3));
    }
    const knot = mesh(new THREE.SphereGeometry(0.08, 16, 12), ribbonMat);
    knot.scale.set(1.2, 0.8, 1);
    ribbon.add(at(knot, 0, 0.14, 0));
    const tagTex = canvasTex(256, 384, (g, w, h) => {
      g.fillStyle = noir ? "#121010" : "#5e1a25";
      g.fillRect(0, 0, w, h);
      g.strokeStyle = "#c9a24a";
      g.lineWidth = 3;
      g.strokeRect(14, 14, w - 28, h - 28);
      g.fillStyle = "#e6c77a";
      g.textAlign = "center";
      g.font = `italic 500 52px ${fontVar}`;
      g.fillText("Happy", w / 2, 168);
      g.fillText("Diwali", w / 2, 232);
      g.beginPath(); g.ellipse(w / 2, 300, 22, 10, 0, 0, PI); g.fill();
      g.beginPath(); g.ellipse(w / 2, 280, 6, 14, 0, 0, 7); g.fill();
    });
    const tagSide = std({ color: noir ? 0x121010 : 0x5e1a25 });
    const tag = mesh(new THREE.BoxGeometry(0.34, 0.008, 0.51), [tagSide, tagSide, std({ map: tagTex, roughness: 0.7 }), tagSide, tagSide, tagSide]);
    tag.rotation.y = -0.35;
    tag.position.set(0.62, 0.08, 0.45);
    ribbon.add(tag);
    lid.add(ribbon);
    root.add(lid);

    const glow = new THREE.PointLight(0xffc77a, 0, 5, 1);
    glow.position.set(0, H * 0.8, 0);
    root.add(glow);
    return { root, base, lid, ribbon, glow, H, W, D };
  };

  /* ── sparks ── */
  const PCOUNT = 90;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(PCOUNT * 3);
  const pVel: number[][] = [];
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({ map: glowTex(), color: 0xffd27a, size: 0.16, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  scene.add(new THREE.Points(pGeo, pMat));
  const burst = (H: number) => {
    for (let i = 0; i < PCOUNT; i++) {
      pPos.set([rnd(-1, 1), H * 0.7, rnd(-0.7, 0.7)], i * 3);
      pVel[i] = [rnd(-0.6, 0.6), rnd(1.2, 3), rnd(-0.6, 0.6)];
    }
    pGeo.attributes.position.needsUpdate = true;
    pMat.opacity = 1;
  };

  /* ── tweens ── */
  type Tw = { t0: number; dur: number; fn: (k: number) => void; e: (k: number) => number; res: () => void };
  const tweens: Tw[] = [];
  let now = 0;
  const tween = (dur: number, delay: number, fn: (k: number) => void, e = ease.io) => {
    if (REDUCE) {
      dur = 0.01;
      delay = 0;
    }
    return new Promise<void>((res) => tweens.push({ t0: now + delay, dur, fn, e, res }));
  };
  const runTweens = () => {
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i], k = (now - tw.t0) / tw.dur;
      if (k < 0) continue;
      const c = Math.min(1, k);
      tw.fn(tw.e(c));
      if (c >= 1) {
        tweens.splice(i, 1);
        tw.res();
      }
    }
  };

  /* ── state ── */
  type BoxState = { box: ReturnType<typeof buildGiftBox>; items: THREE.Group[]; index: number };
  let S: BoxState | null = null;
  let phase: UnboxPhase = "closed";
  let focused: THREE.Group | null = null;
  const view = { yaw: 0, pitch: 0.42, dist: 9, target: new THREE.Vector3(0, 0.5, 0), wantDist: 9, wantTarget: new THREE.Vector3(0, 0.5, 0) };
  const emit = () => S && onChange({ phase, box: S.index, focused: focused ? S.items.indexOf(focused) : null });

  const disposeObj = (obj: THREE.Object3D) =>
    obj.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
  /** one arc on wide screens; rows of three on phones, so nothing has to shrink into the fog */
  const narrowView = () => canvas.clientWidth / Math.max(1, canvas.clientHeight) < 0.9;
  const slots = (n: number, H: number) => {
    let rows: number[];
    if (narrowView()) {
      rows = [];
      for (let left = n; left > 0; left -= 3) rows.push(Math.min(3, left));
    } else rows = n > 7 ? [Math.ceil(n / 2), Math.floor(n / 2)] : [n];
    const out: THREE.Vector3[] = [];
    rows.forEach((cnt, r) => {
      const spread = Math.min(cnt - 1, 6) * 1.05;
      for (let i = 0; i < cnt; i++) {
        const t = cnt === 1 ? 0 : (i / (cnt - 1)) * 2 - 1;
        out.push(new THREE.Vector3((t * spread) / 2, H + 0.85 + r * 1.2, 1.0 - 0.75 * t * t - r * 1.1));
      }
    });
    return out;
  };
  const frame = () => {
    if (!S) return;
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    const vt = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), ht = vt * aspect;
    let halfW: number, halfH: number, ty: number;
    if (phase === "closed" || phase === "closing") {
      halfW = S.box.W / 2 + 0.5;
      halfH = 1.4;
      ty = 0.5;
    } else {
      const xs = S.items.map((p) => Math.abs((p.userData.slot as THREE.Vector3).x));
      halfW = Math.max(S.box.W / 2, ...xs) + 0.75;
      const rows = new Set(S.items.map((p) => (p.userData.slot as THREE.Vector3).y)).size;
      halfH = 2 + (rows - 1) * 0.6;
      ty = 1.15 + (rows - 1) * 0.4;
    }
    const narrow = aspect < 0.9;
    view.wantDist = Math.max(halfW / ht, halfH / vt) + (narrow ? 1.2 : 2.2);
    // phones and squarer windows: lift the scene clear of the caption and item chips at the bottom
    const closedNow = phase === "closed" || phase === "closing";
    const lift = narrow ? (closedNow ? 0.25 : 1.1) : aspect < 1.35 ? (closedNow ? 0.35 : 0.85) : 0;
    view.wantTarget.set(0, ty - lift, 0);
    if (!narrow && aspect < 1.35) view.wantDist *= 1.12;
  };

  const loadBox = (i: number) => {
    if (phase === "opening" || phase === "closing") return;
    if (S) {
      scene.remove(S.box.root);
      S.items.forEach((p) => {
        scene.remove(p);
        disposeObj(p);
      });
      disposeObj(S.box.root);
    }
    flames.length = 0;
    const def = UNBOX_BOXES[i];
    const big = def.items.length > 7;
    const noir = def.style === "noir";
    const W = noir ? (big ? 4.2 : 3.6) : 3.3, D = noir ? (big ? 3 : 2.7) : 2.4, H = noir ? 0.9 : 0.8;
    const box = buildGiftBox(def.style, W, D, H);
    scene.add(box.root);
    const items = def.items.map(makeItem);
    const sl = slots(items.length, H);
    items.forEach((p, k) => {
      p.visible = false;
      p.userData.slot = sl[k];
      p.userData.rot = ITEMS[p.userData.key].rot;
      scene.add(p);
    });
    S = { box, items, index: i };
    phase = "closed";
    focused = null;
    view.yaw = 0;
    frame();
    emit();
  };

  const open = async () => {
    if (!S || phase !== "closed") return;
    phase = "opening";
    emit();
    const { box, items } = S, H = box.H;
    const rib = box.ribbon;
    tween(0.55, 0, (t) => {
      rib.scale.setScalar(1 - t * 0.9);
      rib.position.y = t * 0.35;
      rib.rotation.y = t * 0.9;
    }).then(() => (rib.visible = false));
    const L = box.lid, start = L.position.clone();
    const end = new THREE.Vector3(0, 0.62, -box.D / 2 - 0.95);
    await tween(1.15, 0.35, (t) => {
      L.position.lerpVectors(start, end, t);
      L.position.y += Math.sin(t * PI) * 1.3;
      L.rotation.x = -1.2 * t;
    });
    burst(H);
    tween(1.4, 0, (t) => (box.glow.intensity = (Math.sin(t * PI) * 2.6 + t * 0.5) * PI), (x) => x);
    phase = "open";
    frame();
    await Promise.all(
      items.map((p, k) => {
        const from = new THREE.Vector3(rnd(-0.5, 0.5), H * 0.4, rnd(-0.3, 0.3));
        const to = p.userData.slot as THREE.Vector3;
        p.position.copy(from);
        p.scale.setScalar(0.2);
        p.visible = true;
        p.userData.ready = false;
        return tween(0.95, 0.05 + k * 0.17, (t) => {
          p.position.lerpVectors(from, to, t);
          p.scale.setScalar(0.2 + 0.8 * Math.min(1, t));
          p.rotation.y = p.userData.rot - (1 - t) * PI * 1.6;
        }, ease.back).then(() => (p.userData.ready = true));
      }),
    );
    emit();
  };

  const close = async () => {
    if (!S || phase !== "open") return;
    unfocus();
    phase = "closing";
    emit();
    const { box, items } = S, H = box.H;
    await Promise.all(
      items.map((p, k) => {
        const from = p.position.clone(), to = new THREE.Vector3(0, H * 0.4, 0), s0 = p.scale.x;
        p.userData.ready = false;
        return tween(0.55, k * 0.06, (t) => {
          p.position.lerpVectors(from, to, t);
          p.scale.setScalar(s0 * (1 - t * 0.85));
        }).then(() => (p.visible = false));
      }),
    );
    frame();
    const L = box.lid, start = L.position.clone(), end = new THREE.Vector3(0, H, 0), r0 = L.rotation.x;
    await tween(0.9, 0, (t) => {
      L.position.lerpVectors(start, end, t);
      L.position.y += Math.sin(t * PI);
      L.rotation.x = r0 * (1 - t);
    });
    box.glow.intensity = 0;
    const rib = box.ribbon;
    rib.visible = true;
    await tween(0.45, 0, (t) => {
      rib.scale.setScalar(0.1 + 0.9 * t);
      rib.position.y = 0.35 * (1 - t);
      rib.rotation.y = 0.9 * (1 - t);
    }, ease.out);
    phase = "closed";
    emit();
  };

  const focusItem = (p: THREE.Group) => {
    if (phase !== "open" || !p.userData.ready) return;
    focused = p;
    emit();
  };
  const unfocus = () => {
    if (!focused) return;
    focused.userData.spin = 0;
    focused = null;
    emit();
  };
  const focusTarget = (key: string) => {
    const toCam = camera.position.clone().sub(view.target).normalize();
    const fd = view.dist * 0.5, rest = view.dist - fd;
    const vt = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), ht = vt * camera.aspect;
    const right = new THREE.Vector3(Math.cos(view.yaw), 0, -Math.sin(view.yaw));
    const wide = canvas.clientWidth > 720;
    const pos = view.target.clone().add(toCam.multiplyScalar(fd));
    if (wide) pos.add(right.multiplyScalar(-rest * ht * 0.3));
    else pos.y += rest * vt * 0.38;
    return { pos, scale: (rest * vt * (wide ? 0.8 : 0.42)) / ITEMS[key].size };
  };

  /* ── pointer: tap the box to open, tap an item to focus, drag to look around ── */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let drag: { x: number; y: number; moved: number } | null = null;
  const pick = (e: PointerEvent, objs: THREE.Object3D[]) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObjects(objs, true)[0];
  };
  const ownerItem = (o: THREE.Object3D | null) => {
    while (o && !o.userData.key) o = o.parent;
    return o as THREE.Group | null;
  };
  const onDown = (e: PointerEvent) => {
    drag = { x: e.clientX, y: e.clientY, moved: 0 };
    canvas.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      drag.x = e.clientX;
      drag.y = e.clientY;
      if (focused) focused.userData.spin = (focused.userData.spin || 0) + dx * 0.012;
      else {
        view.yaw = THREE.MathUtils.clamp(view.yaw - dx * 0.006, -1.1, 1.1);
        view.pitch = THREE.MathUtils.clamp(view.pitch + dy * 0.004, 0.15, 0.95);
      }
      return;
    }
    if (e.pointerType !== "mouse" || !S) return;
    const targets = phase === "closed" ? [S.box.root] : phase === "open" ? S.items.filter((p) => p.visible) : [];
    document.documentElement.dataset.cursor = targets.length && pick(e, targets) ? "1" : "";
  };
  const onUp = (e: PointerEvent) => {
    const wasClick = drag && drag.moved < 8;
    drag = null;
    if (!wasClick || !S) return;
    if (phase === "closed") {
      if (pick(e, [S.box.root])) void open();
      return;
    }
    if (phase !== "open") return;
    const hit = pick(e, S.items.filter((p) => p.visible));
    const p = hit ? ownerItem(hit.object) : null;
    if (p && p !== focused) focusItem(p);
    else if (!p) unfocus();
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);

  /* ── loop (paused while the tab is hidden) ── */
  const clock = new THREE.Clock();
  const tmp = new THREE.Vector3();
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    if (S) {
      const sl = slots(S.items.length, S.box.H);
      S.items.forEach((p, k) => (p.userData.slot = sl[k]));
    }
    frame();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  let raf = 0;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    if (document.hidden) return;
    const dt = Math.min(0.05, clock.getDelta());
    now += dt;
    runTweens();
    view.dist += (view.wantDist - view.dist) * 0.06;
    view.target.lerp(view.wantTarget, 0.06);
    const cp = Math.cos(view.pitch);
    camera.position.set(view.target.x + Math.sin(view.yaw) * cp * view.dist, view.target.y + Math.sin(view.pitch) * view.dist, view.target.z + Math.cos(view.yaw) * cp * view.dist);
    camera.lookAt(view.target);
    fog.near = view.dist + 2;
    fog.far = view.dist + 15;
    if (S) {
      if (phase === "closed" && !REDUCE) {
        S.box.root.rotation.y = Math.sin(now * 0.5) * 0.06;
        S.box.lid.position.y = S.box.H + Math.max(0, Math.sin(now * 2.2)) * 0.012;
      } else S.box.root.rotation.y *= 0.9;
      S.items.forEach((p, k) => {
        if (!p.visible || !p.userData.ready) return;
        if (p === focused) {
          const f = focusTarget(p.userData.key);
          p.position.lerp(f.pos, 0.12);
          p.scale.setScalar(p.scale.x + (f.scale - p.scale.x) * 0.12);
          p.userData.spin = (p.userData.spin || 0) + (drag ? 0 : dt * 0.6);
          p.rotation.y += (p.userData.rot + p.userData.spin - p.rotation.y) * 0.15;
        } else {
          tmp.copy(p.userData.slot as THREE.Vector3);
          if (!REDUCE) tmp.y += Math.sin(now * 1.3 + k) * 0.045;
          p.position.lerp(tmp, 0.1);
          p.scale.setScalar(p.scale.x + ((focused ? 0.85 : 1) - p.scale.x) * 0.1);
          const want = p.userData.rot + (REDUCE ? 0 : Math.sin(now * 0.45 + k) * 0.28);
          p.rotation.y += (want - p.rotation.y) * 0.08;
        }
      });
    }
    // the visible diya's flame flickers and carries the scene's one flame light
    let lit = false;
    for (const f of flames) {
      let shown = true;
      for (let o: THREE.Object3D | null = f.flame; o && shown; o = o.parent) shown = o.visible;
      const n = Math.sin(now * 11 + f.seed) * 0.5 + Math.sin(now * 17.3 + f.seed * 2) * 0.5;
      f.flame.scale.set(1 - n * 0.06, 1 + n * 0.12, 1);
      if (shown && !lit) {
        lit = true;
        f.flame.getWorldPosition(flameLight.position);
        flameLight.intensity = (0.8 + n * 0.18) * PI;
      }
    }
    if (!lit) flameLight.intensity = 0;
    if (pMat.opacity > 0) {
      for (let i = 0; i < PCOUNT; i++) {
        const v = pVel[i];
        pPos[i * 3] += v[0] * dt;
        pPos[i * 3 + 1] += v[1] * dt;
        pPos[i * 3 + 2] += v[2] * dt;
        v[1] -= dt * 0.9;
      }
      pGeo.attributes.position.needsUpdate = true;
      pMat.opacity = Math.max(0, pMat.opacity - dt * 0.45);
    }
    renderer.render(scene, camera);
  };

  resize();
  loadBox(0);
  view.dist = view.wantDist;
  view.target.copy(view.wantTarget);
  loop();

  return {
    loadBox,
    open: () => void open(),
    close: () => void close(),
    focus: (k) => S && focusItem(S.items[k]),
    unfocus,
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      delete document.documentElement.dataset.cursor;
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        mats.forEach((mt) => {
          (mt as THREE.MeshStandardMaterial).map?.dispose();
          mt.dispose();
        });
      });
      renderer.dispose();
    },
  };
}
