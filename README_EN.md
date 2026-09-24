# Smart Warehouse 3D Digital Twin Platform (smart-warehouse)

<p align="left">
  <a href="./README.md">简体中文</a> | <b>English</b>
</p>

[![Live Demo](https://img.shields.io/badge/Live_Demo-Online-success?style=for-the-badge&logo=vercel)](https://smart-warehouse-wine.vercel.app)
[![Vue 3](https://img.shields.io/badge/Vue-3.5-42b883?style=for-the-badge&logo=vuedotjs)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r169-black?style=for-the-badge&logo=threedotjs)](https://threejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Author: Xxcool](https://img.shields.io/badge/Author-Xxcool-181717?style=for-the-badge&logo=github)](https://github.com/Xxcool)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

🔗 **Live Demo**: [https://smart-warehouse-wine.vercel.app](https://smart-warehouse-wine.vercel.app)

<div align="center">
  <img src="docs/images/15_cyber_digital_twin.png" alt="Smart Warehouse Digital Twin Control Center Overview" width="100%" />
</div>

An industrial-grade 3D smart warehouse and logistics digital twin management platform built with **Vue 3 + Vite + TypeScript + Three.js**. It intuitively reproduces the real-time operations of a modern intelligent logistics park—featuring autonomous AGV closed-loop material handling, automated stereoscopic storage and retrieval (ASRS), cold-chain airtight chamber temperature monitoring, and loading dock truck logistics. Supports seamless zero-latency switching between futuristic Cyber Night and Studio Day visual themes.

---

## 📑 Table of Contents

- [📸 Showcase](#showcase)
- [🌟 Key Features](#key-features)
- [🛠️ Tech Stack](#tech-stack)
- [🏗️ System Architecture](#system-architecture)
- [📁 Project Structure](#project-structure)
- [🚀 Quick Start](#quick-start)
- [⌨️ Keyboard Shortcuts](#keyboard-shortcuts)
- [👨‍💻 Author](#author)
- [📄 License](#license)

---

## 📸 Showcase

| 🌙 Cyber Night Mode | ☀️ Studio Day Mode |
| :---: | :---: |
| ![Cyber Night Overview](docs/images/15_cyber_digital_twin.png) | ![Studio Day Overview](docs/images/11_studio_day_theme.png) |

| 🚚 Heavy Truck Transparent Windows & Interior | 🚛 Clearcoat Paint & Anti-Flicker Headlights |
| :---: | :---: |
| ![Truck Cabin Interior & Transparent Windows](docs/images/17_truck_cockpit_interior.png) | ![Truck Body Paint & Anti-Glare Headlights](docs/images/18_truck_pbr_clearcoat.png) |

| 📺 In-Warehouse Emissive Holographic Telemetry Screen | 🛰️ Interactive Device Inspector & HUD Cards |
| :---: | :---: |
| ![In-Warehouse Emissive Holographic Screen](docs/images/16_holo_screen_telemetry.png) | ![Interactive Device Inspector & HUD Cards](docs/images/09_cyber_hud_with_popup.png) |

---

## 🌟 Key Features

- **🌓 Dual Visual Theme Switching**:
  - **Cyber Deep Space Mode**: Translucent crystalline dark-blue floor paired with cyan-blue laser guide tracks and neon accents, delivering a high-tech futuristic industrial aesthetic.
  - **Studio Day Mode**: Crisp, minimalist light-gray exhibition showroom style, highlighting mechanical silhouettes and spatial warehouse structures.
  - One-click seamless theme toggling via the top navigation bar, with automatic transitions for lighting color temperature and ground PBR materials.

- **🤖 Autonomous AGV Closed-Loop Material Handling**:
  - Multiple AGV robots navigate along floor magnetic/laser guidance tracks in a complete operational cycle: dispatch, cargo pickup, heavy-load transport, automated rack unloading, and empty return.
  - Dynamic pallet box persistence maintaining consistent colors and attributes throughout transit, equipped with adaptive cornering and collision avoidance.

- **🚚 Heavy Industrial Truck & Cabin Details**:
  - Physically accurate transparent glass shaders for the windshield and side windows, revealing the detailed cabin interior including the steering wheel, center console LCD display, and seats.
  - Headlights, fog lights, and roof clearance lamps are anti-flicker optimized (using non-coplanar offsets and polygon offsets) to remain stable, crisp, and glare-free at all viewing distances and motion states.
  - External roadway rendered in realistic deep-gray industrial asphalt, creating a clear visual hierarchy with the warehouse floor.

- **📊 In-Warehouse Holographic Telemetry Screen**:
  - A prominent self-luminous holographic display positioned inside the facility, rendering real-time AGV telemetry waveforms, cold-chain storage metrics (-18.2°C), loading dock bay statuses, and warehouse throughput.

- **🖥️ Mission Control HUD & Telemetry Panels**:
  - **Top Bar**: Integrated real-time clock, weather and humidity monitors, and fullscreen toggle.
  - **Left Telemetry Dock**: Live overview of daily throughput, AGV fleet scheduling, and high-bay racking utilization.
  - **Right Control Dock**: Real-time status monitoring of 3 dock loading bays and cold-chain chambers, plus a 3D camera control dock (Zoom In, Zoom Out, Reset, Top View, Play/Pause animation).

- **🔍 Interactive Raycasting & Smooth Cinematic Camera Transitions**:
  - Click any equipment in the scene (trucks, AGVs, conveyors, robotic arms, pallet stacks) to smoothly push the camera towards the target.
  - Contextual HUD popup anchored to the selected asset displaying real-time operational parameters; click anywhere in empty space to smoothly exit and resume free navigation.

---

## 🛠️ Tech Stack

* **Frontend Framework**: Vue 3 (`Composition API`, `<script setup>`)
* **Build Tool**: Vite 5
* **Programming Language**: TypeScript 5 (Strict Mode)
* **3D Engine**: Three.js (`WebGLRenderer`, `PerspectiveCamera`, `OrbitControls`)
* **3D Modeling & Pipeline**: Blender 5.2.2 LTS (PBR Materials, GLTF 2.0 Binary Export)

---

## 🏗️ System Architecture

The platform separates rendering concerns into a modular multi-tier architecture:

```mermaid
flowchart TD
    subgraph UI_Layer ["View & Cyber HUD Layer (Vue 3 SFC)"]
        A1["HeaderBar.vue - Mission Header & Weather Clock"]
        A2["LeftTelemetryHud.vue - Operation Telemetry HUD"]
        A3["RightEquipmentHud.vue - Facilities & 3D Camera Dock"]
        A4["AnchoredPopup.vue - 3D Entity Anchored Popup"]
        A5["LoadingOverlay.vue - Holographic Init Dock & Telemetry"]
        A6["TipBar.vue - Interaction Tip Capsule"]
    end

    subgraph Core_Layer ["3D Digital Twin Engine (TypeScript)"]
        B1["WarehouseScene - Scene / Camera / Sunlight / Shadows"]
        B2["ThemeEngine - Cyber Immersion / Studio Day Themes"]
        B3["ModelLoader - Streaming GLB Asset Pipeline"]
        B4["AgvController - AGV Finite State Machine & Cargo Loop"]
        B5["TruckController - Road Cruising & Wheel Dynamics"]
        B6["ConveyorController - Dock Roller Sorters"]
        B7["RaycasterPicker - 3D Raycasting & Screen Projection"]
    end

    subgraph Data_Layer ["Data Dictionary & Telemetry"]
        C1["constants.ts - IoT Sensor Metrics Dictionary"]
        C2["warehouse.ts - TypeScript Domain Type System"]
    end

    UI_Layer <--> Core_Layer
    Core_Layer <--> Data_Layer
```

For more architectural details, please refer to the [Architecture Specification](docs/ARCHITECTURE.md).

---

## 📁 Project Structure

```text
smart-warehouse/
├── docs/                          # Architectural documentation & HD showcase gallery
├── public/
│   ├── smart_warehouse.glb        # High-precision 3D warehouse digital twin model
│   └── models/
├── src/
│   ├── components/                # HUD overlay components & popup dialogs
│   ├── core/
│   │   ├── WarehouseScene.ts      # Three.js core scene manager & render loop
│   │   └── constants.ts           # IoT metrics & equipment data dictionary
│   ├── types/                     # TypeScript type definitions
│   ├── App.vue                    # Main container & 3D canvas viewport
│   └── main.ts                    # Application entry point
├── index.html                     # HTML template
├── package.json                   # Dependencies and scripts
├── README.md                      # Chinese Documentation (中文文档)
└── README_EN.md                   # English Documentation (英文文档)
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js (>= 18.0.0)
- npm or pnpm

### Installation & Run

```bash
# 1. Clone the repository
git clone https://github.com/Xxcool/smart-warehouse.git
cd smart-warehouse

# 2. Install dependencies
npm install # or pnpm install

# 3. Start local development server (default port: 8088)
npm run dev

# 4. Build for production
npm run build

# 5. Preview production build locally
npm run preview
```

Open your browser at `http://localhost:8088` to explore the digital twin platform.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Description |
| :--- | :--- |
| `+` / `=` | Zoom In |
| `-` | Zoom Out |
| `0` / `R` | Reset to Default Isometric View |
| `T` | Switch to Top-Down Orthographic View |
| `Space` | Pause / Resume Scene Simulation Animations |

---

## 👨‍💻 Author

* **Xxcool** - [GitHub (@Xxcool)](https://github.com/Xxcool) · [Juejin Profile](https://juejin.cn/user/4265760845468296/posts)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
