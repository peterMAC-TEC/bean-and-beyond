/**
 * Real-time liquid (shared engine for the marbling section and the bottles): a GPU fluid simulation (incompressible Navier–Stokes with
 * vorticity confinement) carrying condensed milk through black coffee, shaded
 * as a glossy liquid surface seen from above. Milk blooms, curls and marbles
 * on its own; the visitor can stir it and pour more.
 *
 * Field layout: dye.r = how much milk is at that point (0 = black coffee).
 *
 * Options let a caller confine the liquid to a shape (`mask`: GLSL that
 * defines `float inside(vec2 uv)`) and give it its own look (`display`).
 * `uniforms` are extra values passed to both, by name.
 */

type Target = { tex: WebGLTexture; fbo: WebGLFramebuffer; w: number; h: number };
type Double = { read: Target; write: Target; swap: () => void; w: number; h: number };

export type Uniform = number | [number, number] | [number, number, number] | [number, number, number, number];

export type FluidOptions = {
  sim?: number;
  dye?: number;
  curl?: number;
  velocityDissipation?: number;
  dyeDissipation?: number;
  /** GLSL declaring any uniforms it needs plus `float inside(vec2 uv)` (1 = liquid, 0 = wall/air) */
  mask?: string;
  /** a full fragment shader (use `head` conventions: vUv, out o; uniforms uDye, texel, aspect, time) */
  display?: string;
  alpha?: boolean;
};

export type Fluid = {
  /** extra uniforms for the mask and display shaders */
  uniforms: Record<string, Uniform>;
  /** add milk and/or push the liquid. x,y in 0..1 (y up), dx,dy in px-ish units */
  splat: (x: number, y: number, dx: number, dy: number, milk: number, radius?: number) => void;
  /** spin the whole surface around a point (a swirl) */
  vortex: (x: number, y: number, strength: number) => void;
  /** wipe the milk away (back to black coffee) */
  reset: () => void;
  setRunning: (on: boolean) => void;
  dispose: () => void;
};

const VERT = `#version 300 es
precision highp float;
in vec2 aPos;
uniform vec2 texel;
out vec2 vUv, vL, vR, vT, vB;
void main(){
  vUv = aPos * 0.5 + 0.5;
  vL = vUv - vec2(texel.x, 0.0); vR = vUv + vec2(texel.x, 0.0);
  vT = vUv + vec2(0.0, texel.y); vB = vUv - vec2(0.0, texel.y);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

export const head = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv, vL, vR, vT, vB;
out vec4 o;
`;

const SPLAT = head + `
uniform sampler2D uTarget; uniform float aspect; uniform vec3 color; uniform vec2 point; uniform float radius;
void main(){
  vec2 p = vUv - point; p.x *= aspect;
  vec3 s = exp(-dot(p, p) / radius) * color;
  o = vec4(texture(uTarget, vUv).xyz + s, 1.0);
}`;

const VORTEX = head + `
uniform sampler2D uTarget; uniform float aspect; uniform vec2 point; uniform float strength;
void main(){
  vec2 p = vUv - point; p.x *= aspect;
  float d = length(p);
  vec2 t = vec2(-p.y, p.x) * strength * exp(-d * d / 0.08);
  o = vec4(texture(uTarget, vUv).xy + t, 0.0, 1.0);
}`;

const ADVECT = head + `
uniform sampler2D uVelocity, uSource; uniform vec2 texel; uniform float dt, dissipation;
void main(){
  vec2 coord = vUv - dt * texture(uVelocity, vUv).xy * texel;
  o = texture(uSource, coord) / (1.0 + dissipation * dt);
}`;

const DIVERGENCE = head + `
uniform sampler2D uVelocity;
void main(){
  float L = texture(uVelocity, vL).x, R = texture(uVelocity, vR).x;
  float T = texture(uVelocity, vT).y, B = texture(uVelocity, vB).y;
  vec2 C = texture(uVelocity, vUv).xy;
  if (vL.x < 0.0) L = -C.x; if (vR.x > 1.0) R = -C.x;
  if (vT.y > 1.0) T = -C.y; if (vB.y < 0.0) B = -C.y;
  o = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`;

const CURL = head + `
uniform sampler2D uVelocity;
void main(){
  float L = texture(uVelocity, vL).y, R = texture(uVelocity, vR).y;
  float T = texture(uVelocity, vT).x, B = texture(uVelocity, vB).x;
  o = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`;

const VORTICITY = head + `
uniform sampler2D uVelocity, uCurl; uniform float curl, dt;
void main(){
  float L = texture(uCurl, vL).x, R = texture(uCurl, vR).x;
  float T = texture(uCurl, vT).x, B = texture(uCurl, vB).x, C = texture(uCurl, vUv).x;
  vec2 f = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  f /= length(f) + 0.0001; f *= curl * C; f.y *= -1.0;
  vec2 v = texture(uVelocity, vUv).xy + f * dt;
  o = vec4(clamp(v, -1000.0, 1000.0), 0.0, 1.0);
}`;

const PRESSURE = head + `
uniform sampler2D uPressure, uDivergence;
void main(){
  float L = texture(uPressure, vL).x, R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x, B = texture(uPressure, vB).x;
  float d = texture(uDivergence, vUv).x;
  o = vec4((L + R + B + T - d) * 0.25, 0.0, 0.0, 1.0);
}`;

const GRADIENT = head + `
uniform sampler2D uPressure, uVelocity;
void main(){
  float L = texture(uPressure, vL).x, R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x, B = texture(uPressure, vB).x;
  vec2 v = texture(uVelocity, vUv).xy - vec2(R - L, T - B);
  o = vec4(v, 0.0, 1.0);
}`;

const SCALE = head + `
uniform sampler2D uTex; uniform float value;
void main(){ o = value * texture(uTex, vUv); }`;

// The look: coffee → caramel → cream by milk amount, lit as a glossy surface
// whose height follows the milk, with a soft window reflection and grain.
export const MARBLE_DISPLAY = head + `
uniform sampler2D uDye; uniform vec2 texel; uniform float aspect, time;
float h(vec2 uv){ return texture(uDye, uv).r; }
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){
  float m = clamp(h(vUv), 0.0, 1.4);
  vec3 coffee = vec3(0.045, 0.022, 0.010);
  vec3 deep = vec3(0.13, 0.065, 0.028);
  vec3 caramel = vec3(0.55, 0.32, 0.15);
  vec3 cream = vec3(0.96, 0.90, 0.78);
  // thin milk stays dark so the cream ribbons pop (that's the marbling)
  vec3 col = mix(coffee, deep, smoothstep(0.03, 0.2, m));
  col = mix(col, caramel, smoothstep(0.18, 0.55, m));
  col = mix(col, cream, smoothstep(0.5, 1.0, m));

  // surface normal from the milk "height"
  vec2 e = texel * 1.5;
  float dx = h(vUv + vec2(e.x, 0.0)) - h(vUv - vec2(e.x, 0.0));
  float dy = h(vUv + vec2(0.0, e.y)) - h(vUv - vec2(0.0, e.y));
  vec3 n = normalize(vec3(-dx * 3.0, -dy * 3.0, 1.0));
  vec3 L = normalize(vec3(-0.35, 0.55, 0.9));
  float diff = clamp(dot(n, L), 0.0, 1.0);
  vec3 V = vec3(0.0, 0.0, 1.0);
  float spec = pow(max(dot(reflect(-L, n), V), 0.0), 90.0);
  col *= 0.78 + 0.32 * diff;
  col += vec3(1.0, 0.95, 0.85) * spec * 0.7;

  // a soft window reflection sliding across the liquid, bent by the surface
  vec2 p = vUv; p.x *= aspect;
  float band = smoothstep(0.18, 0.0, abs(p.x * 0.55 + p.y * 0.85 - 0.95 + n.x * 0.25 + n.y * 0.25));
  col += vec3(1.0, 0.92, 0.8) * band * 0.06;

  // dark rim like the inside edge of a glass, and fine grain
  vec2 q = vUv - 0.5; q.x *= aspect;
  col *= smoothstep(0.95, 0.25, length(q));
  col += (hash(vUv * 900.0 + time) - 0.5) * 0.015;
  o = vec4(pow(col, vec3(1.0 / 2.2)), 1.0);
}`;

const MASK = (src: string) => head + src + `
uniform sampler2D uTex;
void main(){ o = texture(uTex, vUv) * inside(vUv); }`;

export function createFluid(canvas: HTMLCanvasElement, opts: FluidOptions = {}): Fluid | null {
  const gl = canvas.getContext("webgl2", { alpha: !!opts.alpha, premultipliedAlpha: false, antialias: false, preserveDrawingBuffer: false });
  if (!gl) return null;
  if (!gl.getExtension("EXT_color_buffer_float")) return null;
  gl.getExtension("OES_texture_float_linear");

  const mobile = window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
  const SIM = opts.sim ?? (mobile ? 112 : 160);
  const DYE = opts.dye ?? (mobile ? 640 : 1280);
  const P = {
    velocityDissipation: opts.velocityDissipation ?? 0.22,
    dyeDissipation: opts.dyeDissipation ?? 0.025,
    pressureIters: 24,
    curl: opts.curl ?? 30,
  };
  const extra: Record<string, Uniform> = {};

  // ---------- programs ----------
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
    return s;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const program = (frag: string) => {
    const p = gl.createProgram()!;
    gl.attachShader(p, vs);
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, frag));
    gl.bindAttribLocation(p, 0, "aPos");
    gl.linkProgram(p);
    const u: Record<string, WebGLUniformLocation | null> = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const name = gl.getActiveUniform(p, i)!.name;
      u[name] = gl.getUniformLocation(p, name);
    }
    return { p, u };
  };
  const prog = {
    splat: program(SPLAT),
    vortex: program(VORTEX),
    advect: program(ADVECT),
    divergence: program(DIVERGENCE),
    curl: program(CURL),
    vorticity: program(VORTICITY),
    pressure: program(PRESSURE),
    gradient: program(GRADIENT),
    scale: program(SCALE),
    display: program(opts.display ?? MARBLE_DISPLAY),
    mask: opts.mask ? program(MASK(opts.mask)) : null,
  };

  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  // ---------- render targets ----------
  const target = (w: number, h: number, internal: number, format: number): Target => {
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, gl.HALF_FLOAT, null);
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fbo, w, h };
  };
  const double = (w: number, h: number, internal: number, format: number): Double => {
    const d = { read: target(w, h, internal, format), write: target(w, h, internal, format), w, h, swap: () => {} };
    d.swap = () => ([d.read, d.write] = [d.write, d.read]);
    return d;
  };
  const size = (res: number) => {
    const a = canvas.width / canvas.height || 1;
    return (a > 1 ? [Math.round(res * a), res] : [res, Math.round(res / a)]).map((v) => Math.max(1, v));
  };

  let velocity: Double, dye: Double, pressure: Double, divergence: Target, curl: Target;
  const allocate = () => {
    const [sw, sh] = size(SIM);
    const [dw, dh] = size(DYE);
    velocity = double(sw, sh, gl.RG16F, gl.RG);
    pressure = double(sw, sh, gl.R16F, gl.RED);
    divergence = target(sw, sh, gl.R16F, gl.RED);
    curl = target(sw, sh, gl.R16F, gl.RED);
    dye = double(dw, dh, gl.RGBA16F, gl.RGBA);
  };

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (!w || !h || (w === canvas.width && h === canvas.height)) return;
    canvas.width = w;
    canvas.height = h;
    allocate();
  };
  canvas.width = Math.max(1, canvas.clientWidth);
  canvas.height = Math.max(1, canvas.clientHeight);
  allocate();
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  // ---------- passes ----------
  const draw = (t: Target | null) => {
    if (t) {
      gl.viewport(0, 0, t.w, t.h);
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
    } else {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  const bind = (unit: number, t: Target) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t.tex);
    return unit;
  };
  const activate = (p: { p: WebGLProgram; u: Record<string, WebGLUniformLocation | null> }, w: number, h: number) => {
    gl.useProgram(p.p);
    const u = p.u;
    if (u.texel) gl.uniform2f(u.texel, 1 / w, 1 / h);
    if (u.aspect) gl.uniform1f(u.aspect, canvas.width / canvas.height);
    for (const k in extra) {
      const loc = u[k];
      if (!loc) continue;
      const v = extra[k];
      if (typeof v === "number") gl.uniform1f(loc, v);
      else if (v.length === 2) gl.uniform2f(loc, v[0], v[1]);
      else if (v.length === 3) gl.uniform3f(loc, v[0], v[1], v[2]);
      else gl.uniform4f(loc, v[0], v[1], v[2], v[3]);
    }
    return u;
  };

  const splatInto = (d: Double, x: number, y: number, c: [number, number, number], radius: number) => {
    const u = activate(prog.splat, d.w, d.h);
    gl.uniform1i(u.uTarget, bind(0, d.read));
    gl.uniform1f(u.aspect, canvas.width / canvas.height);
    gl.uniform2f(u.point, x, y);
    gl.uniform3f(u.color, c[0], c[1], c[2]);
    gl.uniform1f(u.radius, radius / 100);
    draw(d.write);
    d.swap();
  };

  const applyMask = (d: Double) => {
    if (!prog.mask) return;
    const u = activate(prog.mask, d.w, d.h);
    gl.uniform1i(u.uTex, bind(0, d.read));
    draw(d.write);
    d.swap();
  };

  const step = (dt: number) => {
    gl.disable(gl.BLEND);
    let u = activate(prog.curl, velocity.w, velocity.h);
    gl.uniform1i(u.uVelocity, bind(0, velocity.read));
    draw(curl);

    u = activate(prog.vorticity, velocity.w, velocity.h);
    gl.uniform1i(u.uVelocity, bind(0, velocity.read));
    gl.uniform1i(u.uCurl, bind(1, curl));
    gl.uniform1f(u.curl, P.curl);
    gl.uniform1f(u.dt, dt);
    draw(velocity.write);
    velocity.swap();

    u = activate(prog.divergence, velocity.w, velocity.h);
    gl.uniform1i(u.uVelocity, bind(0, velocity.read));
    draw(divergence);

    u = activate(prog.scale, pressure.w, pressure.h);
    gl.uniform1i(u.uTex, bind(0, pressure.read));
    gl.uniform1f(u.value, 0.8);
    draw(pressure.write);
    pressure.swap();

    u = activate(prog.pressure, pressure.w, pressure.h);
    gl.uniform1i(u.uDivergence, bind(0, divergence));
    for (let i = 0; i < P.pressureIters; i++) {
      gl.uniform1i(u.uPressure, bind(1, pressure.read));
      draw(pressure.write);
      pressure.swap();
    }

    u = activate(prog.gradient, velocity.w, velocity.h);
    gl.uniform1i(u.uPressure, bind(0, pressure.read));
    gl.uniform1i(u.uVelocity, bind(1, velocity.read));
    draw(velocity.write);
    velocity.swap();

    u = activate(prog.advect, velocity.w, velocity.h);
    gl.uniform1i(u.uVelocity, bind(0, velocity.read));
    gl.uniform1i(u.uSource, bind(0, velocity.read));
    gl.uniform1f(u.dt, dt);
    gl.uniform1f(u.dissipation, P.velocityDissipation);
    draw(velocity.write);
    velocity.swap();
    applyMask(velocity);

    u = activate(prog.advect, velocity.w, velocity.h);
    gl.uniform1i(u.uVelocity, bind(0, velocity.read));
    gl.uniform1i(u.uSource, bind(1, dye.read));
    gl.uniform1f(u.dissipation, P.dyeDissipation);
    draw(dye.write);
    dye.swap();
    applyMask(dye);
  };

  const render = (t: number) => {
    const u = activate(prog.display, dye.w, dye.h);
    gl.uniform1i(u.uDye, bind(0, dye.read));
    gl.uniform1f(u.aspect, canvas.width / canvas.height);
    gl.uniform1f(u.time, t);
    draw(null);
  };

  // ---------- loop ----------
  let running = true;
  let raf = 0;
  let last = performance.now();
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    step(dt);
    render(now / 1000);
  };
  raf = requestAnimationFrame(loop);

  return {
    uniforms: extra,
    splat: (x, y, dx, dy, milk, radius = 0.25) => {
      splatInto(velocity, x, y, [dx, dy, 0], radius);
      if (milk > 0) splatInto(dye, x, y, [milk, 0, 0], radius * 0.9);
    },
    vortex: (x, y, strength) => {
      const u = activate(prog.vortex, velocity.w, velocity.h);
      gl.uniform1i(u.uTarget, bind(0, velocity.read));
      gl.uniform1f(u.aspect, canvas.width / canvas.height);
      gl.uniform2f(u.point, x, y);
      gl.uniform1f(u.strength, strength);
      draw(velocity.write);
      velocity.swap();
    },
    reset: () => {
      for (const t of [dye.read, dye.write, velocity.read, velocity.write]) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
    },
    setRunning: (on) => {
      running = on;
      last = performance.now();
    },
    dispose: () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
