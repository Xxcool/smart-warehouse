# 项目介绍视频 · 提示词（VIDEO PROMPT）

> 本文件是**模仿用户给出的 `@scene#40` 模板、改写为 smart-warehouse 项目**后的提示词。
> 它既可直接喂给 AI 视频工具，也是本工程 `src/` 的实现契约（尤其末尾「关键动作时刻表」对应 `src/timeline.ts` 的 `AUDIO_CUES` / `SCENE_RANGE`）。

---

```text
@scene#01:"视频生成" 时长[30 秒],画幅[16:9],分辨率[1920x1080],帧率[30fps]。
给出最终交付：可播放 MP4、源码、素材清单、重新导出的方法。
如果要参考的图片、logo、视频等素材，从本工程文件夹直接取想要的素材
（docs/images/ 下 18 张高清效果图与封面 cover.jpg、public/logo.png、favicon，
以及核心模型 public/smart_warehouse.glb）。

我要你发挥你所有的能力实现这个功能：
效果要炫酷，要契合本作品集网站（智慧仓储数字孪生平台）的赛博深空气质——
深晶蓝地坪、青蓝激光导引线、荧光指示、自发光全息大屏、AGV 闭环搬运、货车 PBR 细节；
节奏可以快一些，内容要丰富，尽量覆盖重要信息：
双主题切换 / AGV 闭环 / 工业货车与座舱透视 / 仓内全息遥测大屏 / 业务监控 HUD /
智能交互运镜 / 技术栈(Vue3+Vite+TS+Three.js+Blender)。

主要内容：
- 让上一幕的关键物体成为下一幕的起点。
- 用形状变化、镜头移动或遮罩完成转场。
- 同一时刻只展示一个重点；文字在容器变形完成后进入。
- 动画由统一时间轴控制。
- 网页方案提供 render(t) 或 seek(t)，能准确跳到任意时刻。
- 同一时刻重复渲染得到相同画面，随机效果使用固定种子。
- 等待字体、图片与模型加载完成后再截图。
- 如果采用 Remotion，按帧号组织动画，保持导出结果可重复。

不要先做完画面再随便铺音乐。先确定关键动作发生的时刻，再安排音乐和音效。
点击、出现、转场和落地的音效要与画面同步。

``项目介绍内容：智慧仓储数字孪生平台 (smart-warehouse)``
Vue 3 + Vite + TypeScript + Three.js + Blender 构建的 3D 智慧仓储与物流数字孪生管控平台；
直观还原现代化智能物流园区：自动化 AGV 物料循环搬运、立体仓库出入库、冷链气密仓恒温监控、
月台货车装卸，支持赛博夜景与白昼展厅双风格无损切换。``
用好图片素材，必要时裁剪提取~ 推荐取用：
docs/images/15_cyber_digital_twin.png（赛博夜景全景）、
11_studio_day_theme.png（白昼展厅）、07_closed_loop_agv.png（AGV 闭环）、
18_truck_pbr_clearcoat.png（货车 PBR 车身）、17_truck_cockpit_interior.png（座舱透视）、
16_holo_screen_telemetry.png（全息大屏）、public/logo.png（项目 Logo）。``
核心亮点：🌓 双视觉主题无损切换 / 🤖 AGV 闭环搬运 / 🚚 货车 PBR 与座舱透视 /
📊 仓内全息遥测大屏 / 🖥️ 业务监控 HUD / 🔍 点击设备智能运镜。``
技术栈：Vue 3 · Vite 5 · TypeScript 5 · Three.js r169 · Blender 5.2.2 (PBR / glTF 2.0)。``
在线体验：https://smart-warehouse-wine.vercel.app ｜ 作者 Xxcool · GitHub @Xxcool ｜ MIT License。``
<项目封面 / 赛博夜景全景截图：docs/images/15_cyber_digital_twin.png></项目封面 / 赛博夜景全景截图>
```

---

## 本提示词如何被落地（实现映射）

| 提示词要求 | 工程落点 |
|---|---|
| 时长/画幅/分辨率/帧率 | `src/timeline.ts` 的 `FPS/WIDTH/HEIGHT/DURATION_IN_FRAMES` |
| 统一时间轴、按帧号组织 | `src/Intro.tsx` 单 `useCurrentFrame` 驱动全局；`getActive()` 计算当前/下一幕 |
| 上一幕关键物体=下一幕起点 | 共享 `CONTAINER` 容器在相邻场景间由 `lerpRect` 变形衔接 |
| 形状/镜头/遮罩转场 | 容器缩放变形 + 日/夜 `clip-path` 遮罩擦除 + 内容交叉淡入 |
| 单焦点、文字在变形后进入 | `revealOf`/`textOf` 门控，`KineticText` 在容器变形完成后入场 |
| 固定种子、可重复 | `mulberry32` 驱动粒子/抖动；音乐/音效为脚本合成的固定字节 |
| render(t)/seek(t) | Remotion Player（`npm run preview`）天然支持按时间 seek |
| 先定时刻再排音、音画同步 | `AUDIO_CUES`/`CLICK_FRAMES` 把音效钉在动作帧；`src/audio/synth.mjs` 确定性合成 |
| 等待资源加载 | 所有图/音频走 `staticFile` 预置；开场前 8 帧留黑场缓冲 |
