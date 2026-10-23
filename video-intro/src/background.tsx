import React from "react";
import { useCurrentFrame } from "remotion";
import { COLORS } from "./theme";
import { WIDTH, HEIGHT, mulberry32, clamp } from "./timeline";

// Perspective grid floor that scrolls toward the camera — pure CSS, deterministic.
const GridFloor: React.FC<{ f: number }> = ({ f }) => {
  const grid = 80;
  const move = (f * 5) % grid;
  return (
    <div
      style={{
        position: "absolute",
        left: "-25%",
        right: "-25%",
        bottom: "-12%",
        height: "72%",
        transform: `perspective(720px) rotateX(74deg) translateY(${move}px)`,
        transformOrigin: "center bottom",
        backgroundImage: `linear-gradient(${COLORS.line} 1px, transparent 1px), linear-gradient(90deg, ${COLORS.line} 1px, transparent 1px)`,
        backgroundSize: `${grid}px ${grid}px`,
        opacity: 0.45,
        WebkitMaskImage:
          "linear-gradient(to top, rgba(0,0,0,1), rgba(0,0,0,0.15) 55%, transparent)",
        maskImage:
          "linear-gradient(to top, rgba(0,0,0,1), rgba(0,0,0,0.15) 55%, transparent)",
      }}
    />
  );
};

// Floating dust / data motes drifting upward. Seeded -> identical every render.
const Particles: React.FC<{ f: number }> = ({ f }) => {
  const rng = mulberry32(20261022);
  const motes = Array.from({ length: 54 }, () => ({
    x: rng() * WIDTH,
    y: rng() * HEIGHT,
    s: 1 + rng() * 2.6,
    sp: 0.25 + rng() * 0.9,
    o: 0.15 + rng() * 0.55,
    cyan: rng() > 0.45,
  }));
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {motes.map((m, i) => {
        const top = (((m.y - f * m.sp) % HEIGHT) + HEIGHT) % HEIGHT;
        const left = (m.x + Math.sin((f + i * 13) * 0.01) * 12) % WIDTH;
        const color = m.cyan ? COLORS.cyan : "#cfe8ff";
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left,
              top,
              width: m.s,
              height: m.s,
              borderRadius: "50%",
              background: color,
              opacity: m.o,
              boxShadow: `0 0 ${m.s * 3}px ${color}`,
            }}
          />
        );
      })}
    </div>
  );
};

// A single horizontal scanline sweeping vertically.
const Scanline: React.FC<{ f: number }> = ({ f }) => {
  const y = (f * 16) % (HEIGHT + 240) - 120;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: y,
        height: 2,
        background:
          "linear-gradient(90deg, transparent, rgba(39,230,255,0.55), transparent)",
        opacity: 0.35,
      }}
    />
  );
};

export const CyberBackground: React.FC = () => {
  const f = useCurrentFrame();
  // subtle global breathing glow
  const pulse = 0.5 + 0.5 * Math.sin(f * 0.03);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `radial-gradient(120% 90% at 50% 18%, ${COLORS.bgGlow} 0%, ${COLORS.bg2} 38%, ${COLORS.bg} 78%)`,
      }}
    >
      <GridFloor f={f} />
      <Particles f={f} />
      <Scanline f={f} />
      {/* edge vignette to focus the centre stage */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(110% 80% at 50% 50%, transparent 55%, rgba(2,4,10,0.85) 100%)",
          opacity: 0.9,
        }}
      />
      {/* faint top status bar glow that tracks the pulse */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 6,
          background: `linear-gradient(90deg, transparent, ${COLORS.cyan}, transparent)`,
          opacity: 0.25 + 0.35 * pulse,
        }}
      />
    </div>
  );
};
