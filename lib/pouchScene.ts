/**
 * The instant coffee pouch in 3D (components/Instant.tsx): a matte black stand-up zip pouch,
 * 14 × 21 cm, wearing the gold-foil label, on a dark bar top with a little pile of granules.
 * Drag to turn it, tap to flip it round. The look matches the mockups in brand/instant-pouch/.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { pouchLabels, labelPath, LABEL_W, LABEL_H, type PouchLabel } from "./pouchLabel";

export type PouchScene = {
  setRunning: (on: boolean) => void;
  /** turn to the back, or back to the front */
  flip: () => void;
  ready: () => boolean;
  dispose: () => void;
};

const PW = 1.4; // 14 cm wide (1 unit = 10 cm)
const PH = 2.1; // 21 cm tall
const FRONT = -0.3; // resting angle, a little turned

const canvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d", { willReadFrequently: true })!] as const;
};
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const vnoise = (x: number, y: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};

// one tile of film grain, reused across both panels (far cheaper than noise per pixel)
let grain: Float32Array | null = null;
const GT = 256;
function grainTile() {
  if (grain) return grain;
  grain = new Float32Array(GT * GT);
  for (let y = 0; y < GT; y++) for (let x = 0; x < GT; x++) grain[y * GT + x] = vnoise(x * 0.35, y * 0.35) * 0.6 + vnoise(x * 1.3, y * 1.3) * 0.4;
  return grain;
}

/** Colour, roughness/metalness and normal maps for one face of the pouch, label included. */
function panelTextures(label: PouchLabel, side: "front" | "back", TX: number) {
  const TY = Math.round(TX * 1.5);
  const k = TX / 1400; // layout below is in 1400-px units (10 px per mm)
  const LBL = { x: 250 * k, y: 500 * k, w: 900 * k, h: 1200 * k };
  const ZIP = 300 * k, NOTCH = 215 * k, SEAL = 120 * k, FIN = 46 * k;

  const [mc, mg] = canvas(TX, TY);
  mg.fillStyle = "#0c0c0e";
  const r = 70 * k;
  mg.beginPath();
  mg.moveTo(0, r);
  mg.quadraticCurveTo(0, 0, r, 0);
  mg.lineTo(TX - r, 0);
  mg.quadraticCurveTo(TX, 0, TX, r);
  mg.lineTo(TX, NOTCH - 14 * k);
  mg.lineTo(TX - 26 * k, NOTCH);
  mg.lineTo(TX, NOTCH + 14 * k);
  mg.lineTo(TX, TY);
  mg.lineTo(0, TY);
  mg.lineTo(0, NOTCH + 14 * k);
  mg.lineTo(26 * k, NOTCH);
  mg.lineTo(0, NOTCH - 14 * k);
  mg.closePath();
  mg.fill();
  mg.fillStyle = "rgba(220,192,138,.22)";
  mg.font = `500 ${18 * k}px monospace`;
  mg.textAlign = side === "front" ? "left" : "right";
  mg.fillText(side === "front" ? "TEAR HERE ›" : "‹ TEAR HERE", side === "front" ? 40 * k : TX - 40 * k, NOTCH + 6 * k);
  mg.drawImage(label.color, LBL.x, LBL.y, LBL.w, LBL.h);
  const map = new THREE.CanvasTexture(mc);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;

  // the sticker's outline, and the foil, at panel scale (blurred copies make the emboss)
  const [pc, pg] = canvas(TX, TY);
  pg.fillStyle = "#000";
  pg.fillRect(0, 0, TX, TY);
  pg.save();
  pg.translate(LBL.x, LBL.y);
  pg.scale(LBL.w / LABEL_W, LBL.h / LABEL_H);
  labelPath(pg, 0);
  pg.fillStyle = "#fff";
  pg.fill();
  pg.restore();
  const [fc, fg] = canvas(TX, TY);
  fg.drawImage(label.foil, LBL.x, LBL.y, LBL.w, LBL.h);
  const [, bg] = canvas(TX, TY);
  bg.filter = "blur(2px)";
  bg.drawImage(pc, 0, 0);
  const [, fbg] = canvas(TX, TY);
  fbg.filter = "blur(1.5px)";
  fbg.drawImage(fc, 0, 0);
  const paper = pg.getImageData(0, 0, TX, TY).data;
  const foil = fg.getImageData(0, 0, TX, TY).data;
  const paperB = bg.getImageData(0, 0, TX, TY).data;
  const foilB = fbg.getImageData(0, 0, TX, TY).data;

  // G = roughness (soft-touch film ~0.6, paper 0.8, foil polished), B = metalness (foil only)
  const tile = grainTile();
  const [oc, og] = canvas(TX, TY);
  const orm = og.createImageData(TX, TY);
  const hgt = new Float32Array(TX * TY);
  const z1 = ZIP - 9 * k, z2 = ZIP + 9 * k, zw = 18 * k * k;
  for (let y = 0; y < TY; y++) {
    for (let x = 0; x < TX; x++) {
      const i = y * TX + x, p = i * 4;
      const pp = paper[p] / 255, ff = foil[p] / 255;
      const n = tile[(y % GT) * GT + (x % GT)];
      let rough = 0.6 + (n - 0.5) * 0.08;
      rough = rough * (1 - pp) + (0.8 + (n - 0.5) * 0.06) * pp;
      rough = rough * (1 - ff) + 0.32 * ff;
      orm.data[p] = 255;
      orm.data[p + 1] = rough * 255;
      orm.data[p + 2] = ff * 255;
      orm.data[p + 3] = 255;
      let h = (n - 0.5) * 0.35;
      if (y < SEAL) h += Math.sin(y * 0.45 / k) * 0.22 + 0.4;
      if (x < FIN || x > TX - FIN) h += Math.sin(x * 0.45 / k) * 0.2;
      const d1 = y - z1, d2 = y - z2;
      h += 2.4 * (Math.exp((-d1 * d1) / zw) + Math.exp((-d2 * d2) / zw));
      h += (paperB[p] / 255) * 1.1 + (foilB[p] / 255) * 0.9;
      hgt[i] = h;
    }
  }
  og.putImageData(orm, 0, 0);
  const ormTex = new THREE.CanvasTexture(oc);
  ormTex.anisotropy = 8;

  const [nc, ng] = canvas(TX, TY);
  const nd = ng.createImageData(TX, TY);
  const s = 1.4 * k;
  for (let y = 0; y < TY; y++) {
    for (let x = 0; x < TX; x++) {
      const i = y * TX + x;
      const nx = (hgt[i - (x > 0 ? 1 : 0)] - hgt[i + (x < TX - 1 ? 1 : 0)]) * s;
      const ny = (hgt[i + (y < TY - 1 ? TX : 0)] - hgt[i - (y > 0 ? TX : 0)]) * s;
      const len = Math.hypot(nx, ny, 1);
      const p = i * 4;
      nd.data[p] = (nx / len * 0.5 + 0.5) * 255;
      nd.data[p + 1] = (ny / len * 0.5 + 0.5) * 255;
      nd.data[p + 2] = (1 / len * 0.5 + 0.5) * 255;
      nd.data[p + 3] = 255;
    }
  }
  ng.putImageData(nd, 0, 0);
  const normal = new THREE.CanvasTexture(nc);
  normal.anisotropy = 8;
  return { map, ormTex, normal, finU: FIN / TX };
}

// the puffed shape of a filled pouch: flat fins at the sides and top, fullest low down
function shape(finU: number) {
  const across = (u: number) => Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, (u - finU) / (1 - 2 * finU)))), 0.5);
  const downV = (v: number) => (0.22 + 0.14 * (1 - smooth(0, 0.32, v))) * (1 - smooth(0.6, 0.86, v));
  return (u: number, v: number) => {
    let d = across(u) * downV(v);
    if (d <= 0.002) return Math.max(0, d);
    // soft creases near the side seams and where the bulge flattens into the zip
    const edge = 1 - smooth(0.04, 0.3, Math.min(u, 1 - u));
    const trans = smooth(0.55, 0.72, v) * (1 - smooth(0.82, 0.9, v));
    const crease = Math.abs(vnoise(u * 7 + v * 4, v * 11 - u * 3) - 0.5) * 2;
    d -= (1 - crease) * 0.014 * (edge * 0.9 + trans * 0.8 + 0.1);
    d += (vnoise(u * 3, v * 4) - 0.5) * 0.006;
    return Math.max(0, d);
  };
}

function panelGeometry(depth: (u: number, v: number) => number, NU: number, NV: number) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let j = 0; j <= NV; j++) {
    for (let i = 0; i <= NU; i++) {
      const u = i / NU, v = j / NV;
      pos.push((u - 0.5) * PW, v * PH, depth(u, v));
      uv.push(u, v);
    }
  }
  for (let j = 0; j < NV; j++) {
    for (let i = 0; i < NU; i++) {
      const a = j * (NU + 1) + i, b = a + 1, c = a + NU + 1, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function baseGeometry(depth: (u: number, v: number) => number, NU: number) {
  const ring: [number, number][] = [];
  for (let i = 0; i <= NU; i++) ring.push([(i / NU - 0.5) * PW, depth(i / NU, 0)]);
  for (let i = NU; i >= 0; i--) ring.push([(i / NU - 0.5) * PW, -depth(i / NU, 0)]);
  const pos = [0, 0.001, 0];
  ring.forEach(([x, z]) => pos.push(x, 0.001, z));
  const idx: number[] = [];
  for (let i = 1; i < ring.length; i++) idx.push(0, i, i + 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export async function createPouchScene(el: HTMLCanvasElement, onFlip?: (back: boolean) => void): Promise<PouchScene> {
  const mobile = window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
  const renderer = new THREE.WebGLRenderer({ canvas: el, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  RectAreaLightUniformsLib.init();

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.45;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  const look = new THREE.Vector3(0.32, 1.0, 0.15);
  const view = new THREE.Vector3(0.38, 0.16, 1).normalize(); // from the front right, a little above

  // ---- the bar top: dark oiled wood, fading into the page at its edges ----
  const [flc, flg] = canvas(1024, 1024);
  flg.fillStyle = "#17110c";
  flg.fillRect(0, 0, 1024, 1024);
  for (let y = 0; y < 1024; y += 2) {
    flg.fillStyle = `rgba(${40 + Math.random() * 20},${26 + Math.random() * 12},14,${0.25 + vnoise(0, y * 0.05) * 0.3})`;
    flg.fillRect(0, y, 1024, 2);
  }
  const flTex = new THREE.CanvasTexture(flc);
  flTex.colorSpace = THREE.SRGBColorSpace;
  flTex.wrapS = flTex.wrapT = THREE.RepeatWrapping;
  flTex.repeat.set(2, 2);
  const [fac, fag] = canvas(256, 256);
  const fade = fag.createRadialGradient(128, 128, 10, 128, 128, 128);
  fade.addColorStop(0, "#fff");
  fade.addColorStop(0.55, "#bbb");
  fade.addColorStop(1, "#000");
  fag.fillStyle = fade;
  fag.fillRect(0, 0, 256, 256);
  const floorMat = new THREE.MeshStandardMaterial({ map: flTex, alphaMap: new THREE.CanvasTexture(fac), transparent: true, roughness: 0.86, envMapIntensity: 0 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const [shc, shg] = canvas(256, 256);
  const shGrad = shg.createRadialGradient(128, 128, 0, 128, 128, 128);
  shGrad.addColorStop(0, "rgba(0,0,0,.9)");
  shGrad.addColorStop(0.5, "rgba(0,0,0,.45)");
  shGrad.addColorStop(1, "rgba(0,0,0,0)");
  shg.fillStyle = shGrad;
  shg.fillRect(0, 0, 256, 256);
  const contactTex = new THREE.CanvasTexture(shc);
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(PW * 1.35, 1.25), new THREE.MeshBasicMaterial({ map: contactTex, transparent: true, depthWrite: false }));
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.002;

  // ---- the pouch ----
  const labels = await pouchLabels();
  const TX = mobile ? 760 : 1100;
  const frontT = panelTextures(labels.front, "front", TX);
  const backT = panelTextures(labels.back, "back", TX);
  const depth = shape(frontT.finU);
  const NU = mobile ? 90 : 140;
  const panelG = panelGeometry(depth, NU, mobile ? 135 : 210);
  const mat = (t: ReturnType<typeof panelTextures>) =>
    new THREE.MeshPhysicalMaterial({
      map: t.map,
      roughnessMap: t.ormTex,
      metalnessMap: t.ormTex,
      normalMap: t.normal,
      normalScale: new THREE.Vector2(0.6, 0.6),
      roughness: 1,
      metalness: 1,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      sheen: 0.22,
      sheenRoughness: 0.85,
      sheenColor: new THREE.Color("#34302e"),
      envMapIntensity: 0.7,
    });
  const frontMat = mat(frontT);
  const backMat = mat(backT);
  const pouch = new THREE.Group();
  const frontMesh = new THREE.Mesh(panelG, frontMat);
  const backMesh = new THREE.Mesh(panelG, backMat);
  backMesh.rotation.y = Math.PI;
  const baseG = baseGeometry(depth, NU);
  const baseMat = new THREE.MeshStandardMaterial({ color: "#101012", roughness: 0.7, side: THREE.DoubleSide });
  const base = new THREE.Mesh(baseG, baseMat);
  for (const m of [frontMesh, backMesh, base]) {
    m.castShadow = true;
    m.receiveShadow = true;
    pouch.add(m);
  }
  pouch.add(contact);
  pouch.rotation.y = FRONT;
  scene.add(pouch);

  // ---- granules spilled in front of it ----
  const granuleGeo = new THREE.IcosahedronGeometry(1, 1);
  {
    const p = granuleGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const s = 0.7 + vnoise(p.getX(i) * 3 + 9, p.getY(i) * 3 + p.getZ(i) * 2) * 0.6;
      p.setXYZ(i, p.getX(i) * s, p.getY(i) * s * 0.75, p.getZ(i) * s);
    }
    granuleGeo.computeVertexNormals();
  }
  const GN = mobile ? 700 : 1400;
  const granuleMat = new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.4, envMapIntensity: 0.6, flatShading: true });
  const granules = new THREE.InstancedMesh(granuleGeo, granuleMat, GN);
  granules.castShadow = true;
  granules.receiveShadow = true;
  {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), col = new THREE.Color();
    for (let i = 0; i < GN; i++) {
      const pile = i < GN * 0.82;
      const rr = pile ? Math.sqrt(-2 * Math.log(1 - Math.random() * 0.98)) * 0.12 : Math.random() * 0.7 + 0.1;
      const a = Math.random() * Math.PI * 2;
      const s = 0.008 + Math.random() * 0.012;
      const h = pile ? 0.12 * Math.exp(-(rr * rr) / 0.011) * (0.75 + Math.random() * 0.3) : 0;
      ps.set(1.0 + Math.cos(a) * rr * (pile ? 1.2 : 1), h + s * 0.6, 0.6 + Math.sin(a) * rr * (pile ? 0.9 : 0.6));
      e.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      q.setFromEuler(e);
      sc.set(s, s, s);
      m.compose(ps, q, sc);
      granules.setMatrixAt(i, m);
      col.setHSL(0.055 + Math.random() * 0.02, 0.75, 0.014 + Math.random() * 0.03);
      granules.setColorAt(i, col);
    }
  }
  scene.add(granules);

  // ---- lights: soft warm key, two soft rim spots to pull the black pouch out of the dark ----
  const key = new THREE.SpotLight("#ffe2bd", 70, 20, 0.8, 1, 1.4);
  key.position.set(-2.6, 4.8, 3.6);
  key.target.position.set(0, 0.9, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  key.shadow.bias = -0.0004;
  key.shadow.radius = 6;
  scene.add(key, key.target);
  const fill = new THREE.RectAreaLight("#ffe9cf", 1.0, 3, 4);
  fill.position.set(3.2, 1.6, 3.4);
  fill.lookAt(0, 1, 0);
  scene.add(fill);
  const rim = (color: string, power: number, x: number, z: number) => {
    const s = new THREE.SpotLight(color, power, 9, 0.32, 1, 1.5);
    s.position.set(x, 2.3, z);
    s.target.position.set(0, 1.05, 0);
    scene.add(s, s.target);
  };
  rim("#ffd9a8", 46, -2.3, -2.4);
  rim("#ffe6c2", 32, 2.5, -2.2);
  const top = new THREE.RectAreaLight("#fff1dc", 2.2, 3, 1.4);
  top.position.set(0, 4.2, 0.6);
  top.lookAt(0, 1, 0);
  scene.add(top);
  scene.add(new THREE.HemisphereLight("#3a2c20", "#050403", 0.35));

  // ---- size: frame the pouch whatever the box's shape ----
  const resize = () => {
    const w = el.clientWidth || 1, h = el.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // far enough that the whole pouch sits inside the soft vignette, further still on narrow boxes
    const dist = 6.3 * Math.max(1, 1 / camera.aspect);
    camera.position.copy(view).multiplyScalar(dist).add(look);
    camera.lookAt(look);
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(el);

  // ---- the hand: drag to turn (with a little momentum), tap to flip ----
  let target = FRONT;
  let angle = FRONT;
  let vel = 0;
  let dragging = false;
  let moved = 0;
  let lastX = 0;
  let back = false;
  let idle = 0;
  const onDown = (e: PointerEvent) => {
    dragging = true;
    moved = 0;
    lastX = e.clientX;
    vel = 0;
  };
  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    moved += Math.abs(dx);
    const d = (dx / Math.max(200, el.clientWidth)) * Math.PI * 1.6;
    angle += d;
    target = angle;
    vel = d;
    idle = 0;
  };
  const flip = () => {
    back = !back;
    // turn the short way to whichever face is wanted
    const want = FRONT + (back ? Math.PI : 0);
    target = angle + ((((want - angle) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    idle = 0;
    onFlip?.(back);
  };
  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    if (moved < 6) flip();
    else {
      // let go: carry on with the momentum, then settle on the nearest face
      const coast = angle + vel * 14;
      const faces = Math.round((coast - FRONT) / Math.PI);
      target = FRONT + faces * Math.PI;
      const nb = Math.abs(faces) % 2 === 1;
      if (nb !== back) {
        back = nb;
        onFlip?.(back);
      }
    }
  };
  el.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);

  // ---- loop ----
  let running = false;
  let raf = 0;
  let last = performance.now();
  let isReady = false;
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    idle += dt;
    if (!dragging) {
      // a slow breath of movement when nobody's touching it
      const sway = idle > 2.5 ? Math.sin((idle - 2.5) * 0.35) * 0.16 * Math.min(1, (idle - 2.5) / 3) : 0;
      angle += (target + sway - angle) * Math.min(1, dt * 4.5);
    }
    pouch.rotation.y = angle;
    renderer.render(scene, camera);
    isReady = true;
  };
  const setRunning = (on: boolean) => {
    if (on === running) return;
    running = on;
    if (on) {
      last = performance.now();
      raf = requestAnimationFrame(loop);
    } else cancelAnimationFrame(raf);
  };
  // draw one frame straight away so it's there before it scrolls in
  renderer.render(scene, camera);

  return {
    setRunning,
    flip,
    ready: () => isReady,
    dispose: () => {
      setRunning(false);
      ro.disconnect();
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
      for (const t of [frontT, backT]) {
        t.map.dispose();
        t.ormTex.dispose();
        t.normal.dispose();
      }
      [frontMat, backMat, baseMat, granuleMat, floorMat].forEach((m) => m.dispose());
      flTex.dispose();
      contactTex.dispose();
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
