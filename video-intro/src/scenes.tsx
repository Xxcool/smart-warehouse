import React from "react";
import { Img, staticFile } from "remotion";
import { COLORS, FONT_CJK, FONT_MONO } from "./theme";
import { Rect, SceneKey, SCENE_RANGE, clamp, easeOutCubic } from "./timeline";
import { KineticText, SceneTag } from "./frame";

export interface SceneProps {
  rect: Rect;
  opacity: number;
  reveal: number;
  textProgress: number;
  f: number;
}

// 1) OPENING — the logo cube grows out of black; the container is born here and
//    becomes the anchor for every later scene.
export const OpeningScene: React.FC<SceneProps> = ({
  rect,
  opacity,
  reveal,
  textProgress,
  f,
}) => {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const rot = f * 1.1;
  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
      <div
        style={{
          position: "absolute",
          left: rect.x,
          top: rect.y,
          width: rect.w,
          height: rect.h,
          borderRadius: rect.radius,
          overflow: "hidden",
          background:
            "radial-gradient(circle at 50% 44%, rgba(39,230,255,0.12), rgba(10,18,38,0) 70%)",
          transform: `scale(${0.86 + 0.14 * reveal})`,
          opacity: reveal,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: cx,
          top: cy,
          width: rect.w * 0.78,
          height: rect.w * 0.78,
          transform: `translate(-50%,-50%) rotate(${rot}deg)`,
          borderRadius: "50%",
          border: "1px dashed rgba(39,230,255,0.5)",
          opacity: 0.6 * reveal,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: cx,
          top: cy,
          width: rect.w * 0.62,
          height: rect.w * 0.62,
          transform: `translate(-50%,-50%) rotate(${-rot * 1.4}deg)`,
          borderRadius: "50%",
          border: "1px solid rgba(122,92,255,0.4)",
          opacity: 0.45 * reveal,
        }}
      />
      <Img
        src={staticFile("assets/logo.png")}
        style={{
          position: "absolute",
          left: cx,
          top: cy,
          width: rect.w * 0.5,
          height: rect.w * 0.5,
          objectFit: "contain",
          transform: `translate(-50%,-50%) scale(${0.7 + 0.3 * reveal})`,
          opacity: reveal,
          filter: "drop-shadow(0 0 22px rgba(39,230,255,0.55))",
        }}
      />
      <KineticText
        headline="智慧仓储数字孪生平台"
        sub="SMART WAREHOUSE · DIGITAL TWIN"
        progress={textProgress}
        rect={rect}
      />
    </div>
  );
};

// 2) CYBER TWIN — the container expands and the logo "unfolds" into the
//    cyber-night panorama (the same cube is now the live digital twin).
export const CyberTwinScene: React.FC<SceneProps> = ({
  rect,
  opacity,
  reveal,
  textProgress,
}) => (
  <div style={{ position: "absolute", inset: 0, opacity }}>
    <Img
      src={staticFile("assets/15.png")}
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        objectFit: "cover",
        opacity: reveal,
        transform: `scale(${1.06 - 0.06 * reveal})`,
      }}
    />
    <SceneTag label="// 01 · CYBER NIGHT" rect={rect} opacity={reveal} />
    <KineticText
      headline="数字孪生管控平台"
      sub="Vue 3 · Three.js · 实时还原智能物流园区"
      progress={textProgress}
      rect={rect}
    />
  </div>
);

// 3) AGV LOOP — a glowing mote travels a closed loop along the laser guide.
export const AgvLoopScene: React.FC<SceneProps> = ({
  rect,
  opacity,
  reveal,
  textProgress,
  f,
}) => {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const a = f * 0.06;
  const ax = cx + Math.cos(a) * rect.w * 0.33;
  const ay = cy + Math.sin(a) * rect.h * 0.33;
  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
      <Img
        src={staticFile("assets/07.png")}
        style={{
          position: "absolute",
          left: rect.x,
          top: rect.y,
          width: rect.w,
          height: rect.h,
          objectFit: "cover",
          opacity: reveal,
        }}
      />
      {/* moving AGV mote + orbit ring */}
      <div
        style={{
          position: "absolute",
          left: cx,
          top: cy,
          width: rect.w * 0.66,
          height: rect.h * 0.66,
          transform: "translate(-50%,-50%)",
          borderRadius: "50%",
          border: "1px solid rgba(39,230,255,0.35)",
          opacity: reveal * 0.8,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: ax,
          top: ay,
          width: 18,
          height: 18,
          transform: "translate(-50%,-50%)",
          borderRadius: "50%",
          background: COLORS.cyan,
          boxShadow: `0 0 26px 6px ${COLORS.cyan}`,
          opacity: reveal,
        }}
      />
      <SceneTag label="// 02 · AGV LOOP" rect={rect} opacity={reveal} />
      <KineticText
        headline="AGV 闭环物料搬运"
        sub="取货 → 重载 → 立库卸货 → 空车回流"
        progress={textProgress}
        rect={rect}
      />
    </div>
  );
};

// 4) TRUCK PBR — the laser line "becomes" the truck; a light sweep glides over
//    the clearcoat body.
export const TruckPBRScene: React.FC<SceneProps> = ({
  rect,
  opacity,
  reveal,
  textProgress,
  f,
}) => {
  const sweepX = rect.x + ((f * 20) % (rect.w + 500)) - 250;
  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
      <Img
        src={staticFile("assets/18.png")}
        style={{
          position: "absolute",
          left: rect.x,
          top: rect.y,
          width: rect.w,
          height: rect.h,
          objectFit: "cover",
          opacity: reveal,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: sweepX,
          top: rect.y,
          width: 220,
          height: rect.h,
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent)",
          transform: "skewX(-18deg)",
          opacity: reveal * 0.7,
          mixBlendMode: "screen",
        }}
      />
      <SceneTag label="// 03 · TRUCK PBR" rect={rect} opacity={reveal} />
      <KineticText
        headline="工业货车 PBR 细节"
        sub="透明座舱 · 防眩车灯 · 清漆车身"
        progress={textProgress}
        rect={rect}
      />
    </div>
  );
};

// 5) HOLO SCREEN — the cab window "becomes" the in-warehouse holographic
//    telemetry screen.
export const HoloScreenScene: React.FC<SceneProps> = ({
  rect,
  opacity,
  reveal,
  textProgress,
}) => (
  <div style={{ position: "absolute", inset: 0, opacity }}>
    <Img
      src={staticFile("assets/16.png")}
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        objectFit: "cover",
        opacity: reveal,
      }}
    />
    <div
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        background:
          "radial-gradient(circle at 50% 45%, rgba(39,230,255,0.10), transparent 60%)",
        opacity: reveal,
      }}
    />
    <SceneTag label="// 04 · HOLO TELEMETRY" rect={rect} opacity={reveal} />
    <KineticText
      headline="仓内全息遥测大屏"
      sub="AGV 波形 · 冷库 -18.2℃ · 实时吞吐率"
      progress={textProgress}
      rect={rect}
    />
  </div>
);

// 6) DUAL THEME — a mask wipe swaps Day (studio) over Night (cyber), proving the
//    lossless theme switch.
export const DualThemeScene: React.FC<SceneProps> = ({
  rect,
  opacity,
  reveal,
  textProgress,
  f,
}) => {
  const local = f - SCENE_RANGE.theme.in;
  const nightReveal = easeOutCubic(clamp((local - 20) / 200, 0, 1));
  const rightInset = (1 - nightReveal) * 100;
  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
      <Img
        src={staticFile("assets/11.png")}
        style={{
          position: "absolute",
          left: rect.x,
          top: rect.y,
          width: rect.w,
          height: rect.h,
          objectFit: "cover",
          opacity: reveal,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: rect.x,
          top: rect.y,
          width: rect.w,
          height: rect.h,
          overflow: "hidden",
          opacity: reveal,
        }}
      >
        <Img
          src={staticFile("assets/15.png")}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: rect.w,
            height: rect.h,
            objectFit: "cover",
            clipPath: `inset(0 ${rightInset}% 0 0)`,
            WebkitClipPath: `inset(0 ${rightInset}% 0 0)`,
          }}
        />
      </div>
      {/* wipe edge glow */}
      <div
        style={{
          position: "absolute",
          left: rect.x + rect.w * nightReveal,
          top: rect.y,
          width: 3,
          height: rect.h,
          background: COLORS.cyan,
          boxShadow: `0 0 18px ${COLORS.cyan}`,
          opacity: reveal * (nightReveal > 0 && nightReveal < 1 ? 1 : 0),
        }}
      />
      <SceneTag label="// 05 · DUAL THEME" rect={rect} opacity={reveal} />
      <KineticText
        headline="双视觉主题无损切换"
        sub="赛博深空 ⇄ 白昼展厅 · 一键无感切换"
        progress={textProgress}
        rect={rect}
      />
    </div>
  );
};

// 7) TECH STACK — the theme panel "shatters" into stacked tech cards.
export const TechStackScene: React.FC<SceneProps> = ({
  rect,
  opacity,
  reveal,
  textProgress,
  f,
}) => {
  const local = f - SCENE_RANGE.tech.in;
  const cards = [
    { name: "Vue 3", tag: "Composition API", c: COLORS.cyan },
    { name: "Vite 5", tag: "Build Tool", c: "#a36bff" },
    { name: "TypeScript", tag: "Type Safe", c: "#3aa0ff" },
    { name: "Three.js", tag: "WebGL r169", c: COLORS.cyan },
    { name: "Blender", tag: "PBR · glTF2", c: COLORS.amber },
  ];
  const cardW = 196;
  const gap = 26;
  const totalW = cards.length * cardW + (cards.length - 1) * gap;
  const startX = rect.x + (rect.w - totalW) / 2;
  const cardY = rect.y + rect.h / 2 - 130;
  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
      <div
        style={{
          position: "absolute",
          left: rect.x,
          top: rect.y,
          width: rect.w,
          height: rect.h,
          borderRadius: rect.radius,
          background: "rgba(8,14,30,0.55)",
          border: `1px solid rgba(39,230,255,0.18)`,
          opacity: reveal,
        }}
      />
      {cards.map((c, i) => {
        const cr = easeOutCubic(clamp((local - 18 - i * 8) / 12, 0, 1));
        return (
          <div
            key={c.name}
            style={{
              position: "absolute",
              left: startX + i * (cardW + gap),
              top: cardY,
              width: cardW,
              height: 260,
              borderRadius: 16,
              background: "rgba(6,12,26,0.92)",
              border: `1px solid ${c.c}`,
              boxShadow: `0 0 26px ${c.c}44, inset 0 0 18px ${c.c}22`,
              opacity: cr,
              transform: `translateY(${(1 - cr) * 40}px) scale(${0.9 + 0.1 * cr})`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 14,
                border: `2px solid ${c.c}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: FONT_MONO,
                fontWeight: 800,
                fontSize: 26,
                color: c.c,
                boxShadow: `0 0 18px ${c.c}66`,
                marginBottom: 18,
              }}
            >
              {c.name.slice(0, 2)}
            </div>
            <div
              style={{
                fontFamily: FONT_CJK,
                fontWeight: 800,
                fontSize: 26,
                color: COLORS.ink,
                letterSpacing: 1,
              }}
            >
              {c.name}
            </div>
            <div
              style={{
                fontFamily: FONT_MONO,
                fontSize: 15,
                color: COLORS.inkDim,
                marginTop: 8,
                letterSpacing: 1,
              }}
            >
              {c.tag}
            </div>
          </div>
        );
      })}
      <KineticText
        headline="技术栈"
        sub="现代化前端 + 三维引擎 + 建模管线"
        progress={textProgress}
        rect={rect}
      />
    </div>
  );
};

// 8) CLOSING — cards converge back into the logo; the landing beat drops.
export const ClosingScene: React.FC<SceneProps> = ({
  rect,
  opacity,
  reveal,
  textProgress,
}) => {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2 - 40;
  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
      <div
        style={{
          position: "absolute",
          left: rect.x,
          top: rect.y,
          width: rect.w,
          height: rect.h,
          borderRadius: rect.radius,
          overflow: "hidden",
          background:
            "radial-gradient(circle at 50% 42%, rgba(39,230,255,0.14), rgba(10,18,38,0) 70%)",
          opacity: reveal,
        }}
      />
      <Img
        src={staticFile("assets/logo.png")}
        style={{
          position: "absolute",
          left: cx,
          top: cy,
          width: rect.w * 0.46,
          height: rect.w * 0.46,
          objectFit: "contain",
          transform: `translate(-50%,-50%) scale(${0.8 + 0.2 * reveal})`,
          opacity: reveal,
          filter: "drop-shadow(0 0 24px rgba(39,230,255,0.6))",
        }}
      />
      <KineticText
        headline="在线体验 · 开源共建"
        sub="vercel.app ｜ @Xxcool ｜ MIT License"
        progress={textProgress}
        rect={rect}
      />
    </div>
  );
};

// Dispatcher used by the unified timeline in Intro.tsx.
export const SCENE_COMPONENTS: Record<SceneKey, React.FC<SceneProps>> = {
  opening: OpeningScene,
  cyber: CyberTwinScene,
  agv: AgvLoopScene,
  truck: TruckPBRScene,
  holo: HoloScreenScene,
  theme: DualThemeScene,
  tech: TechStackScene,
  closing: ClosingScene,
};

export const SCENE_TEXT: Record<SceneKey, { headline: string; sub: string }> = {
  opening: { headline: "智慧仓储数字孪生平台", sub: "SMART WAREHOUSE · DIGITAL TWIN" },
  cyber: { headline: "数字孪生管控平台", sub: "Vue 3 · Three.js · 实时还原智能物流园区" },
  agv: { headline: "AGV 闭环物料搬运", sub: "取货 → 重载 → 立库卸货 → 空车回流" },
  truck: { headline: "工业货车 PBR 细节", sub: "透明座舱 · 防眩车灯 · 清漆车身" },
  holo: { headline: "仓内全息遥测大屏", sub: "AGV 波形 · 冷库 -18.2℃ · 实时吞吐率" },
  theme: { headline: "双视觉主题无损切换", sub: "赛博深空 ⇄ 白昼展厅 · 一键无感切换" },
  tech: { headline: "技术栈", sub: "现代化前端 + 三维引擎 + 建模管线" },
  closing: { headline: "在线体验 · 开源共建", sub: "vercel.app ｜ @Xxcool ｜ MIT License" },
};
