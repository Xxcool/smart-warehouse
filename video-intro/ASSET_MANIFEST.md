# 素材清单（Asset Manifest）

本视频工程所有素材均取自 smart-warehouse 仓库，未作外部联网获取。

## 图片素材（置于 `public/assets/`）

| 工程内文件名 | 来源（仓库路径） | 用于场景 | 说明 |
|---|---|---|---|
| `15.png` | `docs/images/15_cyber_digital_twin.png` | 场景 2 赛博夜景 / 场景 6 夜 | 赛博深空全景，核心视觉 |
| `11.png` | `docs/images/11_studio_day_theme.png` | 场景 6 昼 | 白昼展厅沙盘，与夜景做遮罩擦除切换 |
| `07.png` | `docs/images/07_closed_loop_agv.png` | 场景 3 AGV 闭环 | AGV 循迹与闭环搬运 |
| `18.png` | `docs/images/18_truck_pbr_clearcoat.png` | 场景 4 货车 PBR | 清漆车身 / 防眩车灯细节 |
| `16.png` | `docs/images/16_holo_screen_telemetry.png` | 场景 5 全息大屏 | 仓内自发光全息遥测屏 |
| `logo.png` | `public/logo.png` | 场景 1 开场 / 场景 8 落版 | 项目 Logo |
| `cover.jpg` | `docs/images/cover.jpg` | 备用 | 仓库封面，未强制使用 |

> 如需替换/增删素材：直接替换 `public/assets/` 下同名文件，或在 `src/scenes.tsx` 中改 `staticFile('assets/xxx.png')` 路径。

## 音频素材（由 `src/audio/synth.mjs` 确定性合成 → `public/audio/`）

| 文件名 | 类型 | 时长 | 触发时刻（帧） | 作用 |
|---|---|---|---|---|
| `music.wav` | 背景乐（赛博 techno，48kHz/16bit 立体声） | 30.0s | 0（全程） | 音乐床 |
| `click.wav` | 短促点击 | 0.06s | 每个场景文字落地帧 | 文字出现音 |
| `appear.wav` | 上行 sweep + 轻铃 | 0.40s | 24 | Logo 出现 |
| `transition.wav` | 噪声 whoosh | 0.60s | 180/300/420/540/660/780 | 转场 |
| `landing.wav` | 低频 thump | 0.60s | 66 / 870 | 落地 |

> 音效时刻集中在 `src/timeline.ts` 的 `AUDIO_CUES` 与 `CLICK_FRAMES`，与画面动作帧一一对应（先定时刻、再排音）。

## 字体

使用系统字体，零联网：拉丁字体 `Helvetica Neue / Arial`，中文 `PingFang SC`（macOS 自带）。若换到无 PingFang 的系统，中文会回退到该系统的 CJK 字体，渲染结果可能略有差异。
