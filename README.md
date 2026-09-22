# 智慧仓储数字孪生平台 (smart-warehouse)
> **Smart Warehouse Digital Twin Platform**

[![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel-success?style=for-the-badge&logo=vercel)](https://smart-warehouse-wine.vercel.app)
[![Vue 3](https://img.shields.io/badge/Vue-3.5-42b883?style=for-the-badge&logo=vuedotjs)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r169-black?style=for-the-badge&logo=threedotjs)](https://threejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

🔗 **公网在线体验地址 (Live Demo)**：[https://smart-warehouse-wine.vercel.app](https://smart-warehouse-wine.vercel.app)

一个基于 **Vue 3 + Vite + TypeScript + Three.js** 与 **Blender 5.2.2 LTS 高精建模** 的现代化工业级 3D 智慧物流与冷链数字孪生管控大屏系统。

---

## 🌟 核心特性 (Key Features)

- **现代化前端工程架构**：
  - 基于 **Vue 3 + Vite 5 + TypeScript** 全栈工程化，零运行时包袱，极速 HMR 热更新；
  - 3D 渲染核心引擎与大屏 UI 组件（Header、KPI、控制坞、交互弹窗）完全解耦，模块化高内聚；
  - 静态资源经 Vite 自动化按需分包优化与强缓存处理。
- **清爽工业风剖切厂房 (Clean Isometric Digital Twin)**：
  - 阶梯式剖切建筑墙体（1.2m ~ 5.5m），视野通透无死角；
  - 完整呈现 3 个带柔性密封罩的装卸月台（Loading Docks）、双立柱高密度托盘立垛区、中央矩阵分拣工作台与负压隔离冷链气密仓。
- **全自主动态物流仿真**：
  - **7 台 AGV 搬运机器人**：沿地面青蓝色正交闭环光轨平滑差速循环巡线，具备航向切线自动对齐与激光避障姿态；
  - **1号月台自动化伸缩滚筒线**：源源不断将冷链卡车尾门箱件自动化输送至室内分拣工作台；
  - **外部公路重卡动态巡航**：东侧外围直行主干道（X = 28.5m）重型物流车平稳行驶，与靠泊装卸车辆留有安全车距，彻底消除碰撞与穿模。
- **高精材质与无损渲染**：
  - Blender 拓扑级优化，前挡风玻璃无深度冲突（Z-fighting）闪烁花屏；
  - ACES Filmic 色调映射、全场景 PCF 柔和软阴影与通透天光系统。
- **数字化指挥中心 Header 与实时微环境感知**：
  - 秒级动态跳动数字时钟（`YYYY年MM月DD日 星期X HH:mm:ss`）；
  - 实时微环境气象监测（温度、相对湿度、AQI 空气质量、风向风级）；
  - 核心运营 KPI 胶囊横幅（今日吞吐量、AGV 在线率、月台泊位负荷、冷库核心温控、高位立体库容率）。
- **专业级交互与防误触隔离**：
  - **纯 WebGL 相机 Dolly 缩放**：严格拦截浏览器全局 Page Zoom 手势与按键，缩放仅作用于三维摄像机，网页 UI 与数据卡片 100% 保持固定清晰像素；
  - **智能上下翻转 HUD 浮窗**：轻点任意工位电脑、托盘堆、冷库门、AGV 或货车即刻呼出传感卡片，靠近顶栏自动翻转至物体下方，视口边缘弹性吸附，100% 绝不溢出屏幕；
  - **悬浮视角控制坞**：支持一键「放大」、「缩小」、「复位视角」、「顶视图」与「暂停/恢复运动」。

---

## 🛠️ 技术栈 (Tech Stack)

* **应用框架**：Vue 3 (`Composition API`, `<script setup>`)
* **构建工具**：Vite 5
* **编程语言**：TypeScript 5
* **三维渲染引擎**：Three.js (`WebGLRenderer`, `PerspectiveCamera`, `OrbitControls`)
* **模型资产构建**：Blender 5.2.2 LTS (PBR 材质、GLTF 2.0 规范，全场景优化至 1.8 MB)
* **部署平台**：Vercel (原生 Vite 支持 + 静态资源强缓存路由优化)

---

## 📁 目录结构 (Directory Structure)

```text
smart-warehouse/
├── public/
│   ├── smart_warehouse.glb        # Blender 高精三维孪生模型
│   └── models/
├── src/
│   ├── components/
│   │   ├── HeaderBar.vue          # 数字化指挥中心顶栏与实时气象时钟
│   │   ├── KpiRibbon.vue          # 核心 KPI 运营态势横幅条
│   │   ├── FloatingControls.vue   # 悬浮视角控制坞
│   │   ├── AnchoredPopup.vue      # 3D 实体吸附与自适应防越界弹窗
│   │   ├── LoadingOverlay.vue     # 平滑场景加载指示器
│   │   └── TipBar.vue             # 底部操作提示栏
│   ├── core/
│   │   ├── WarehouseScene.ts      # Three.js 场景管理器、动画驱动与事件调度
│   │   └── constants.ts           # 场景业务数据字典与配置
│   ├── types/
│   │   └── warehouse.ts           # TypeScript 类型声明
│   ├── App.vue                    # 应用根组件
│   ├── main.ts                    # 应用入口
│   └── vite-env.d.ts
├── index.html                     # 根 HTML 模板
├── package.json                   # 依赖与脚本
├── tsconfig.json                  # TypeScript 编译配置
├── vite.config.ts                 # Vite 构建配置
├── vercel.json                    # Vercel 部署路由与 GLB 缓存配置
└── README.md                      # 项目说明文档
```

---

## 🚀 本地快速启动 (Local Development)

```bash
# 1. 克隆或进入项目目录
cd smart-warehouse

# 2. 安装依赖
npm install # 或 pnpm install

# 3. 启动开发服务器 (默认端口 8088)
npm run dev

# 4. 构建生产产物
npm run build

# 5. 本地预览生产构建
npm run preview
```

---

## ☁️ Vercel 一键部署 (Vercel Deployment)

本项目已配置标准 `vercel.json`，构建命令自动指向 `npm run build`，输出目录为 `dist`：
1. 推送代码至 GitHub 仓库；
2. 登录 [Vercel](https://vercel.com/)，点击 **「Add New...」 -> 「Project」**；
3. 选择导入 GitHub 仓库 **`smart-warehouse`**；
4. Vercel 将自动识别 Vite 框架，点击 **「Deploy」** 即可一键完成全自动化构建部署！

---

## ⌨️ 键盘快捷键 (Shortcuts)

| 按键 | 功能说明 |
| :--- | :--- |
| `+` / `=` | 拉近相机视角 (Zoom In) |
| `-` | 拉远相机视角 (Zoom Out) |
| `0` / `R` | 复位为标准等轴测默认视角 (Reset View) |
| `T` | 切换为垂直平面俯瞰视角 (Top View) |
| `Space` (空格) | 暂停 / 恢复场景内所有物流运动动画 |

---

## 📄 开源许可证 (License)

本项目遵循 [MIT License](LICENSE) 开源协议。
