# smart-warehouse 项目介绍视频 · 交付与重导出

基于 **Remotion** 的确定性视频工程。30 秒 · 1920×1080 · 16:9 · 30fps，单一时间轴、
按帧号组织动画、固定种子，保证「同一帧重复渲染得到相同画面」。

## 目录结构

```
video-intro/
├─ package.json            # 依赖与脚本
├─ remotion.config.ts       # 渲染配置（覆盖输出、并发）
├─ render.mjs               # ★ 程序化渲染入口（video / still，固定 outDir）
├─ VIDEO_PROMPT.md          # 模仿 @scene#40 写成的本项目提示词（需求契约）
├─ ASSET_MANIFEST.md        # 素材清单（来源 / 用途）
├─ src/
│  ├─ index.ts              # registerRoot 入口
│  ├─ Root.tsx              # 注册 Composition（SmartWarehouseIntro）
│  ├─ timeline.ts           # ★ 核心：帧号、场景分段、容器目标、音画关键帧、固定种子
│  ├─ theme.ts              # 赛博深空配色与字体
│  ├─ background.tsx         # 网格地坪 / 粒子 / 扫描线（种子驱动）
│  ├─ frame.tsx             # 变形容器 MorphFrame / 动力学文字 KineticText
│  ├─ scenes.tsx            # 8 个场景 + 调度器
│  ├─ Intro.tsx             # ★ 统一时间轴装配层（背景+场景+容器+音画同步）
│  └─ audio/synth.mjs       # 确定性音频合成（音乐 + 4 类 SFX → WAV）
├─ public/
│  ├─ assets/               # 取自仓库的效果图 / logo
│  └─ audio/                # synth.mjs 生成的 WAV
└─ out/                     # 渲染产物（smart-warehouse-intro.mp4）
```

## 环境要求

- Node ≥ 18（本机 22.x）
- 系统 Chrome（渲染用，路径写在 `render.mjs` 的 `BROWSER` 常量）
- ffmpeg（编码用，本机 `/opt/homebrew/bin/ffmpeg`；Remotion 也可用自带）

## 重新导出（三步）

```bash
cd video-intro

# 1) 安装依赖
npm install

# 2) （可选）重新合成音频，改完时刻/音色后执行
npm run synth

# 3) 渲染为可播放 MP4
npm run render
#   => out/smart-warehouse-intro.mp4
```

渲染由 `render.mjs` 驱动（`npm run render` 已指向它）：

```bash
node render.mjs video            # 全片 → out/smart-warehouse-intro.mp4
node render.mjs still:450        # 单帧 → out/frame-450.png
node render.mjs still:30,168,280,393,506,618,731,843   # 每场景抽一帧做检查
```

`render.mjs` 用 Remotion 的程序化 API（`bundle` + `getCompositions` + `renderMedia`）
并固定 `outDir`，因此跨平台稳定，不依赖 CLI 的临时目录行为。

## 预览 / 单帧 / 播放器

```bash
npm run dev        # Remotion Studio，可视化编辑与实时预览
npm run still      # 导出第 450 帧为 out/frame-450.png（调试构图）
npm run stills     # 每个场景抽一帧（30/168/280/393/506/618/731/843）
npm run preview    # Remotion Player，支持 render(t)/seek(t) 任意跳转
```

> Player 天然满足提示词里「网页方案提供 render(t) 或 seek(t)，能准确跳到任意时刻」。

## 如何修改内容

| 想改什么 | 改哪里 |
|---|---|
| 文案（标题 / 副标） | `src/scenes.tsx` 各场景的 `headline` / `sub` |
| 节奏 / 场景时长 / 转场窗 | `src/timeline.ts` 的 `SCENE_RANGE`（相邻 overlap = 转场窗） |
| 容器大小 / 圆角（关键物体衔接） | `src/timeline.ts` 的 `CONTAINER` |
| 音乐与音效的触发时刻 | `src/timeline.ts` 的 `AUDIO_CUES` / `CLICK_FRAMES` |
| 音乐风格 / SFX 音色 | `src/audio/synth.mjs`（纯数学合成，固定种子） |
| 配色 / 字体 | `src/theme.ts` |
| 取用素材图 | 替换 `public/assets/` 同名文件 |
| 新增 / 删减场景 | `SCENE_ORDER` + 在 `scenes.tsx` 加组件 |

## 确定性说明（可重复导出）

- 所有「随机」装饰（粒子位置、漂移）由 `mulberry32(种子)` 驱动，种子固定。
- 动画完全由全局帧号 `useCurrentFrame()` 推导，无任何 `Math.random()` / 时钟依赖。
- 音乐与音效由脚本逐样本合成，字节级可复现。
- 因此：同一台机器、同一份源码，`npm run render` 两次得到**逐帧一致**的 MP4。

## 已交付物

1. **可播放 MP4** —— `out/smart-warehouse-intro.mp4`
2. **源码** —— 本目录 `src/` + 配置文件
3. **素材清单** —— `ASSET_MANIFEST.md`
4. **重新导出方法** —— 本文档（README.md）
5. **提示词** —— `VIDEO_PROMPT.md`
