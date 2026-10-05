/**
 * "From bean to bottle": a scroll-driven macro sequence in three.js.
 * Everything is a function of progress (0..1), so it scrubs both ways.
 *
 *   0.00 one bean (macro, rim-lit)     0.15 crushed (squash + shudder)
 *   0.26 burst into grounds            0.45 water rains through, a vortex
 *   0.64 grounds dissolve, coffee      0.80 one stream into the bottle, capped
 *
 * Interaction: drag to turn the bean, the light follows the cursor, and the
 * cursor scatters the grounds while they hang in the air.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { labelMaps, dropletNormalMap } from "./textures";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";

export type BeanScene = {
  /** immediate skips the smoothing (used by automated snapshots) */
  setProgress: (p: number, immediate?: boolean) => void;
  setRunning: (on: boolean) => void;
  dispose: () => void;
};

const EXPLODE = 0.26;
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ------------------------------------------------------------ textures ----
function fbmCanvas(size: number, octaves: number, contrast: number) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  g.fillStyle = "#808080";
  g.fillRect(0, 0, size, size);
  // value noise: each octave is a small random grid scaled up with smoothing,
  // so there are no hard-edged blocks at any resolution
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = "high";
  for (let o = 0; o < octaves; o++) {
    const cells = Math.min(size, 4 << o);
    const oc = document.createElement("canvas");
    oc.width = oc.height = cells;
    const og = oc.getContext("2d")!;
    const img = og.createImageData(cells, cells);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + ((Math.random() - 0.5) * 255 * contrast) / (o + 1);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    og.putImageData(img, 0, 0);
    g.globalAlpha = 0.5;
    g.drawImage(oc, 0, 0, size, size);
  }
  g.globalAlpha = 1;
  g.filter = "blur(1px)";
  g.drawImage(c, 0, 0);
  g.filter = "none";
  return c;
}

/** a normal map of fine wrinkles, from a height field */
function wrinkleNormal(size = 1024) {
  const h = fbmCanvas(size, 7, 1.2).getContext("2d")!.getImageData(0, 0, size, size).data;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const img = g.createImageData(size, size);
  const H = (x: number, y: number) => h[(((y + size) % size) * size + ((x + size) % size)) * 4] / 255;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * 2.5;
      const dy = (H(x, y + 1) - H(x, y - 1)) * 2.5;
      const l = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      img.data[i] = 128 + (-dx / l) * 127;
      img.data[i + 1] = 128 + (dy / l) * 127;
      img.data[i + 2] = 128 + (1 / l) * 127;
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** an opaque soft panel: warm in the middle, fading to the scene background at the edges */
function panelTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#050403";
  g.fillRect(0, 0, 256, 256);
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, "#8a5c2c");
  grd.addColorStop(0.22, "#4a2e16");
  grd.addColorStop(0.6, "#120a05");
  grd.addColorStop(1, "#050403");
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** a soft round glow */
function softDisc(colour: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, colour);
  grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ------------------------------------------------------------ geometry ----
/** smooth 3D value noise in -1..1 (for organic variation that never tiles) */
function noise3(x: number, y: number, z: number) {
  const h = (i: number, j: number, k: number) => {
    const n = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453;
    return (n - Math.floor(n)) * 2 - 1;
  };
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const f = (t: number) => t * t * (3 - 2 * t);
  const u = f(x - xi), v = f(y - yi), w = f(z - zi);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  return l(
    l(l(h(xi, yi, zi), h(xi + 1, yi, zi), u), l(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v),
    l(l(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), l(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u), v),
    w,
  );
}
const fbm3 = (x: number, y: number, z: number, oct = 4) => {
  let a = 0.5, f = 1, sum = 0;
  for (let o = 0; o < oct; o++) {
    sum += a * noise3(x * f, y * f, z * f);
    a *= 0.5;
    f *= 2.03;
  }
  return sum;
};

/**
 * A macro-detail roasted bean: domed back, flat face, a deep S-shaped crease
 * with pale chaff caught in it, a slightly lumpy surface, uneven roast colour
 * and fine dark specks — modelled on real dark-roast beans.
 */
function beanGeometry(detail = 1) {
  const g = new THREE.SphereGeometry(0.5, Math.round(192 * detail), Math.round(144 * detail));
  const p = g.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const v = new THREE.Vector3();
  const base = new THREE.Color();
  const chaff = new THREE.Color(0x6e5232);
  const lip = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    let x = v.x * 0.74;
    let y = v.y * 0.6;
    let z = v.z;
    if (y > 0) y *= 0.55;
    // the crease: an S-curve, deeper in the middle, closing at the tips
    const centre = 0.07 * Math.sin(z * 5.2) + 0.012 * Math.sin(z * 13);
    const d = (x - centre) / 0.036;
    const along = Math.max(0, 1 - Math.pow(Math.abs(z) / 0.5, 5));
    const crease = Math.exp(-d * d) * along;
    if (y > -0.02) {
      y -= 0.1 * crease;
      // the lips either side of the crease swell and roll over slightly
      y += 0.016 * Math.exp(-Math.pow(Math.abs(d) - 1.6, 2)) * along;
    }
    // asymmetry and an organic, slightly lumpy surface
    x *= 1 + 0.04 * Math.sin(z * 8.5 + 1);
    const lump = fbm3(v.x * 6, v.y * 6, v.z * 6) * 0.018 + fbm3(v.x * 22, v.y * 22, v.z * 22, 2) * 0.004;
    x *= 1 + lump;
    y *= 1 + lump;
    z *= 1 + lump * 0.5;
    p.setXYZ(i, x, y, z);

    // colour: uneven dark roast (darker at the tips), fine specks, worn lighter lips
    const n = fbm3(v.x * 4 + 3, v.y * 4, v.z * 4 - 2);
    const tip = Math.pow(Math.abs(v.z) * 2, 3);
    base.setHSL(0.045 + n * 0.008, 0.6, Math.max(0.01, 0.026 + n * 0.012 - tip * 0.01));
    const speck = noise3(v.x * 90, v.y * 90, v.z * 90);
    if (speck > 0.8) base.multiplyScalar(0.7);
    if (y > -0.04) {
      lip.copy(base).lerp(new THREE.Color(0x3a1d0c), 0.35);
      base.lerp(lip, Math.exp(-Math.pow(Math.abs(d) - 1.6, 2)) * along * 0.6);
      // chaff in the crease, broken up so it looks like real silverskin
      const torn = 0.5 + 0.5 * fbm3(v.z * 14, v.x * 30, 1.3);
      if (crease > 0.3) base.lerp(chaff, Math.min(1, (crease - 0.3) * 1.7) * torn);
    }
    colors.set([base.r, base.g, base.b], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

/** an irregular fragment of bean */
function shardGeometry() {
  // a rough, rounded crumb (merged vertices so it shades smoothly, not faceted)
  const g = mergeVertices(new THREE.IcosahedronGeometry(1, 2));
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  const seed = [Math.random() * 10, Math.random() * 10, Math.random() * 10];
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = 1 + 0.28 * Math.sin(v.x * 4 + seed[0]) * Math.sin(v.y * 5 + seed[1]) + 0.18 * Math.sin(v.z * 7 + seed[2]);
    p.setXYZ(i, v.x * n * 1.1, v.y * n * 0.65, v.z * n * 0.9);
  }
  g.computeVertexNormals();
  return g;
}

const BOTTLE: [number, number][] = [
  [0, 0], [0.82, 0], [0.96, 0.04], [1, 0.16], [1, 2.62], [0.985, 2.82], [0.93, 3.02], [0.8, 3.22],
  [0.6, 3.38], [0.44, 3.48], [0.4, 3.56], [0.4, 3.92], [0.45, 3.94], [0.45, 4.04], [0.4, 4.06],
];
function bottleGeometry(points: [number, number][], scale: number, flat: number) {
  const curve = new THREE.SplineCurve(points.map(([r, y]) => new THREE.Vector2(r * scale, y)));
  const g = new THREE.LatheGeometry(curve.getPoints(120), 96);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = Math.min(1, Math.max(0, (y - 2.7) / 0.75));
    pos.setZ(i, pos.getZ(i) * (flat + (1 - flat) * t * t * (3 - 2 * t)));
  }
  g.computeVertexNormals();
  return g;
}

// --------------------------------------------------------------- scene ----
export function createBeanScene(canvas: HTMLCanvasElement): BeanScene {
  const mobile = window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: mobile, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.35 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050403);
  scene.fog = new THREE.FogExp2(0x050403, 0.022);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.35;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 80);
  const look = new THREE.Vector3();

  // macro lighting: warm key, strong rim from behind, a cool kicker
  const key = new THREE.SpotLight(0xffe2c0, 32, 20, 0.6, 0.6, 1.2);
  key.position.set(-2.5, 3.5, 3);
  scene.add(key, key.target);
  const rim = new THREE.SpotLight(0xffbd7a, 50, 20, 0.5, 0.75, 1.2);
  rim.position.set(2.2, 1.2, -3.2);
  scene.add(rim, rim.target);
  const kicker = new THREE.PointLight(0xbcd6ff, 6, 10);
  kicker.position.set(-2.5, -1.5, -2);
  scene.add(kicker);
  const cursorLight = new THREE.PointLight(0xffe2b8, mobile ? 0 : 10, 4, 1.5);
  cursorLight.position.set(1, 1, 2);
  scene.add(cursorLight);
  // a faint warm haze behind everything, so the black has depth
  const haze = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 40),
    new THREE.ShaderMaterial({
      depthWrite: false,
      fog: false,
      uniforms: { uY: { value: 0 } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: "uniform float uY; varying vec2 vUv; void main(){ float d = distance(vUv, vec2(0.5, 0.55)); vec3 c = mix(vec3(0.055,0.032,0.016), vec3(0.0), smoothstep(0.0, 0.42, d)); gl_FragColor = vec4(c, 1.0); }",
    }),
  );
  haze.position.set(0, -2, -14);
  scene.add(haze);

  // ---------------------------------------------------------------- bean --
  const wrinkles = wrinkleNormal(mobile ? 512 : 1024);
  wrinkles.repeat.set(3, 2);
  const roughTex = new THREE.CanvasTexture(fbmCanvas(256, 5, 1));
  roughTex.wrapS = roughTex.wrapT = THREE.RepeatWrapping;
  const beanMat = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.64,
    roughnessMap: roughTex,
    normalMap: wrinkles,
    normalScale: new THREE.Vector2(0.5, 0.5),
    clearcoat: 0.12,
    clearcoatRoughness: 0.55,
    envMapIntensity: 0.6,
    sheen: 0.12,
    sheenRoughness: 0.7,
    sheenColor: new THREE.Color(0x4a2410),
  });
  const bean = new THREE.Mesh(beanGeometry(mobile ? 0.6 : 1), beanMat);
  const beanPivot = new THREE.Group();
  beanPivot.add(bean);
  scene.add(beanPivot);
  bean.rotation.set(1.2, 0.25, 0.5); // crease side toward the camera

  // --------------------------------------------------------- the grounds --
  const SHARDS = mobile ? 700 : 3200;
  const DUST = mobile ? 2600 : 14000;
  const shardMat = new THREE.MeshPhysicalMaterial({ roughness: 0.7, roughnessMap: roughTex, clearcoat: 0.25, clearcoatRoughness: 0.5, normalMap: wrinkles, normalScale: new THREE.Vector2(0.8, 0.8), sheen: 0.3, sheenColor: new THREE.Color(0x7a4a22) });
  const shards = new THREE.InstancedMesh(shardGeometry(), shardMat, SHARDS);
  shards.frustumCulled = false;
  scene.add(shards);
  type P = { p0: THREE.Vector3; v0: THREE.Vector3; k: number; spin: THREE.Vector3; rot: THREE.Euler; s: number; a: number; r: number; lane: number; off: THREE.Vector3 };
  const sampleInBean = () => {
    for (;;) {
      const v = new THREE.Vector3((Math.random() - 0.5) * 0.74, (Math.random() - 0.5) * 0.45, Math.random() - 0.5);
      if ((v.x / 0.37) ** 2 + (v.y / 0.24) ** 2 + (v.z / 0.5) ** 2 < 1) return v;
    }
  };
  const makeParticle = (speed: number): P => {
    const p0 = sampleInBean();
    const dir = p0.clone().normalize();
    if (!isFinite(dir.x)) dir.set(0, 1, 0);
    dir.add(new THREE.Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.3) * 0.8, (Math.random() - 0.5) * 0.8)).normalize();
    return {
      p0,
      v0: dir.multiplyScalar(speed * (0.4 + Math.random())),
      k: 1.4 + Math.random() * 1.4,
      spin: new THREE.Vector3((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9),
      rot: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
      s: Math.pow(Math.random(), 3) * 0.032 + 0.005,
      a: Math.random() * Math.PI * 2,
      r: 0.05 + Math.random() * 0.45,
      lane: Math.random(),
      off: new THREE.Vector3(),
    };
  };
  const shardP: P[] = Array.from({ length: SHARDS }, () => makeParticle(3.4));
  const col = new THREE.Color();
  shardP.forEach((_, i) => {
    // outer roast (dark) or inner bean (lighter brown)
    const inner = Math.random() < 0.38;
    col.setHSL(inner ? 0.065 : 0.052, inner ? 0.5 : 0.5, inner ? 0.085 + Math.random() * 0.05 : 0.022 + Math.random() * 0.025);
    shards.setColorAt(i, col);
  });
  shards.instanceColor!.needsUpdate = true;

  // fine powder: simulated on the GPU (same motion as the grounds), drawn as
  // soft discs that swell and fade when out of focus, like a macro lens
  const dustScene = new THREE.Scene();
  const dustGeo = new THREE.BufferGeometry();
  const dP0 = new Float32Array(DUST * 3);
  const dV0 = new Float32Array(DUST * 3);
  const dPrm = new Float32Array(DUST * 4);
  for (let i = 0; i < DUST; i++) {
    const pt = makeParticle(3.2);
    dP0.set([pt.p0.x, pt.p0.y, pt.p0.z], i * 3);
    dV0.set([pt.v0.x, pt.v0.y, pt.v0.z], i * 3);
    dPrm.set([pt.k, pt.a, pt.r, pt.lane], i * 4);
  }
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dP0, 3));
  dustGeo.setAttribute("v0", new THREE.BufferAttribute(dV0, 3));
  dustGeo.setAttribute("prm", new THREE.BufferAttribute(dPrm, 4));
  const dustMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uT: { value: 0 }, uVortex: { value: 0 }, uSink: { value: 0 }, uOpacity: { value: 0 },
      uCursor: { value: new THREE.Vector3(99, 99, 99) }, uFocus: { value: 7 }, uPR: { value: renderer.getPixelRatio() },
      uStreamTop: { value: -0.9 }, uColor: { value: new THREE.Color(0x5a341a) },
    },
    vertexShader: `
      attribute vec3 v0; attribute vec4 prm;
      uniform float uT, uVortex, uSink, uOpacity, uFocus, uPR, uStreamTop;
      uniform vec3 uCursor;
      varying float vAlpha;
      void main(){
        float k = prm.x; float e = exp(-k * uT);
        vec3 pos = position + v0 * (1.0 - e) / k;
        pos.y += -1.1 * (uT / k - (1.0 - e) / (k * k));
        if (uVortex > 0.0) {
          float ang = prm.y + uVortex * 7.0 + prm.w * 2.0;
          float rad = mix(prm.z * 2.2, 0.06 + prm.z * 0.25, uSink);
          float y = mix(0.6 - prm.w * 2.4, uStreamTop - prm.w * 0.4, uSink);
          pos.x = mix(pos.x, cos(ang) * rad, uVortex);
          pos.z = mix(pos.z, sin(ang) * rad * 0.7, uVortex);
          pos.y = mix(pos.y, y, uVortex);
        }
        vec3 d = pos - uCursor; float dl = length(d);
        pos += d / (dl + 1e-4) * max(0.0, 0.75 - dl) * 0.6;
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        float depth = -mv.z;
        float defocus = abs(depth - uFocus);
        gl_PointSize = uPR * (2.2 + defocus * 7.0) * (6.0 / depth);
        vAlpha = uOpacity / (1.0 + defocus * defocus * 3.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; varying float vAlpha;
      void main(){
        float r = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.15, r) * vAlpha;
        if (a < 0.003) discard;
        gl_FragColor = vec4(uColor, a);
        #include <colorspace_fragment>
      }`,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  dustScene.add(dust);

  // ------------------------------------------------- water, then coffee --
  const DROPS = mobile ? 150 : 600;
  const dropMat = new THREE.MeshPhysicalMaterial({ transmission: 1, roughness: 0.02, thickness: 0.25, ior: 1.33, clearcoat: 1, envMapIntensity: 2.2 });
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 20, 14), dropMat, DROPS);
  drops.frustumCulled = false;
  scene.add(drops);
  const dropP = Array.from({ length: DROPS }, () => ({ x: (Math.random() - 0.5) * 2.6, z: (Math.random() - 0.5) * 1.6, y0: 3 + Math.random() * 6, sp: 3.5 + Math.random() * 2.5, s: 0.02 + Math.pow(Math.random(), 2) * 0.05, a: Math.random() * Math.PI * 2 }));
  const WATER = new THREE.Color(0xf4faff);
  const COFFEE = new THREE.Color(0x2a1308);

  // the stream and the bottle below
  const STREAM_TOP = -0.9;
  const BOTTLE_Y = -8.6;
  const BOTTLE_S = 0.42;
  const MOUTH = BOTTLE_Y + 4.06;
  // a glossy coffee stream that narrows as it falls (gravity), with an amber
  // edge where the light shines through the thin liquid
  const streamMat = new THREE.MeshPhysicalMaterial({ color: 0x160904, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03, sheen: 0.4, sheenColor: new THREE.Color(0x8a4a18) });
  const streamGeo = new THREE.CylinderGeometry(1, 1, 1, 40, 120, true);
  streamGeo.translate(0, -0.5, 0);
  const streamTime = { value: 0 };
  const edgeGlow = { value: new THREE.Color(0x6a2c0a) };
  streamMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = streamTime;
    sh.uniforms.uEdge = edgeGlow;
    sh.vertexShader = "uniform float uTime;\n" + sh.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      float k = -position.y;                         // 0 at the top, 1 at the bottom
      float radius = mix(0.07, 0.032, sqrt(k));      // thins as it speeds up
      float rip = sin(k * 70.0 - uTime * 26.0) * 0.06 + sin(k * 190.0 - uTime * 41.0) * 0.025;
      transformed.xz *= radius * (1.0 + rip * k);
      transformed.x += sin(k * 6.0 + uTime * 2.2) * 0.006 * k;`,
    );
    sh.fragmentShader = "uniform vec3 uEdge;\n" + sh.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      `#include <emissivemap_fragment>
      totalEmissiveRadiance += uEdge * pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 2.5);`,
    );
  };
  const stream = new THREE.Mesh(streamGeo, streamMat);
  stream.position.y = STREAM_TOP;
  scene.add(stream);
  // a few drops that break away from the stream
  const LOOSE = mobile ? 10 : 22;
  const loose = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), streamMat, LOOSE);
  loose.frustumCulled = false;
  scene.add(loose);
  const looseP = Array.from({ length: LOOSE }, () => ({ phase: Math.random(), off: (Math.random() - 0.5) * 0.12, z: (Math.random() - 0.5) * 0.08, s: 0.008 + Math.random() * 0.014 }));

  const bottle = new THREE.Group();
  bottle.position.y = BOTTLE_Y;
  scene.add(bottle);
  const glass = new THREE.Mesh(
    bottleGeometry(BOTTLE, BOTTLE_S * 2.05, 0.56),
    new THREE.MeshPhysicalMaterial({ color: 0xe6f8ea, transmission: 1, roughness: 0.09, thickness: 0.3, ior: 1.5, attenuationColor: new THREE.Color(0x1a8f42), attenuationDistance: 1.6, clearcoat: 0.6, clearcoatRoughness: 0.18, specularIntensity: 0.55, envMapIntensity: 0.75 }),
  );
  bottle.add(glass);
  {
    const drops = dropletNormalMap();
    drops.repeat.set(2, 3);
    const gm = glass.material as THREE.MeshPhysicalMaterial;
    gm.normalMap = drops;
    gm.normalScale = new THREE.Vector2(0.22, 0.22);
    gm.clearcoatNormalMap = drops;
    gm.clearcoatNormalScale = new THREE.Vector2(0.45, 0.45);
  }
  const fillPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), BOTTLE_Y);
  const inside = new THREE.Mesh(
    bottleGeometry(BOTTLE.map(([r, y]) => [r * 0.92, Math.max(0.08, Math.min(y, 3.9))] as [number, number]), BOTTLE_S * 2.05, 0.56),
    new THREE.MeshPhysicalMaterial({ color: 0x1d0d05, roughness: 0.2, clearcoat: 0.5, clearcoatRoughness: 0.25, emissive: new THREE.Color(0x3a1706), emissiveIntensity: 0.35, clippingPlanes: [fillPlane] }),
  );
  bottle.add(inside);

  // the coffee's surface, rising as the bottle fills: it ripples where the
  // stream lands and gathers a ring of crema-coloured foam
  const INNER = BOTTLE.map(([r, y]) => [r * 0.92 * BOTTLE_S * 2.05, y] as [number, number]);
  const innerR = (y: number) => {
    for (let i = 1; i < INNER.length; i++) if (INNER[i][1] >= y) {
      const [r0, y0] = INNER[i - 1];
      const [r1, y1] = INNER[i];
      return r0 + ((r1 - r0) * (y - y0)) / Math.max(1e-4, y1 - y0);
    }
    return INNER[INNER.length - 1][0];
  };
  const flatAt = (y: number) => {
    const t = Math.min(1, Math.max(0, (y - 2.7) / 0.75));
    return 0.56 + 0.44 * t * t * (3 - 2 * t);
  };
  const rippleTime = { value: 0 };
  const rippleAmp = { value: 0 };
  const surfaceMat = new THREE.MeshPhysicalMaterial({ color: 0x1d0d05, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05, emissive: new THREE.Color(0x2a1105), emissiveIntensity: 0.3, flatShading: true });
  surfaceMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = rippleTime;
    sh.uniforms.uAmp = rippleAmp;
    sh.vertexShader = "uniform float uTime; uniform float uAmp;\n" + sh.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      float rr = length(position.xy);
      transformed.z += uAmp * sin(rr * 46.0 - uTime * 14.0) * exp(-rr * 2.2) * 0.02;`,
    );
  };
  const surface = new THREE.Mesh(new THREE.RingGeometry(0.0001, 1, 96, 28), surfaceMat);
  surface.rotation.x = -Math.PI / 2;
  bottle.add(surface);
  const FOAM = mobile ? 70 : 160;
  const foam = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshPhysicalMaterial({ color: 0x7a4a26, roughness: 0.25, clearcoat: 0.8, transparent: true, opacity: 0.9 }), FOAM);
  bottle.add(foam);
  const foamP = Array.from({ length: FOAM }, () => ({ a: Math.random() * Math.PI * 2, k: Math.random() < 0.7 ? 0.82 + Math.random() * 0.16 : Math.random() * 0.8, s: 0.008 + Math.pow(Math.random(), 2) * 0.03 }));
  // the gold-foil label, wrapped round the front
  void labelMaps().then((lab) => {
    const R = BOTTLE_S * 2.05 * 1.006;
    const h = 2.1;
    const span = 0.95;
    const geo = new THREE.CylinderGeometry(R, R, h, 96, 1, true, -span, span * 2);
    geo.scale(1, 1, 0.56);
    geo.translate(0, 0.42 + h / 2, 0);
    bottle.add(new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ map: lab.map, metalnessMap: lab.metalnessMap, roughnessMap: lab.roughnessMap, metalness: 1, roughness: 1, clearcoat: 0.15, clearcoatRoughness: 0.4, envMapIntensity: 0.9 })));
  });
  // studio lights for the bottle shot
  // a big soft light from high above (wide cone, full penumbra) instead of a hard front key
  const bottleKey = new THREE.SpotLight(0xffe4bd, 38, 22, 0.7, 1, 1.3);
  bottleKey.position.set(-0.6, BOTTLE_Y + 10, 1.6);
  bottleKey.target.position.set(0, BOTTLE_Y + 2, 0);
  // two tall strip softboxes behind the bottle, like a real product shoot:
  // they draw clean vertical lines down the glass edges instead of point glare
  RectAreaLightUniformsLib.init();
  const strip = (x: number, colour: number, power: number) => {
    const l = new THREE.RectAreaLight(colour, power, 0.35, 5.5);
    l.position.set(x, BOTTLE_Y + 2, -2.6);
    l.lookAt(0, BOTTLE_Y + 2, 0);
    scene.add(l);
    return l;
  };
  strip(2.3, 0xffd2a0, 5);
  strip(-2.3, 0xffe9cc, 3.5);
  const front = new THREE.RectAreaLight(0xffe6c8, 0.9, 4, 5);
  front.position.set(-2.2, BOTTLE_Y + 2.6, 6);
  front.lookAt(0, BOTTLE_Y + 1.6, 0);
  scene.add(front);
  scene.add(bottleKey, bottleKey.target);
  // a soft light panel right behind the bottle: the empty glass glows green
  // through it, so you can watch the dark coffee rise as it fills
  const backPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    // solid, not transparent: glass only refracts solid objects behind it
    new THREE.MeshBasicMaterial({ map: panelTexture(), fog: false }),
  );
  backPanel.scale.set(13, 13, 1); // wide enough that its edges are always off-screen
  backPanel.position.set(0, BOTTLE_Y + 2.1, -2.6);
  scene.add(backPanel);
  // a dark plinth the bottle stands on, with a soft contact shadow, so it is grounded rather than floating
  const plinth = new THREE.Mesh(
    new THREE.CircleGeometry(3.2, 64),
    new THREE.MeshBasicMaterial({ map: softDisc("#000000"), transparent: true, opacity: 0.85, depthWrite: false }),
  );
  plinth.rotation.x = -Math.PI / 2;
  plinth.position.set(0, BOTTLE_Y + 0.005, 0);
  scene.add(plinth);
  // brushed, satin aluminium: reads as metal without a blinding highlight
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.46 * BOTTLE_S * 2.05, 0.46 * BOTTLE_S * 2.05, 0.5, 64), new THREE.MeshStandardMaterial({ color: 0xc9ccd0, metalness: 1, roughness: 0.48, envMapIntensity: 0.7 }));
  scene.add(cap);

  // ------------------------------------------------------------- post ----
  let composer: EffectComposer | null = null;
  let bokeh: BokehPass | null = null;
  let bloom: UnrealBloomPass | null = null;
  if (!mobile) {
    composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType }));
    composer.addPass(new RenderPass(scene, camera));
    bokeh = new BokehPass(scene, camera, { focus: 3, aperture: 0.0035, maxblur: 0.009 });
    composer.addPass(bokeh);
    const dustPass = new RenderPass(dustScene, camera);
    dustPass.clear = false;
    dustPass.clearDepth = true;
    composer.addPass(dustPass);
    bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.24, 0.45, 0.9);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  // ------------------------------------------------------- interaction ---
  let progress = 0;
  let shown = 0; // smoothed progress
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2(9, 9);
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const cursor = new THREE.Vector3(99, 99, 99);
  const drag = { on: false, x: 0, y: 0, rx: 0, ry: 0, vx: 0, vy: 0 };
  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    plane.constant = -look.z;
    if (!ray.ray.intersectPlane(plane, cursor)) cursor.set(99, 99, 99);
    cursorLight.position.set(cursor.x, cursor.y, cursor.z + 1.2);
    if (drag.on) {
      drag.vy = (e.clientX - drag.x) * 0.012;
      drag.vx = (e.clientY - drag.y) * 0.012;
      drag.ry += drag.vy;
      drag.rx += drag.vx;
      drag.x = e.clientX;
      drag.y = e.clientY;
    }
  };
  const onDown = (e: PointerEvent) => {
    if (progress > EXPLODE) return;
    drag.on = true;
    drag.x = e.clientX;
    drag.y = e.clientY;
  };
  const onUp = () => {
    drag.on = false;
    if (mobile) cursor.set(99, 99, 99);
  };
  const onLeave = () => cursor.set(99, 99, 99);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerdown", onDown);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  canvas.addEventListener("pointerleave", onLeave);

  // --------------------------------------------------------- the story ---
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const tmpE = new THREE.Euler();
  const tmpV = new THREE.Vector3();
  const focusTarget = new THREE.Vector3();

  /** where a particle is at time t after the burst (seconds of slow motion) */
  const particleAt = (pt: P, t: number, vortex: number, sink: number, out: THREE.Vector3) => {
    const e = Math.exp(-pt.k * t);
    const g = -1.1;
    out.set(
      pt.p0.x + (pt.v0.x * (1 - e)) / pt.k,
      pt.p0.y + (pt.v0.y * (1 - e)) / pt.k + g * (t / pt.k - (1 - e) / (pt.k * pt.k)),
      pt.p0.z + (pt.v0.z * (1 - e)) / pt.k,
    );
    if (vortex > 0) {
      // swirl into a descending funnel around the vertical axis
      const ang = pt.a + vortex * 7 + pt.lane * 2;
      const rad = lerp(pt.r * 2.2, 0.06 + pt.r * 0.25, sink);
      const y = lerp(0.6 - pt.lane * 2.4, STREAM_TOP - pt.lane * 0.4, sink);
      out.x = lerp(out.x, Math.cos(ang) * rad, vortex);
      out.z = lerp(out.z, Math.sin(ang) * rad * 0.7, vortex);
      out.y = lerp(out.y, y, vortex);
    }
    return out;
  };

  const step = (dt: number, time: number) => {
    shown += (progress - shown) * Math.min(1, dt * 6);
    const P = shown;
    const t = Math.max(0, (P - EXPLODE) * 9); // slow-motion seconds since the burst
    const vortex = smooth(0.44, 0.6, P);
    const sink = smooth(0.56, 0.74, P);
    const dissolve = smooth(0.62, 0.76, P);

    // ---- camera: macro on the bean, pull back for the burst, down to the bottle
    const cz = lerp(lerp(2.9, 2.2, smooth(0.08, 0.24, P)), 7.5, smooth(EXPLODE, 0.4, P));
    const cy = lerp(0.05, -0.3, smooth(0.4, 0.6, P));
    const down = smooth(0.7, 0.84, P); // arrive at the bottle before the coffee reaches it
    camera.position.set(Math.sin(time * 0.15) * 0.12 * (1 - down) + ndc.x * 0.08, lerp(cy, BOTTLE_Y + 2.7, down), lerp(cz, camera.aspect < 0.8 ? 10.6 : 9.6, down));
    look.set(0, lerp(0, BOTTLE_Y + 2.15, down), 0);
    camera.lookAt(look);
    key.intensity = 32 * (1 - down);
    rim.intensity = 50 * (1 - down);
    kicker.intensity = 6 * (1 - down);
    cursorLight.intensity = (mobile ? 0 : 10) * (1 - down);
    renderer.toneMappingExposure = lerp(1.1, 0.92, down);
    if (bloom) bloom.strength = lerp(0.24, 0.05, down);
    backPanel.visible = down > 0.02;
    focusTarget.set(0, lerp(0, lerp(0.2, STREAM_TOP - 0.3, sink), smooth(EXPLODE, 0.45, P)), 0);
    if (down > 0) focusTarget.lerp(tmpV.set(0, BOTTLE_Y + 2, 0.6), down);
    const focusDist = camera.position.distanceTo(focusTarget);
    if (bokeh) (bokeh.uniforms as Record<string, { value: number }>).focus.value = focusDist;
    dustMat.uniforms.uFocus.value = focusDist;

    // ---- the bean: turning, then squashed and shuddering, then gone
    if (!drag.on) {
      drag.vx *= Math.pow(0.05, dt);
      drag.vy *= Math.pow(0.05, dt);
      drag.rx += drag.vx;
      drag.ry += drag.vy;
    }
    const crush = smooth(0.13, EXPLODE, P);
    beanPivot.visible = P < EXPLODE + 0.004;
    // a gentle sway that keeps the crease (the most recognisable side) facing us
    beanPivot.rotation.set(drag.rx + Math.sin(time * 0.4) * 0.12, drag.ry + Math.sin(time * 0.32) * 0.55 * (1 - crush), 0);
    const shudder = crush > 0.6 ? (Math.random() - 0.5) * 0.03 * crush : 0;
    beanPivot.scale.set(1 + crush * 0.16 + shudder, 1 - crush * 0.34, 1 + crush * 0.1);
    beanPivot.position.set(shudder, shudder, 0);

    // ---- grounds
    const burst = P >= EXPLODE;
    shards.visible = burst && dissolve < 0.999;
    dust.visible = burst && dissolve < 0.999;
    if (burst) {
      for (let i = 0; i < SHARDS; i++) {
        const pt = shardP[i];
        particleAt(pt, t, vortex, sink, pos);
        // the cursor pushes grounds aside while they hang in the air
        const d = pos.distanceTo(cursor);
        if (d < 0.9) pt.off.addScaledVector(tmpV.subVectors(pos, cursor).normalize(), (0.9 - d) * dt * 5);
        pt.off.multiplyScalar(Math.exp(-dt * 1.2));
        pos.add(pt.off);
        tmpE.set(pt.rot.x + pt.spin.x * t * 0.3, pt.rot.y + pt.spin.y * t * 0.3, pt.rot.z + pt.spin.z * t * 0.3);
        q.setFromEuler(tmpE);
        const s = pt.s * (1 - dissolve) * Math.min(1, 0.3 + t * 2);
        m.compose(pos, q, sc.setScalar(Math.max(s, 0.0001)));
        shards.setMatrixAt(i, m);
      }
      shards.instanceMatrix.needsUpdate = true;
      const du = dustMat.uniforms;
      du.uT.value = t * 0.9;
      du.uVortex.value = vortex;
      du.uSink.value = sink;
      du.uOpacity.value = Math.min(0.9, t * 1.5) * (1 - dissolve);
      du.uCursor.value.copy(cursor);
    }

    // ---- water rains through the grounds and turns to coffee, then streams down
    const rain = smooth(0.42, 0.5, P);
    drops.visible = rain > 0.001 && down < 0.95;
    if (drops.visible) {
      const tw = (P - 0.42) * 14;
      for (let i = 0; i < DROPS; i++) {
        const dp = dropP[i];
        let y = dp.y0 - tw * dp.sp * 0.6;
        const wrap = 9;
        y = ((((y - STREAM_TOP) % wrap) + wrap) % wrap) + STREAM_TOP;
        const ang = dp.a + vortex * 6 + y * 0.6;
        const rad = lerp(Math.hypot(dp.x, dp.z), 0.08, sink) * lerp(1, 0.6, vortex);
        const x = lerp(dp.x, Math.cos(ang) * rad, vortex);
        const z = lerp(dp.z, Math.sin(ang) * rad * 0.7, vortex);
        // above the cloud it's water; coming through it, it's coffee
        const brew = Math.min(1, Math.max(0, (0.8 - y) / 1.6) * vortex + dissolve);
        col.copy(WATER).lerp(COFFEE, brew);
        drops.setColorAt(i, col);
        const s = dp.s * rain * (1 - sink * 0.6);
        m.compose(pos.set(x, y, z), q.identity(), sc.set(s, s * (1 + dp.sp * 0.12), s));
        drops.setMatrixAt(i, m);
      }
      drops.instanceMatrix.needsUpdate = true;
      drops.instanceColor!.needsUpdate = true;
    }

    // the pour: the stream reaches down to the coffee's surface, the bottle
    // fills, then the stream's tail falls in and it's gone
    const FILL_TOP = 3.05;
    const fill = smooth(0.78, 0.92, P);
    const level = 0.1 + fill * (FILL_TOP - 0.1); // bottle-local height of the coffee
    const surfaceY = BOTTLE_Y + level;
    const grow = smooth(0.7, 0.8, P);
    const tail = smooth(0.9, 0.95, P);
    const topY = lerp(STREAM_TOP, surfaceY, tail);
    const bottomY = lerp(STREAM_TOP, surfaceY, grow);
    const streamLen = Math.max(0.0001, topY - bottomY);
    stream.visible = grow > 0.001 && tail < 0.999;
    stream.position.y = topY;
    stream.scale.set(1, streamLen, 1);
    streamTime.value = time;
    const pouring = grow > 0.98 && tail < 0.98;
    loose.visible = pouring;
    if (pouring) {
      for (let i = 0; i < LOOSE; i++) {
        const lp = looseP[i];
        const ph = (time * 0.9 + lp.phase) % 1;
        const y = lerp(STREAM_TOP - 0.4, surfaceY, ph * ph);
        m.compose(pos.set(lp.off * ph, y, lp.z), q.identity(), sc.set(lp.s, lp.s * 1.6, lp.s));
        loose.setMatrixAt(i, m);
      }
      loose.instanceMatrix.needsUpdate = true;
    }
    fillPlane.constant = surfaceY;
    surface.visible = fill > 0.002;
    surface.position.y = level;
    const rIn = innerR(level) * 0.99;
    surface.scale.set(rIn, rIn * flatAt(level), 1);
    rippleTime.value = time;
    rippleAmp.value = lerp(rippleAmp.value, pouring ? 1 : 0, Math.min(1, dt * 3));
    foam.visible = fill > 0.05;
    if (foam.visible) {
      const fz = flatAt(level);
      for (let i = 0; i < FOAM; i++) {
        const f = foamP[i];
        const r = rIn * f.k;
        const swirl = f.a + time * 0.15 * (1 - f.k);
        m.compose(pos.set(Math.cos(swirl) * r, level + f.s * 0.3, Math.sin(swirl) * r * fz), q.identity(), sc.set(f.s, f.s * 0.6, f.s));
        foam.setMatrixAt(i, m);
      }
      foam.instanceMatrix.needsUpdate = true;
    }

    // the hero shot: a three-quarter turn that slowly sways, from a slightly low angle
    bottle.rotation.y = lerp(0, -0.4 + Math.sin(time * 0.22) * 0.22, down);
    const capT = smooth(0.93, 0.99, P);
    cap.position.set(0, lerp(MOUTH + 2.2, MOUTH + 0.18, capT), 0);
    cap.rotation.y = capT * Math.PI * 3;
    cap.visible = P > 0.9;
  };

  // ------------------------------------------------------------- loop ----
  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    composer?.setSize(w, h);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 46 : 32;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  let running = true;
  let raf = 0;
  const clock = new THREE.Clock();
  const tick = () => {
    raf = requestAnimationFrame(tick);
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    step(dt, clock.elapsedTime);
    if (composer) composer.render();
    else {
      // phones: scene, then the powder on top
      renderer.autoClear = true;
      renderer.render(scene, camera);
      renderer.autoClear = false;
      renderer.clearDepth();
      renderer.render(dustScene, camera);
    }
  };
  tick();

  return {
    setProgress: (p, immediate) => {
      progress = Math.min(1, Math.max(0, p));
      if (immediate) shown = progress;
    },
    setRunning: (on) => {
      running = on;
      if (on) clock.getDelta();
    },
    dispose: () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
      });
      env.dispose();
      pmrem.dispose();
      composer?.dispose();
      renderer.dispose();
    },
  };
}
