// ---------------------------------------------------------------------------
// Deterministic timeline. Everything is expressed in FRAMES so the export is
// perfectly reproducible: rendering frame N twice yields the identical picture,
// and all "random" decoration is driven by a fixed-seed PRNG (mulberry32).
//
// Total: 30s @ 30fps = 900 frames, 1920x1080, 16:9.
// Adjacent scenes overlap by 15 frames -> that overlap is the transition window.
// ---------------------------------------------------------------------------

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const DURATION_IN_FRAMES = 900;

// Deterministic PRNG. Same seed -> same sequence on every machine / every run.
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- math helpers ---------------------------------------------------------
export const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInCubic = (t: number) => t * t * t;
export const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

// --- scene order & boundaries (frames) ------------------------------------
export const SCENE_ORDER = [
  "opening",
  "cyber",
  "agv",
  "truck",
  "holo",
  "theme",
  "tech",
  "closing",
] as const;
export type SceneKey = (typeof SCENE_ORDER)[number];

// [in, out) — out of one scene overlaps the in of the next by 15 frames.
export const SCENE_RANGE: Record<SceneKey, { in: number; out: number }> = {
  opening: { in: 0, out: 90 },
  cyber: { in: 75, out: 210 },
  agv: { in: 195, out: 330 },
  truck: { in: 315, out: 450 },
  holo: { in: 435, out: 570 },
  theme: { in: 555, out: 690 },
  tech: { in: 675, out: 810 },
  closing: { in: 795, out: 900 },
};

// Shared morphing "container" — the persistent key object that links scenes.
// Every rect is horizontally centred (x + w/2 === 960).
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  radius: number;
}
export const CONTAINER: Record<SceneKey, Rect> = {
  opening: { x: 760, y: 340, w: 400, h: 400, radius: 28 },
  cyber: { x: 360, y: 130, w: 1200, h: 820, radius: 20 },
  agv: { x: 560, y: 200, w: 800, h: 680, radius: 18 },
  truck: { x: 460, y: 180, w: 1000, h: 720, radius: 18 },
  holo: { x: 560, y: 200, w: 800, h: 680, radius: 18 },
  theme: { x: 360, y: 130, w: 1200, h: 820, radius: 20 },
  tech: { x: 360, y: 170, w: 1200, h: 740, radius: 18 },
  closing: { x: 760, y: 340, w: 400, h: 400, radius: 28 },
};

export function lerpRect(a: Rect, b: Rect, t: number): Rect {
  const e = easeInOutCubic(clamp(t, 0, 1));
  return {
    x: lerp(a.x, b.x, e),
    y: lerp(a.y, b.y, e),
    w: lerp(a.w, b.w, e),
    h: lerp(a.h, b.h, e),
    radius: lerp(a.radius, b.radius, e),
  };
}

// --- entrance / text timing ------------------------------------------------
export const ENTER = 18; // frames for the container's entrance deformation
export const TEXT_DELAY = 12; // frames between deform-done and text entry
export const TEXT_RAMP = 14; // frames for text to fully appear

// Which scenes are active at frame f (usually 1, sometimes 2 during overlap).
export function getActive(f: number): { cur: SceneKey; next: SceneKey; t: number } {
  const active = SCENE_ORDER.filter(
    (k) => f >= SCENE_RANGE[k].in && f < SCENE_RANGE[k].out
  );
  if (active.length === 1) return { cur: active[0], next: active[0], t: 0 };
  const sorted = [...active].sort(
    (a, b) => SCENE_RANGE[a].in - SCENE_RANGE[b].in
  );
  const cur = sorted[0];
  const nxt = sorted[1];
  const t = (f - SCENE_RANGE[nxt].in) / (SCENE_RANGE[cur].out - SCENE_RANGE[nxt].in);
  return { cur, next: nxt, t: clamp(t, 0, 1) };
}

export const revealOf = (f: number, k: SceneKey) =>
  easeOutCubic(clamp((f - SCENE_RANGE[k].in) / ENTER, 0, 1));
export const textOf = (f: number, k: SceneKey) =>
  easeOutCubic(
    clamp((f - SCENE_RANGE[k].in - ENTER - TEXT_DELAY) / TEXT_RAMP, 0, 1)
  );

// --- audio key moments (frames) -------------------------------------------
// Music bed spans the whole 30s. SFX are placed to LAND exactly on picture beats.
export const MUSIC_FILE = "audio/music.wav";
export const MUSIC_VOLUME = 0.5;

export interface AudioCue {
  frame: number;
  file: string;
  volume: number;
}
// Appear / transition whoosh / landing thumps — fired on the action beats.
export const AUDIO_CUES: AudioCue[] = [
  { frame: 24, file: "audio/appear.wav", volume: 0.9 },
  { frame: 66, file: "audio/landing.wav", volume: 1.0 },
  { frame: 180, file: "audio/transition.wav", volume: 0.8 },
  { frame: 300, file: "audio/transition.wav", volume: 0.8 },
  { frame: 420, file: "audio/transition.wav", volume: 0.8 },
  { frame: 540, file: "audio/transition.wav", volume: 0.8 },
  { frame: 660, file: "audio/transition.wav", volume: 0.8 },
  { frame: 780, file: "audio/transition.wav", volume: 0.8 },
  { frame: 870, file: "audio/landing.wav", volume: 1.0 },
];
// A crisp "click" exactly when each scene's text lands (after deformation).
export const CLICK_FRAMES: number[] = SCENE_ORDER.map(
  (k) => SCENE_RANGE[k].in + ENTER + TEXT_DELAY + 4
);
