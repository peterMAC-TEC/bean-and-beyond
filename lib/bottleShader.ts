/**
 * GLSL for the live-liquid bottle (used with createFluid from ./fluid).
 *
 * The bottle is drawn from a signed-distance shape of the real flask:
 * a flat-shouldered body, domed shoulders, a short neck and a screw cap.
 * The fluid simulation is confined to the liquid inside it (MASK), and
 * DISPLAY paints the scene: bar backdrop, emerald glass, the marbling
 * coffee, highlights, condensation, foam line, cap and a floor reflection.
 *
 * Shared uniforms (set from JS via fluid.uniforms):
 *   uBottle  vec4  base centre x, base y (0..1 of the canvas), height (share of canvas height), tilt angle
 *   uSurf    vec3  liquid level (bottle heights, world-up), wave amplitude, wave phase
 *   uLight   vec2  cursor position (0..1) — a light that follows it
 *   uStream  vec2  milk stream: thickness 0..1, wobble phase
 *   uCoffee, uCaramel, uMilk  vec3  liquid colours (linear)
 *   uBg      float 0 = bar scene, 1 = card panel, 2 = no backdrop (transparent canvas, e.g. in the crate)
 */
import { head } from "./fluid";

export const SHAPE = /* glsl */ `
uniform vec4 uBottle;
uniform vec3 uSurf;
uniform float aspect;
float sdRoundBox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
float smin(float a, float b, float k){ float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
vec2 rot(vec2 p, float a){ float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }
// canvas uv -> bottle space, world-aligned (units = bottle heights, origin = base centre)
vec2 rel(vec2 uv){ vec2 p = uv - uBottle.xy; p.x *= aspect; return p / uBottle.z; }
// glass outline of the flask, in the bottle's own (tilted) space
float glassSD(vec2 p){
  float body = sdRoundBox(p - vec2(0.0, 0.30), vec2(0.2, 0.30), 0.05);
  float dome = length(vec2(p.x, (p.y - 0.6) * 1.18)) - 0.2;
  float neck = sdRoundBox(p - vec2(0.0, 0.835), vec2(0.066, 0.08), 0.01);
  float d = smin(min(body, dome), neck, 0.07);
  float lip = sdRoundBox(p - vec2(0.0, 0.905), vec2(0.076, 0.012), 0.006);
  return min(d, lip);
}
float capSD(vec2 p){ return sdRoundBox(p - vec2(0.0, 0.962), vec2(0.084, 0.052), 0.012); }
float surfaceY(float x){ return uSurf.x + uSurf.y * sin(x * 16.0 + uSurf.z) + uSurf.y * 0.5 * sin(x * 31.0 - uSurf.z * 1.7); }
float liquidAt(vec2 uv){
  vec2 r = rel(uv);
  vec2 p = rot(r, -uBottle.w);
  float inner = smoothstep(-0.008, -0.022, glassSD(p));
  float below = smoothstep(0.004, -0.004, r.y - surfaceY(r.x));
  return inner * below;
}
`;

export const MASK = SHAPE + `
float inside(vec2 uv){ return liquidAt(uv); }
`;

export const DISPLAY =
  head +
  SHAPE +
  /* glsl */ `
uniform sampler2D uDye;
uniform vec2 texel;
uniform float time;
uniform vec2 uLight;
uniform vec2 uStream;
uniform vec3 uCoffee, uCaramel, uMilk;
uniform float uBg;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 hash2(vec2 p){ return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }

vec3 background(vec2 uv){
  vec2 r = rel(uv);
  vec3 col;
  if (uBg > 0.5) {
    // card panel: dark leather-brown with a soft glow behind the bottle
    col = vec3(0.0065, 0.0048, 0.0034);
    col += uCaramel * 0.09 * exp(-dot(r - vec2(0.0, 0.5), r - vec2(0.0, 0.5)) * 3.5);
    // the back wall: a faint plaster mottle
    col *= 0.9 + 0.1 * sin(r.x * 7.0 + sin(r.y * 5.0) * 2.0) * sin(r.y * 6.0 - r.x * 3.0);
    if (r.y < 0.0) {
      // a dark walnut bar top the bottle stands on: grain running across, tightening toward the back
      float v = -r.y;
      float lines = pow(v, 0.65) * 150.0 + 3.0 * sin(r.x * 5.0 + v * 18.0) + 1.5 * sin(r.x * 13.0 - v * 40.0);
      float grain = 0.55 + 0.45 * sin(lines) * (0.6 + 0.4 * hash(vec2(floor(lines / 3.14159), 7.0)));
      vec3 wood = mix(vec3(0.0075, 0.0042, 0.0024), vec3(0.019, 0.0105, 0.0055), grain);
      wood += uCaramel * 0.11 * exp(-pow(r.x / 0.42, 2.0) - pow(v / 0.1, 2.0)); // the pool of light under the bottle
      wood += vec3(0.05, 0.036, 0.022) * exp(-pow(v / 0.0035, 2.0)) * smoothstep(1.2, 0.0, abs(r.x)); // the far edge catching light
      col = mix(col, wood, smoothstep(0.0, -0.006, r.y));
    } else col *= 1.0 - 0.2 * exp(-r.y / 0.08); // the wall just above the counter sits in shadow
    return col;
  }
  // the bar: warm haze, a spotlight cone, a black polished counter
  col = vec3(0.0034, 0.0027, 0.0021);
  col += vec3(0.05, 0.028, 0.012) * exp(-dot(r - vec2(0.0, 0.55), r - vec2(0.0, 0.55)) * 1.6);
  float cone = smoothstep(0.08, 0.0, abs(r.x) - (1.6 - r.y) * 0.22) * smoothstep(-0.05, 0.4, r.y);
  col += vec3(0.07, 0.055, 0.04) * cone * smoothstep(1.7, 0.4, r.y);
  // out-of-focus bar lights
  for (int i = 0; i < 12; i++) {
    vec2 h = hash2(vec2(float(i), 3.7));
    vec2 c = vec2((h.x - 0.5) * 3.2, 0.55 + h.y * 0.75);
    float s = 0.035 + 0.07 * hash(vec2(float(i), 9.1));
    float b = smoothstep(s, s * 0.82, length(r - c));
    vec3 tint = mix(vec3(1.0, 0.55, 0.2), vec3(1.0, 0.82, 0.5), hash(vec2(float(i), 1.3)));
    col += tint * b * 0.035 * (0.6 + 0.4 * sin(time * 0.6 + float(i)));
  }
  // dust drifting up through the beam
  vec2 g = vec2(r.x * 34.0, r.y * 34.0 - time * 0.9);
  vec2 cell = floor(g);
  vec2 pt = hash2(cell);
  float dust = smoothstep(0.06, 0.0, length(fract(g) - pt)) * step(0.82, hash(cell + 7.0));
  col += vec3(1.0, 0.9, 0.75) * dust * cone * 0.5;
  // counter
  if (r.y < 0.0) {
    col = mix(col, vec3(0.0022, 0.0018, 0.0014), smoothstep(0.0, -0.02, r.y));
    col += vec3(0.08, 0.06, 0.04) * exp(-pow(r.x / 0.5, 2.0) - pow(r.y / 0.07, 2.0)); // pool of light
    col += vec3(0.05, 0.04, 0.03) * exp(-pow(r.y / 0.003, 2.0)) * smoothstep(1.4, 0.0, abs(r.x)); // edge sheen
  }
  return col;
}

vec3 liquidColour(float m){
  vec3 deep = mix(uCoffee, uCaramel, 0.18);
  vec3 col = mix(uCoffee, deep, smoothstep(0.03, 0.2, m));
  col = mix(col, uCaramel, smoothstep(0.18, 0.55, m));
  return mix(col, uMilk, smoothstep(0.5, 1.0, m));
}

// condensation: little lens-like droplets that catch the light
float droplets(vec2 p, out float shade){
  vec2 g = p * vec2(36.0, 36.0);
  vec2 cell = floor(g);
  float spec = 0.0;
  shade = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 c = cell + vec2(float(x), float(y));
    vec2 h = hash2(c);
    if (h.x > 0.38) continue;
    vec2 centre = c + h;
    float rad = 0.1 + 0.28 * pow(hash(c + 4.0), 2.5);
    float d = length(g - centre);
    if (d < rad) {
      shade = max(shade, 1.0 - d / rad);
      spec = max(spec, smoothstep(rad * 0.45, 0.0, length(g - centre - vec2(-0.3, 0.32) * rad)));
    }
  }
  return spec;
}

// lay colour c over (col, a) with coverage k (with a = 1 this is just mix)
void over(inout vec3 col, inout float a, vec3 c, float k){
  float na = k + a * (1.0 - k);
  col = (c * k + col * a * (1.0 - k)) / max(na, 1e-4);
  a = na;
}

void main(){
  vec2 r = rel(vUv);
  vec2 p = rot(r, -uBottle.w);
  float d = glassSD(p);
  float dc = capSD(p);
  bool clear = uBg > 1.5;
  vec3 col = clear ? vec3(0.0) : background(vUv);
  float alpha = clear ? 0.0 : 1.0;

  // reflection in the counter and a contact shadow
  if (r.y < 0.0 && !clear) {
    vec2 pm = rot(vec2(r.x, -r.y), -uBottle.w);
    float dm = glassSD(pm);
    float refl = smoothstep(0.0, -0.004, dm) * exp(r.y * 7.0);
    vec3 mirror = mix(vec3(0.01, 0.04, 0.02), liquidColour(texture(uDye, vec2(vUv.x, 2.0 * uBottle.y - vUv.y)).r) * 0.5, smoothstep(-0.02, -0.04, dm));
    col = mix(col, mirror, refl * (uBg > 0.5 ? 0.25 : 0.4));
    col *= 1.0 - 0.6 * exp(-pow(r.x / 0.26, 2.0) - pow(r.y / 0.03, 2.0));
  }

  vec2 lp = rot(rel(uLight), -uBottle.w);
  float lshift = clamp(lp.x, -1.0, 1.0) * 0.03;

  // ---------------------------------------------------------------- glass
  if (d < 0.002) {
    float depth = max(-d, 0.0);
    vec2 e = vec2(0.002, 0.0);
    vec2 grad = normalize(vec2(glassSD(p + e.xy) - glassSD(p - e.xy), glassSD(p + e.yx) - glassSD(p - e.yx)) + 1e-5);
    float edge = 1.0 - smoothstep(0.0, 0.07, depth);
    // refraction: the liquid bends inward near the curved walls
    vec2 off = rot(grad, uBottle.w) * edge * edge * 0.035 * uBottle.z;
    off.x /= aspect;
    vec2 ruv = vUv + off;

    float m = texture(uDye, ruv).r;
    vec2 tx = texel * 1.5;
    float mdx = texture(uDye, ruv + vec2(tx.x, 0.0)).r - texture(uDye, ruv - vec2(tx.x, 0.0)).r;
    float mdy = texture(uDye, ruv + vec2(0.0, tx.y)).r - texture(uDye, ruv - vec2(0.0, tx.y)).r;
    vec3 n = normalize(vec3(-mdx * 3.0, -mdy * 3.0, 1.0));
    vec3 L = normalize(vec3(-0.35, 0.55, 0.9));
    vec3 liq = liquidColour(m) * (0.8 + 0.3 * clamp(dot(n, L), 0.0, 1.0));
    liq += vec3(1.0, 0.95, 0.85) * pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 80.0) * 0.5;

    float wet = liquidAt(ruv);
    vec3 empty = (clear ? vec3(0.006, 0.005, 0.004) : background(ruv)) * vec3(0.35, 0.9, 0.5) + vec3(0.0008, 0.006, 0.0025);
    vec3 inner = mix(empty, liq * vec3(0.78, 1.0, 0.8), wet);

    // milk stream pouring in through the neck
    float sy = surfaceY(r.x);
    float wob = sin(p.y * 40.0 + uStream.y) * 0.004;
    float stream = uStream.x * smoothstep(0.012 * uStream.x, 0.0, abs(p.x - wob)) * step(sy, r.y) * step(p.y, 0.91);
    inner = mix(inner, uMilk * (0.85 + 0.25 * sin(p.y * 90.0 + uStream.y * 3.0)), stream);

    // foam line on the surface
    float foam = exp(-abs(r.y - sy) / 0.006) * smoothstep(-0.01, -0.03, d) * (0.75 + 0.25 * sin(p.x * 140.0 + uSurf.z));
    inner += mix(vec3(0.12, 0.07, 0.035), uCaramel * 0.5, 0.5) * foam * 0.6;

    // emerald glass: thicker (darker) toward the walls
    vec3 glassTint = vec3(0.003, 0.03, 0.011);
    inner = mix(inner, glassTint, edge * 0.55);
    // the green shows most where the glass is seen edge-on
    inner += vec3(0.0, 0.035, 0.012) * edge * edge;

    // highlights: rim, vertical streaks, shoulder arc, neck, a glint that follows the cursor
    float rim = exp(-depth / 0.003);
    float body = smoothstep(0.04, 0.12, p.y) * smoothstep(0.62, 0.5, p.y);
    float streak = exp(-pow((p.x + 0.13 - lshift) / 0.016, 2.0)) * body;
    float streakFine = exp(-pow((p.x + 0.1 - lshift) / 0.004, 2.0)) * body;
    float streakR = exp(-pow((p.x - 0.155 - lshift * 0.5) / 0.007, 2.0)) * body;
    float shoulder = exp(-pow((length(vec2(p.x, (p.y - 0.6) * 1.18)) - 0.17) / 0.012, 2.0)) * step(0.6, p.y) * smoothstep(0.08, -0.14, p.x);
    float neckHl = exp(-pow((p.x + 0.036) / 0.009, 2.0)) * step(0.68, p.y) * step(p.y, 0.9);
    vec2 gpos = vec2(clamp(lp.x, -0.16, 0.16), clamp(lp.y, 0.06, 0.86));
    float glint = exp(-pow(length(p - gpos) / 0.07, 2.0));
    float shadeD;
    float drop = droplets(p, shadeD) * step(0.02, p.y) * step(p.y, 0.88);
    vec3 hl = vec3(1.0, 0.97, 0.9);
    inner *= 1.0 - shadeD * 0.18;
    inner += hl * (rim * 0.35 + streak * 0.42 + streakFine * 0.5 + streakR * 0.3 + shoulder * 0.45 + neckHl * 0.35 + glint * 0.18 + drop * 0.2);

    // with no backdrop the empty glass is see-through, the liquid is not
    over(col, alpha, inner, smoothstep(0.002, -0.002, d) * (clear ? mix(0.62, 1.0, max(wet, edge * 0.8)) : 1.0));
  }

  // ------------------------------------------------------------------ cap
  if (dc < 0.003) {
    float cx = clamp(p.x / 0.084, -1.0, 1.0);
    float cyl = sqrt(max(0.0, 1.0 - cx * cx));
    float lum = 0.18 + 0.55 * cyl + 0.25 * sin(cx * 5.0 - 1.4 - lshift * 20.0);
    vec3 metal = mix(vec3(0.08, 0.085, 0.09), vec3(0.85, 0.87, 0.9), clamp(lum, 0.0, 1.0));
    float knurl = 0.5 + 0.5 * sin(cx * 3.14159 * 26.0);
    metal *= mix(0.78 + 0.22 * knurl, 1.0, step(0.982, p.y));
    metal *= 1.0 - 0.35 * exp(-pow((p.y - 0.985) / 0.0025, 2.0)) - 0.3 * exp(-pow((p.y - 0.995) / 0.0025, 2.0));
    metal += vec3(1.0) * 0.5 * exp(-pow((cx + 0.4 - lshift * 12.0) / 0.1, 2.0)) * cyl;
    metal *= 0.7 + 0.3 * smoothstep(0.91, 0.93, p.y);
    over(col, alpha, metal, smoothstep(0.003, -0.002, dc));
  }

  // finish: vignette and grain
  vec2 q = vUv - 0.5; q.x *= aspect;
  if (!clear) col *= mix(1.0, smoothstep(1.25, 0.3, length(q)), uBg > 0.5 ? 0.4 : 1.0);
  col = pow(col, vec3(1.0 / 2.2));
  col += (hash(vUv * 1000.0 + time) - 0.5) * 0.02;
  o = vec4(col, alpha);
}
`;

/** sRGB hex -> linear rgb, for the colour uniforms */
export function lin(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  const c = (v: number) => Math.pow(v / 255, 2.2);
  return [c((n >> 16) & 255), c((n >> 8) & 255), c(n & 255)];
}
