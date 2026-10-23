import React from "react";
import { COLORS, FONT_CJK, FONT_MONO } from "./theme";
import { Rect, clamp, easeOutCubic } from "./timeline";

// The persistent morphing container — the key object that links every scene.
// A cyan HUD frame with corner brackets and an inner glow.
export const MorphFrame: React.FC<{ rect: Rect; opacity: number }> = ({
  rect,
  opacity,
}) => {
  const b = 2;
  const corner = 26;
  return (
    <div
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        borderRadius: rect.radius,
        border: `${b}px solid ${COLORS.cyan}`,
        boxShadow: `0 0 46px rgba(39,230,255,0.32), inset 0 0 34px rgba(39,230,255,0.10)`,
        opacity,
        pointerEvents: "none",
      }}
    >
      {(
        [
          { left: -b, top: -b },
          { right: -b, top: -b },
          { left: -b, bottom: -b },
          { right: -b, bottom: -b },
        ] as const
      ).map((pos, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: corner,
            height: corner,
            borderColor: COLORS.cyan,
            borderStyle: "solid",
            borderWidth: 0,
            borderTopWidth: i < 2 ? 3 : 0,
            borderBottomWidth: i >= 2 ? 3 : 0,
            borderLeftWidth: i % 2 === 0 ? 3 : 0,
            borderRightWidth: i % 2 === 1 ? 3 : 0,
            ...pos,
          }}
        />
      ))}
    </div>
  );
};

// Headline + subline that enter AFTER the container has finished deforming.
// Per-character stagger for a kinetic, techy reveal.
export const KineticText: React.FC<{
  headline: string;
  sub?: string;
  progress: number; // 0..1, already gated on deformation-done
  rect: Rect;
}> = ({ headline, sub, progress, rect }) => {
  const chars = Array.from(headline);
  return (
    <div
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y + rect.h - 168,
        width: rect.w,
        height: 168,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        pointerEvents: "none",
      }}
    >
      {/* readability scrim */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 168,
          background:
            "linear-gradient(to top, rgba(4,6,14,0.82), rgba(4,6,14,0.35) 60%, transparent)",
          opacity: clamp(progress * 1.4, 0, 1),
        }}
      />
      <div
        style={{
          position: "relative",
          fontFamily: FONT_CJK,
          fontWeight: 800,
          fontSize: 60,
          letterSpacing: 4,
          color: COLORS.ink,
          textShadow: `0 0 22px rgba(39,230,255,0.55)`,
          textAlign: "center",
          lineHeight: 1.12,
        }}
      >
        {chars.map((ch, i) => {
          const local = clamp((progress - i * 0.022) / 0.5, 0, 1);
          const e = easeOutCubic(local);
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                opacity: e,
                transform: `translateY(${(1 - e) * 16}px)`,
                whiteSpace: ch === " " ? "pre" : "normal",
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>
      {sub && (
        <div
          style={{
            position: "relative",
            marginTop: 12,
            fontFamily: FONT_MONO,
            fontWeight: 500,
            fontSize: 22,
            letterSpacing: 3,
            color: COLORS.cyan,
            textAlign: "center",
            opacity: clamp((progress - 0.55) / 0.45, 0, 1),
            textShadow: `0 0 14px rgba(39,230,255,0.4)`,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
};

// Small HUD tag drawn at the top-left of a container (scene label).
export const SceneTag: React.FC<{ label: string; rect: Rect; opacity: number }> = ({
  label,
  rect,
  opacity,
}) => (
  <div
    style={{
      position: "absolute",
      left: rect.x + 16,
      top: rect.y + 14,
      fontFamily: FONT_MONO,
      fontSize: 16,
      letterSpacing: 2,
      color: COLORS.cyan,
      opacity,
      pointerEvents: "none",
      textShadow: `0 0 10px rgba(39,230,255,0.5)`,
    }}
  >
    {label}
  </div>
);
