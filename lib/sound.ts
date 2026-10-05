/**
 * Sound design, synthesised live in the browser (no audio files).
 * Each sound is modelled on how the real one is made:
 *   glass/ice  — clusters of inharmonic "modal" partials with a click transient
 *   liquid     — hundreds of tiny bubble resonances with rising pitch (how pouring really sounds)
 *   crush      — gritty granular cracks through resonant filters over a body thud
 *   cap        — ratchet clicks that speed up, then a seal
 * Everything runs through a soft bar-room reverb and a gentle compressor, and
 * can be panned to where it happens on screen.
 *
 * Muted by default; the visitor's choice is remembered in localStorage.
 */

export type SoundName = "clink" | "pour" | "crunch" | "cap" | "stamp" | "burst" | "drip" | "slosh" | "tick" | "whoosh";
type Opts = { pan?: number; gain?: number };

const KEY = "bb-sound";
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let wet: GainNode | null = null;
let muted = true;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    muted = localStorage.getItem(KEY) !== "on";
  } catch {
    /* private mode: stay muted */
  }
}

export function subscribeSound(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
export function getMuted() {
  load();
  return muted;
}
export function setMuted(next: boolean) {
  load();
  muted = next;
  try {
    localStorage.setItem(KEY, next ? "off" : "on");
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
  if (!next) {
    audio();
    play("clink");
  } else loops.forEach((l) => l.stop());
}

// ------------------------------------------------------------ the rig ----
/** a generated impulse response: a small, warm room */
function roomImpulse(c: AudioContext, seconds = 1.6) {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3.2) * (i < 900 ? i / 900 : 1);
    }
  }
  return buf;
}

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3;
    comp.attack.value = 0.004;
    comp.release.value = 0.2;
    comp.connect(ctx.destination);
    // soft but crisp: gentle level, harshness above ~7 kHz rolled off
    const smooth = ctx.createBiquadFilter();
    smooth.type = "lowpass";
    smooth.frequency.value = 7200;
    smooth.Q.value = 0.5;
    smooth.connect(comp);
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(smooth);
    const verb = ctx.createConvolver();
    verb.buffer = roomImpulse(ctx, 0.9);
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 3200;
    wet = ctx.createGain();
    wet.gain.value = 0.12;
    wet.connect(tone).connect(verb).connect(master);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** an output for one sound: panned, sent dry to the master and wet to the room */
function out(c: AudioContext, o: Opts, reverb = 1) {
  const g = c.createGain();
  g.gain.value = o.gain ?? 1;
  const p = c.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, o.pan ?? 0));
  g.connect(p);
  p.connect(master!);
  const send = c.createGain();
  send.gain.value = reverb;
  p.connect(send).connect(wet!);
  return g;
}

let noiseBuf: AudioBuffer | null = null;
function noise(c: AudioContext) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    // brown noise (warm, no hiss)
    const d = noiseBuf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      d[i] = last * 3.5;
    }
  }
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  return s;
}

const env = (g: GainNode, t: number, peak: number, attack: number, decay: number) => {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
};

// ------------------------------------------------------- the sounds ----
/** glass or ice: a soft, clear "ting" of a few inharmonic partials */
function glass(c: AudioContext, t: number, o: Opts, base: number, ring: number) {
  const dst = out(c, o, 0.8);
  [1, 2.76, 5.4].forEach((r, i) => {
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.value = base * r * (1 + (Math.random() - 0.5) * 0.006);
    const g = c.createGain();
    env(g, t, [0.09, 0.035, 0.012][i], 0.003, ring / (1 + i * 0.9));
    osc.connect(g).connect(dst);
    osc.start(t);
    osc.stop(t + ring + 0.1);
  });
}

/** one bubble: a sine whose pitch rises as it closes (the sound of liquid) */
function bubble(c: AudioContext, t: number, dst: AudioNode, size: number, level: number) {
  const f = 260 / Math.max(0.3, size) + Math.random() * 120;
  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(f, t);
  osc.frequency.exponentialRampToValueAtTime(f * (1.35 + Math.random() * 0.4), t + 0.05 + size * 0.05);
  const g = c.createGain();
  env(g, t, level * 0.6, 0.004, 0.05 + size * 0.07);
  osc.connect(g).connect(dst);
  osc.start(t);
  osc.stop(t + 0.15);
}

function liquid(c: AudioContext, t: number, o: Opts, seconds: number, density: number) {
  const dst = out(c, o, 1);
  // a body of rushing liquid
  const n = noise(c);
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 420;
  bp.Q.value = 0.6;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 1200;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.05, t + 0.2);
  g.gain.setValueAtTime(0.05, t + seconds - 0.4);
  g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  n.connect(bp).connect(lp).connect(g).connect(dst);
  n.start(t, Math.random());
  n.stop(t + seconds + 0.05);
  // and the bubbles that make it sound wet
  const count = Math.floor(seconds * density);
  for (let i = 0; i < count; i++) bubble(c, t + Math.random() * seconds, dst, 0.3 + Math.random() * 0.7, 0.03 + Math.random() * 0.03);
}

function crush(c: AudioContext, t: number, o: Opts) {
  const dst = out(c, o, 0.5);
  const osc = c.createOscillator();
  osc.frequency.setValueAtTime(110, t);
  osc.frequency.exponentialRampToValueAtTime(55, t + 0.15);
  const g = c.createGain();
  env(g, t, 0.22, 0.006, 0.16);
  osc.connect(g).connect(dst);
  osc.start(t);
  osc.stop(t + 0.25);
  // a few crisp cracks, rounded off so nothing scratches
  for (let i = 0; i < 9; i++) {
    const at = t + Math.pow(Math.random(), 1.6) * 0.3;
    const k = c.createOscillator();
    k.type = "triangle";
    k.frequency.value = 900 + Math.random() * 1400;
    const kg = c.createGain();
    env(kg, at, 0.05 + Math.random() * 0.05, 0.0015, 0.012 + Math.random() * 0.012);
    k.connect(kg).connect(dst);
    k.start(at);
    k.stop(at + 0.04);
  }
}

function whoosh(c: AudioContext, t: number, o: Opts, seconds = 1.1) {
  const dst = out(c, o, 1.2);
  const n = noise(c);
  const lp = c.createBiquadFilter();
  lp.type = "bandpass";
  lp.Q.value = 1.2;
  lp.frequency.setValueAtTime(220, t);
  lp.frequency.exponentialRampToValueAtTime(1400, t + seconds * 0.4);
  lp.frequency.exponentialRampToValueAtTime(300, t + seconds);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.12, t + seconds * 0.35);
  g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  n.connect(lp).connect(g).connect(dst);
  n.start(t, Math.random());
  n.stop(t + seconds + 0.05);
}

function burst(c: AudioContext, t: number, o: Opts) {
  crush(c, t, { ...o, gain: (o.gain ?? 1) * 0.8 });
  whoosh(c, t + 0.02, o, 1.4);
  const dst = out(c, o, 0.4);
  const osc = c.createOscillator();
  osc.frequency.setValueAtTime(80, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.4);
  const g = c.createGain();
  env(g, t, 0.25, 0.01, 0.45);
  osc.connect(g).connect(dst);
  osc.start(t);
  osc.stop(t + 0.5);
  // a light patter of grounds settling
  for (let i = 0; i < 18; i++) {
    const at = t + 0.25 + Math.random() * 1.2;
    const k = c.createOscillator();
    k.type = "sine";
    k.frequency.value = 1600 + Math.random() * 1600;
    const kg = c.createGain();
    env(kg, at, 0.012 + Math.random() * 0.015, 0.001, 0.01);
    const p = c.createStereoPanner();
    p.pan.value = Math.random() * 1.6 - 0.8;
    k.connect(kg).connect(p).connect(dst);
    k.start(at);
    k.stop(at + 0.03);
  }
}

function cap(c: AudioContext, t: number, o: Opts) {
  const dst = out(c, o, 0.5);
  let at = t;
  for (let i = 0; i < 7; i++) {
    const k = c.createOscillator();
    k.type = "sine";
    k.frequency.value = 2100 + Math.random() * 200;
    const g = c.createGain();
    env(g, at, 0.045, 0.001, 0.008);
    k.connect(g).connect(dst);
    k.start(at);
    k.stop(at + 0.02);
    at += 0.07 - i * 0.004;
  }
  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(420, at);
  osc.frequency.exponentialRampToValueAtTime(260, at + 0.05);
  const g = c.createGain();
  env(g, at, 0.1, 0.003, 0.07);
  osc.connect(g).connect(dst);
  osc.start(at);
  osc.stop(at + 0.12);
}

function slosh(c: AudioContext, t: number, o: Opts) {
  const dst = out(c, o, 0.9);
  const n = noise(c);
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(180, t);
  lp.frequency.linearRampToValueAtTime(520, t + 0.18);
  lp.frequency.linearRampToValueAtTime(160, t + 0.5);
  const g = c.createGain();
  env(g, t, 0.1, 0.08, 0.42);
  n.connect(lp).connect(g).connect(dst);
  n.start(t, Math.random());
  n.stop(t + 0.6);
  for (let i = 0; i < 4; i++) bubble(c, t + 0.05 + Math.random() * 0.35, dst, 0.6 + Math.random() * 0.4, 0.025);
}

function stamp(c: AudioContext, t: number, o: Opts) {
  const dst = out(c, o, 0.6);
  const osc = c.createOscillator();
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(45, t + 0.25);
  const g = c.createGain();
  env(g, t, 0.28, 0.005, 0.25);
  osc.connect(g).connect(dst);
  osc.start(t);
  osc.stop(t + 0.4);
  const n = noise(c);
  const gg = c.createGain();
  env(gg, t, 0.06, 0.002, 0.05);
  n.connect(gg).connect(dst);
  n.start(t, Math.random());
  n.stop(t + 0.1);
}

function tick(c: AudioContext, t: number, o: Opts) {
  const dst = out(c, o, 0.3);
  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(2200, t);
  osc.frequency.exponentialRampToValueAtTime(1400, t + 0.03);
  const g = c.createGain();
  env(g, t, 0.05, 0.001, 0.04);
  osc.connect(g).connect(dst);
  osc.start(t);
  osc.stop(t + 0.06);
}

export function play(name: SoundName, o: Opts = {}) {
  load();
  if (muted || typeof window === "undefined") return;
  let c: AudioContext;
  try {
    c = audio();
  } catch {
    return;
  }
  const t = c.currentTime + 0.005;
  switch (name) {
    case "clink":
      glass(c, t, o, 1500 + Math.random() * 300, 0.9);
      if (Math.random() < 0.3) glass(c, t + 0.08 + Math.random() * 0.05, { ...o, gain: (o.gain ?? 1) * 0.4 }, 1900 + Math.random() * 300, 0.6);
      break;
    case "pour":
      liquid(c, t, o, 1.8, 40);
      break;
    case "crunch":
      crush(c, t, o);
      break;
    case "burst":
      burst(c, t, o);
      break;
    case "cap":
      cap(c, t, o);
      break;
    case "slosh":
      slosh(c, t, o);
      break;
    case "drip":
      bubble(c, t, out(c, o, 1), 0.5 + Math.random() * 0.4, 0.07);
      break;
    case "whoosh":
      whoosh(c, t, o);
      break;
    case "stamp":
      stamp(c, t, o);
      break;
    case "tick":
      tick(c, t, o);
      break;
  }
}

// ----------------------------------------------- continuous sounds ----
/** a sound that keeps going while you scroll or stir; level 0..1 */
type Loop = { setLevel: (v: number) => void; stop: () => void };
const loops = new Set<Loop>();

export function liquidLoop(): Loop {
  let level = 0;
  let timer = 0;
  let body: { g: GainNode; n: AudioBufferSourceNode } | null = null;
  const ensure = () => {
    if (body || muted) return;
    const c = audio();
    const dst = out(c, {}, 1);
    const n = noise(c);
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 380;
    bp.Q.value = 0.6;
    const g = c.createGain();
    g.gain.value = 0.0001;
    n.connect(bp).connect(g).connect(dst);
    n.start();
    body = { g, n };
    // bubbles at a rate that follows the level
    const tickBubbles = () => {
      timer = window.setTimeout(tickBubbles, 30);
      if (!ctx || muted || level < 0.02) return;
      if (Math.random() < level * 0.5) bubble(ctx, ctx.currentTime + Math.random() * 0.03, dst, 0.4 + Math.random() * 0.6, 0.02 + level * 0.02);
    };
    tickBubbles();
  };
  const loop: Loop = {
    setLevel: (v) => {
      load();
      level = Math.max(0, Math.min(1, v));
      if (muted) return;
      ensure();
      if (body && ctx) body.g.gain.setTargetAtTime(0.0001 + level * 0.04, ctx.currentTime, 0.12);
    },
    stop: () => {
      window.clearTimeout(timer);
      if (body && ctx) {
        body.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05);
        const n = body.n;
        window.setTimeout(() => n.stop(), 300);
      }
      body = null;
      level = 0;
    },
  };
  loops.add(loop);
  return loop;
}

/** pan value (-1..1) for an x position in the window */
export const panAt = (clientX: number) => (typeof window === "undefined" ? 0 : (clientX / window.innerWidth) * 2 - 1);
