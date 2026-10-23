// ---------------------------------------------------------------------------
// Deterministic audio generator (no third-party deps).
// Produces a 30s cyber-techno music bed + 4 SFX clips as 48kHz/16-bit WAV.
// Everything is seeded -> the same bytes every run, frame-synced in Remotion.
//
// Design order (per the brief): FIRST fix the picture action beats, THEN place
// music + SFX on them. SFX landing frames live in src/timeline.ts (AUDIO_CUES).
// ---------------------------------------------------------------------------
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "..", "public", "audio");
mkdirSync(OUT, { recursive: true });

const SR = 48000;

// seeded PRNG (mulberry32) — identical output on every machine, every run.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- WAV encoder (16-bit PCM, stereo) --------------------------------------
function encodeWav(L, R) {
  const n = L.length;
  const dataSize = n * 4; // 2ch * 2 bytes
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(2, 22); // stereo
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28); // byte rate
  buf.writeUInt16LE(4, 32); // block align
  buf.writeUInt16LE(16, 34); // bits
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  let o = 44;
  for (let i = 0; i < n; i++) {
    let l = Math.max(-1, Math.min(1, L[i]));
    let r = Math.max(-1, Math.min(1, R[i]));
    buf.writeInt16LE((l * 32767) | 0, o);
    buf.writeInt16LE((r * 32767) | 0, o + 2);
    o += 4;
  }
  return buf;
}

function normalize(L, R, peak = 0.95) {
  let max = 0;
  for (let i = 0; i < L.length; i++) {
    max = Math.max(max, Math.abs(L[i]), Math.abs(R[i]));
  }
  if (max > 0) {
    const g = peak / max;
    for (let i = 0; i < L.length; i++) {
      L[i] *= g;
      R[i] *= g;
    }
  }
}

// --- additive helpers ------------------------------------------------------
function addTone(L, R, start, dur, freq, gain, type, pan) {
  const n0 = Math.floor(start * SR);
  const len = Math.floor(dur * SR);
  const panL = pan < 0 ? 1 : 1 - Math.abs(pan);
  const panR = pan > 0 ? 1 : 1 - Math.abs(pan);
  for (let i = 0; i < len; i++) {
    const p = i / len;
    const t = (n0 + i) / SR;
    let env, s;
    if (type === "kick") {
      env = Math.exp(-p * 6);
      const f = freq * Math.pow(0.4, p);
      s = Math.sin(2 * Math.PI * f * t);
    } else if (type === "pluck") {
      env = Math.exp(-p * 8);
      s = Math.sin(2 * Math.PI * freq * t);
    } else if (type === "saw") {
      env = Math.exp(-p * 4);
      s = 2 * ((freq * t) % 1) - 1;
    } else if (type === "pad") {
      const a = 0.15, r = 0.4;
      env = p < a ? p / a : p > 1 - r ? (1 - p) / r : 1;
      s = Math.sin(2 * Math.PI * freq * t);
    } else {
      env = Math.exp(-p * 4);
      s = Math.sin(2 * Math.PI * freq * t);
    }
    const g = gain * env;
    const idx = n0 + i;
    if (idx < L.length) {
      L[idx] += g * panL * s;
      R[idx] += g * panR * s;
    }
  }
}

function addNoise(L, R, start, dur, gain, hp) {
  const rng = mulberry32(99 + Math.floor(start * 1000));
  const n0 = Math.floor(start * SR);
  const len = Math.floor(dur * SR);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const p = i / len;
    const env = Math.exp(-p * 10);
    let w = rng() * 2 - 1;
    if (hp) {
      const h = w - last;
      last = w;
      w = h;
    }
    const g = gain * env;
    const idx = n0 + i;
    if (idx < L.length) {
      L[idx] += g * w;
      R[idx] += g * w;
    }
  }
}

// --- 30s music bed --------------------------------------------------------
function makeMusic() {
  const N = 30 * SR;
  const L = new Float32Array(N);
  const R = new Float32Array(N);
  const beat = 0.5; // 120 BPM
  const DUR = 30;
  const steps = Math.floor(DUR / 0.25); // eighth notes

  // kick on every beat
  for (let b = 0; b * beat < DUR; b++) addTone(L, R, b * beat, 0.22, 120, 0.9, "kick", 0);
  // hats on every eighth
  for (let s = 0; s < steps; s++) addNoise(L, R, s * 0.25, 0.03, 0.1, true);
  // bass arpeggio (A minor feel)
  const bass = [110, 110, 130.81, 164.81, 110, 98, 164.81, 130.81];
  for (let s = 0; s < steps; s++)
    addTone(L, R, s * 0.25, 0.22, bass[s % bass.length], 0.22, "saw", s % 2 ? 0.3 : -0.3);
  // sustained pad chords (A minor) in 2s blocks
  const pad = [220, 261.63, 329.63];
  for (let bar = 0; bar < Math.floor(DUR / 2); bar++)
    pad.forEach((fn, idx) => addTone(L, R, bar * 2, 2.0, fn, 0.06, "pad", idx - 1));
  // lead plucks on beats 2 & 4 of each 2s bar
  for (let bar = 0; bar < Math.floor(DUR / 2); bar++)
    [0.5, 1.5].forEach((off) => addTone(L, R, bar * 2 + off, 0.25, 440, 0.12, "pluck", 0.5));

  normalize(L, R, 0.95);
  return encodeWav(L, R);
}

// --- SFX ------------------------------------------------------------------
function makeClick() {
  const N = Math.floor(0.06 * SR);
  const L = new Float32Array(N);
  const R = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const p = i / N;
    const env = Math.exp(-p * 40);
    const s = Math.sin(2 * Math.PI * (1800 + 600 * p) * (i / SR));
    const g = 0.9 * env;
    L[i] = g * s;
    R[i] = g * s;
  }
  return encodeWav(L, R);
}

function makeAppear() {
  const N = Math.floor(0.4 * SR);
  const L = new Float32Array(N);
  const R = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const p = i / N;
    const env = Math.exp(-p * 3) * Math.sin(Math.PI * p);
    const f = 300 * Math.pow(1400 / 300, p);
    const s = Math.sin(2 * Math.PI * f * (i / SR));
    const g = 0.5 * env;
    L[i] = g * s;
    R[i] = g * s;
  }
  return encodeWav(L, R);
}

function makeTransition() {
  const N = Math.floor(0.6 * SR);
  const L = new Float32Array(N);
  const R = new Float32Array(N);
  const rng = mulberry32(7);
  let lp = 0;
  for (let i = 0; i < N; i++) {
    const p = i / N;
    const swell = Math.sin(Math.PI * p); // up then down
    // rising low-pass = "whoosh open"
    const a = 0.05 + 0.4 * p;
    const w = rng() * 2 - 1;
    lp += a * (w - lp);
    const g = 0.55 * swell;
    L[i] = g * lp;
    R[i] = g * lp;
  }
  return encodeWav(L, R);
}

function makeLanding() {
  const N = Math.floor(0.6 * SR);
  const L = new Float32Array(N);
  const R = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const p = i / N;
    const env = Math.exp(-p * 7);
    const f = 90 * Math.pow(40 / 90, p); // pitch drop
    const s = Math.sin(2 * Math.PI * f * (i / SR));
    const g = 0.9 * env;
    L[i] = g * s;
    R[i] = g * s;
  }
  // a soft click transient at the very start (deterministic)
  for (let i = 0; i < Math.floor(0.02 * SR); i++) {
    const env = Math.exp(-(i / (0.02 * SR)) * 20);
    L[i] += 0.4 * env;
    R[i] += 0.4 * env;
  }
  return encodeWav(L, R);
}

// --- write everything -----------------------------------------------------
writeFileSync(join(OUT, "music.wav"), makeMusic());
writeFileSync(join(OUT, "click.wav"), makeClick());
writeFileSync(join(OUT, "appear.wav"), makeAppear());
writeFileSync(join(OUT, "transition.wav"), makeTransition());
writeFileSync(join(OUT, "landing.wav"), makeLanding());
console.log("audio generated ->", OUT);
