import React from "react";
import { AbsoluteFill, useCurrentFrame, Audio, staticFile } from "remotion";
import { CyberBackground } from "./background";
import { MorphFrame } from "./frame";
import { SCENE_COMPONENTS } from "./scenes";
import { COLORS } from "./theme";
import {
  SCENE_RANGE,
  CONTAINER,
  getActive,
  lerpRect,
  revealOf,
  textOf,
  AUDIO_CUES,
  CLICK_FRAMES,
  MUSIC_FILE,
  MUSIC_VOLUME,
} from "./timeline";

// One composition, one timeline. The whole film is driven by a single global
// frame counter; scenes crossfade/morph within a shared container, and every
// SFX is pinned to a frame so audio lands on the picture.
export const Intro: React.FC = () => {
  const f = useCurrentFrame();
  const { cur, next, t } = getActive(f);
  const transitioning = cur !== next;

  const rect = lerpRect(CONTAINER[cur], CONTAINER[next], t);
  const Cur = SCENE_COMPONENTS[cur];
  const Next = SCENE_COMPONENTS[next];

  const curReveal = revealOf(f, cur);
  const curText = textOf(f, cur);
  const nextReveal = revealOf(f, next);
  const nextText = textOf(f, next);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <CyberBackground />

      {/* outgoing / current scene */}
      <Cur
        rect={rect}
        opacity={transitioning ? 1 - t : 1}
        reveal={curReveal}
        textProgress={curText}
        f={f}
      />

      {/* incoming scene, only during the overlap (transition) window */}
      {transitioning && (
        <Next
          rect={rect}
          opacity={t}
          reveal={nextReveal}
          textProgress={nextText}
          f={f}
        />
      )}

      {/* persistent morphing container — the key object linking every scene */}
      <MorphFrame rect={rect} opacity={1} />

      {/* ---------------------- AUDIO ---------------------- */}
      {/* continuous music bed, then action-synced SFX */}
      <Audio src={staticFile(MUSIC_FILE)} startFrom={0} volume={MUSIC_VOLUME} />
      {AUDIO_CUES.map((c, i) => (
        <Audio
          key={`cue-${i}`}
          src={staticFile(c.file)}
          startFrom={c.frame}
          volume={c.volume}
        />
      ))}
      {/* crisp click exactly when each scene's text lands */}
      {CLICK_FRAMES.map((fr, i) => (
        <Audio
          key={`click-${i}`}
          src={staticFile("audio/click.wav")}
          startFrom={fr}
          volume={0.7}
        />
      ))}
    </AbsoluteFill>
  );
};
