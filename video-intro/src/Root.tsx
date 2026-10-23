import React from "react";
import { Composition } from "remotion";
import { Intro } from "./Intro";
import { FPS, WIDTH, HEIGHT, DURATION_IN_FRAMES } from "./timeline";

export const Root: React.FC = () => {
  return (
    <Composition
      id="SmartWarehouseIntro"
      component={Intro}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
