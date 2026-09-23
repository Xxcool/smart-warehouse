# 智慧仓储数字孪生平台 (smart-warehouse)

[![Live Demo](https://img.shields.io/badge/Live_Demo-Online-success?style=for-the-badge&logo=vercel)](https://smart-warehouse-wine.vercel.app)
[![Vue 3](https://img.shields.io/badge/Vue-3.5-42b883?style=for-the-badge&logo=vuedotjs)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r169-black?style=for-the-badge&logo=threedotjs)](https://threejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Author: Xxcool](https://img.shields.io/badge/Author-Xxcool-181717?style=for-the-badge&logo=github)](https://github.com/Xxcool)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

🔗 **在线体验地址**：[https://smart-warehouse-wine.vercel.app](https://smart-warehouse-wine.vercel.app)

<div align="center">
  <img src="docs/images/15_cyber_digital_twin.png" alt="智慧仓储数字孪生管控大屏运行全景" width="100%" />
</div>

基于 **Vue 3 + Vite + TypeScript + Three.js** 构建的 3D 智慧仓储与物流数字孪生管控平台。直观还原现代化智能物流园区的运转实况，包括自动化 AGV 物料循环搬运、立体仓库出入库、冷链气密仓恒温监控以及月台货车装卸流程，支持科技夜景与明亮白昼双风格切换。

---

## 📸 效果展示 (Showcase)

| 🌙 赛博夜景模式 | ☀️ 白昼展厅模式 |
| :---: | :---: |
| ![赛博夜景全景](docs/images/15_cyber_digital_twin.png) | ![白昼展厅沙盘](docs/images/11_studio_day_theme.png) |

| 🚚 货车高透车窗与驾驶室内饰 | 🚛 清漆车身与防眩车灯细节 |
| :---: | :---: |
| ![货车座舱内饰与高透车窗](docs/images/17_truck_cockpit_interior.png) | ![货车车身与车灯细节](docs/images/18_truck_pbr_clearcoat.png) |

| 📺 仓内自发光全息数据大屏 | 🛰️ 设备点击吸附卡片 |
| :---: | :---: |
| ![室内自发光全息数据大屏](docs/images/16_holo_screen_telemetry.png) | ![设备点击吸附卡片](docs/images/09_cyber_hud_with_popup.png) |

---

## 🌟 核心功能 (Features)

- **🌓 双视觉主题无损切换**：
  - **赛博深空模式**：通透深晶蓝地坪搭配青蓝激光导引线与荧光指示，营造浓厚的未来工业科技感；
  - **白昼展厅模式**：明亮素雅的浅灰沙盘展台质感，清晰呈现设备机械轮廓与建筑空间结构；
  - 顶部导航栏支持一键无感切换，灯光色温与地坪材质自动平滑适配。

- **🤖 自动化 AGV 闭环物料搬运**：
  - 多台 AGV 循迹小车沿地面导向线有序运转，模拟流水线取货、重载运输、立库卸货与空车回流的完整搬运闭环；
  - 箱件在转运过程中保持颜色与属性的一致性，各车自适应过弯与防碰。

- **🚚 工业货车与座舱细节透视**：
  - 货车挡风玻璃与车窗采用透明物理玻璃质感，可透过车窗清晰看清内部方向盘、中控液晶屏与座椅等座舱内饰；
  - 大灯、雾灯与车顶示宽小灯均经过防频闪优化，在远近各种视角及车辆行驶中始终稳定明亮；
  - 外部公路采用自然真实的工业深灰沥青色，与库区地坪层次分明。

- **📊 仓内全息遥测大屏**：
  - 仓库内醒目位置竖立自发光全息大屏，动态呈现 AGV 运行轨迹波形、恒温冷库指标（-18.2℃）、月台泊位状态及实时吞吐率。

- **🖥️ 业务监控面板 (HUD)**：
  - **顶栏**：集成动态时钟、天气温湿度监控与全屏切换；
  - **左侧态势栏**：展示今日仓储吞吐、AGV 运行调度与高位货架利用率；
  - **右侧控制栏**：实时监控 3 大装卸月台泊位与冷库状态，提供 3D 视角控制坞（放大、缩小、复位、顶视、暂停/继续动画）。

- **🔍 智能交互与平滑运镜**：
  - 点击场景中的任意设备（货车、AGV、传送带、机械臂、托盘垛等），摄像机镜头会自动平滑由远及近推送到目标上方；
  - 伴随吸附式信息弹窗展示该设备的实时运行参数，点击场景任意空白处可平滑退出并继续自由漫游。

---

## 🛠️ 技术栈 (Tech Stack)

* **核心框架**：Vue 3 (`Composition API`, `<script setup>`)
* **构建工具**：Vite 5
* **开发语言**：TypeScript 5
* **三维引擎**：Three.js (`WebGLRenderer`, `PerspectiveCamera`, `OrbitControls`)
* **三维建模**：Blender 5.2.2 LTS (PBR 材质、GLTF 2.0 规范导出)

---

## 📁 项目结构 (Project Structure)

```text
smart-warehouse/
├── docs/                          # 设计说明与高清效果图集
├── public/
│   ├── smart_warehouse.glb        # 3D 核心仓储数字孪生模型文件
│   └── models/
├── src/
│   ├── components/                # 工业大屏各业务 HUD 组件与弹窗
│   ├── core/
│   │   ├── WarehouseScene.ts      # Three.js 核心场景管理器与渲染驱动
│   │   └── constants.ts           # 场景业务指标与设备数据字典
│   ├── types/                     # TypeScript 类型定义
│   ├── App.vue                    # 主界面与 3D 画布容器
│   └── main.ts                    # 入口文件
├── index.html                     # 页面 HTML
├── package.json                   # 项目依赖配置
└── README.md                      # 项目说明文档
```

---

## 🚀 本地运行 (Quick Start)

```bash
# 1. 克隆代码仓库
git clone https://github.com/Xxcool/smart-warehouse.git
cd smart-warehouse

# 2. 安装项目依赖
npm install # 或 pnpm install

# 3. 启动本地开发服务 (默认端口 8088)
npm run dev

# 4. 构建生产产物
npm run build
```

---

## ⌨️ 常用快捷键 (Shortcuts)

| 按键 | 说明 |
| :--- | :--- |
| `+` / `=` | 拉近视角 (Zoom In) |
| `-` | 拉远视角 (Zoom Out) |
| `0` / `R` | 复位为默认等轴测视角 (Reset View) |
| `T` | 切换为垂直平面俯瞰视角 (Top View) |
| `Space` (空格) | 暂停 / 继续场景内物流运动动画 |

---

## 👨‍💻 作者 (Author)

* **Xxcool** - [GitHub (@Xxcool)](https://github.com/Xxcool) · [掘金技术主页](https://juejin.cn/user/4265760845468296/posts)

---

## 📄 开源许可 (License)

本项目遵循 [MIT License](LICENSE) 开源协议。
