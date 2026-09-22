# 智慧仓储数字孪生平台技术方案与架构规范 (Architecture Specification)

## 1. 系统概述与建设目标

智慧仓储数字孪生平台（`smart-warehouse`）是一套基于 WebGL 与现代前端工程化架构的工业级 3D 可视化智能管控系统。系统将实际物理仓储厂房、装卸月台、密集立体立垛、自动化分拣工作台、恒温冷链气密仓、AGV 自主巡线机器人及干线物流货车等关键要素进行全要素三维空间数字化建模，并通过高帧率动态仿真和实时传感数据驱动，实现仓储运营态势的全方位监控。

---

## 2. 技术选型与分层架构

```mermaid
flowchart TD
    subgraph UI_Layer [大屏视图表现层 (Vue 3 SFC)]
        A1[HeaderBar.vue 实时指挥中心顶栏]
        A2[KpiRibbon.vue 核心运营 KPI 态势横幅]
        A3[FloatingControls.vue 悬浮多维视角控制坞]
        A4[AnchoredPopup.vue 3D 实体吸附与自适应弹窗]
        A5[LoadingOverlay.vue 渐进加载指示器]
    end

    subgraph Core_Layer [3D 数字孪生底层引擎 (TypeScript Class)]
        B1[SceneManager 场景/相机/日光/软阴影]
        B2[ModelLoader Blender GLB 资产流式加载]
        B3[AgvController 向心样条巡线与避障计算]
        B4[TruckController 干线公路巡航与车轮动力学联动]
        B5[ConveyorController 月台滚筒流水线物料循环]
        B6[RaycasterPicker 空间射线拾取与 3D-to-2D 投影]
    end

    subgraph Data_Layer [数据字典与遥测层]
        C1[constants.ts 库区设备传感指标数据字典]
        C2[warehouse.ts TypeScript 领域类型体系]
    end

    UI_Layer <--> Core_Layer
    Core_Layer <--> Data_Layer
```

### 核心技术栈：
- **三维渲染底座**：Three.js (`WebGLRenderer`, `PerspectiveCamera`, `OrbitControls`)
- **前端工程框架**：Vue 3 (`Composition API`, `<script setup>`)
- **构建与打包工具**：Vite 5
- **开发语言**：TypeScript 5 (严格模式)
- **三维资产标准**：GLTF 2.0 (单二进制 `.glb`，全园区模型 1.86MB)
- **部署平台**：Vercel Edge Network (配备 `model/gltf-binary` MIME 与强缓存)

---

## 3. 三维空间坐标与资产建模规范

### 3.1 坐标系与空间基准
- **坐标系统**：右手法则笛卡尔坐标系（Three.js 标准），`X` 轴指向东侧道路，`Y` 轴竖直向上，`Z` 轴指向南侧出入口；
- **场景尺寸**：厂房主体占地约 `70m × 60m`，层高阶梯式剖切设计（`1.2m ~ 5.5m`），保证通透视野。

### 3.2 拓扑防冲突规范 (Anti-Z-Fighting)
- 所有贴近车身外壳或金属框架的构件（如重卡前挡风玻璃），在建模导出时须沿几何法线方向保持至少 `2.5cm`（`+0.025m`）的物理微凸间距，杜绝 GPU 深度缓冲区（Depth Buffer）浮点精度不足导致的斑驳闪烁。

---

## 4. 关键算法与业务实现方案

### 4.1 AGV 向心样条巡线与走廊安全避碰方案
1. **导引线插值**：采用 `THREE.CatmullRomCurve3(points, true, 'centripetal', 0.05)` 对 12 个正交航点进行向心样条平滑插值，彻底消除直角拐弯处的机械顿挫；
2. **航向自对齐**：每帧提取前向切线矢量 $\vec{T} = \text{getTangentAt}(t)$，通过四元数 `setFromUnitVectors` 实时对齐车头行驶方向；
3. **南侧通道避让**：南区走廊中心线严格设定在 `Z = 4.95`，与中央工作台最南端（`Z = 4.18`）及南区托盘货垛最北端（`Z = 5.91`）均保留 `0.61m` 的工业安全净空，杜绝压线穿模。

### 4.2 3D-to-2D 空间态势投影与防越界算法
1. **射线拾取**：监听画布 PointerUp 事件，通过 `Raycaster` 穿透检测模型网格，向上溯源识别绑定 `userData.entityKey` 的目标构件；
2. **投影变换**：将世界坐标通过相机投影矩阵转换为裁剪空间坐标，再映射为屏幕物理像素 `(rawX, rawY)`；
3. **自适应视口钳夹**：
   - 优先 Placement-Top（物体正上方展开）；
   - 当 `rawY < safeTop + 45` 时自动翻转至下方（Placement-Bottom）；
   - 卡片宽度固定 320px，左右施加弹性安全边距，小三角实时通过偏移量补偿精准指向目标点。

### 4.3 WebGL 独立相机 Dolly 变倍机制
- 全局阻止原生浏览器手势（`gesturestart`、`gesturechange`）与滚轮页面缩放行为；
- 将用户缩放输入独占转化为相机沿视轴的前后位移（Dolly），确保大屏 UI 与传感器弹窗始终保持物理像素高保真。

---

## 5. 生产构建与缓存部署方案

### 5.1 Vite 生产优化策略
- 开启 `manualChunks` 将 `three` 与 `vue` 拆分为独立稳定缓存 chunk；
- 静态资产自动归类至 `dist/assets/` 与 `dist/models/`。

### 5.2 Vercel 静态强缓存配置 (`vercel.json`)
```json
{
  "headers": [
    {
      "source": "/(.*).glb",
      "headers": [
        { "key": "Content-Type", "value": "model/gltf-binary" },
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" },
        { "key": "Access-Control-Allow-Origin", "value": "*" }
      ]
    }
  ]
}
```
通过不可变强缓存，大幅缩短用户二次进入大屏的首屏加载时间（二次加载 0ms 网络开销）。
