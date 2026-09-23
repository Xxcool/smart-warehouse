# 智慧仓储数字孪生平台技术方案与架构规范 (Architecture Specification)

## 1. 系统概述与建设目标

智慧仓储数字孪生平台（`smart-warehouse`）是一套基于 WebGL 与现代前端工程化架构的工业级 3D 可视化智能管控系统。系统将实际物理仓储厂房、装卸月台、密集立体立垛、自动化分拣工作台、恒温冷链气密仓、AGV 自主巡线机器人及干线物流货车等关键要素进行全要素三维空间数字化建模，并通过高帧率动态仿真和实时传感数据驱动，实现仓储运营态势的全方位监控。

平台具备全域双视觉风格无损切换（赛博深空全息 vs 白昼展厅沙盘）、AGV 物料搬运完整装卸闭环、工业 5S 货区标线与圆角激光引导轨迹，以及全息数字孪生初始化控制舱。

---

## 2. 技术选型与分层架构

```mermaid
flowchart TD
    subgraph UI_Layer [大屏视图表现层 (Vue 3 SFC & Cyber HUD)]
        A1[HeaderBar.vue 52px 极简指挥顶栏与实时气象时钟]
        A2[LeftTelemetryHud.vue 左翼：全息运营态势监控 HUD]
        A3[RightEquipmentHud.vue 右翼：设施负荷与 3D 视角控制坞]
        A4[AnchoredPopup.vue 3D 实体吸附与自适应微晶弹窗]
        A5[LoadingOverlay.vue 全息初始化控制舱与三阶段遥测]
        A6[TipBar.vue 底部微晶交互指引胶囊]
    end

    subgraph Core_Layer [3D 数字孪生底层引擎 (TypeScript Class)]
        B1[SceneManager 场景/相机/日光/软阴影]
        B2[ThemeEngine 赛博深空 / 白昼展厅双主题渲染引擎]
        B3[ModelLoader Blender GLB 资产流式加载]
        B4[AgvClosedLoopController AGV 状态机与物料装卸闭环]
        B5[TruckController 干线公路巡航与车轮动力学联动]
        B6[ConveyorController 月台滚筒流水线多彩货物循环]
        B7[RaycasterPicker 空间射线拾取与 3D-to-2D 投影]
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
- **三维资产标准**：GLTF 2.0 (单二进制 `.glb`，全园区高精模型 1.86MB)
- **部署平台**：Vercel Edge Network (配备 `model/gltf-binary` MIME 与强缓存)

---

## 3. 三维空间坐标与资产建模规范

### 3.1 坐标系与空间基准
- **坐标系统**：右手法则笛卡尔坐标系（Three.js 标准），`X` 轴指向东侧道路，`Y` 轴竖直向上，`Z` 轴指向南侧出入口；
- **场景尺寸**：厂房主体占地约 `70m × 60m`，层高阶梯式剖切设计（`1.2m ~ 5.5m`），保证通透视野。

### 3.2 拓扑防冲突规范 (Anti-Z-Fighting)
- 所有贴近车身外壳或金属框架的构件（如重卡前挡风玻璃），在建模导出时须沿几何法线方向保持至少 `2.5cm`（`+0.025m`）的物理微凸间距，杜绝 GPU 深度缓冲区（Depth Buffer）浮点精度不足导致的斑驳闪烁。

### 3.3 工业 5S 地面标线与 AGV 激光引导轨迹规范
- **工业 5S 货区标线**：
  - 采用安全工程警示琥珀黄（`#f59e0b`，粗度 `0.06m`），严格按照矩形网格标注东侧托盘区（6×4 网格）、南侧高位库区（3×3 网格）、西侧周转区及 2/3 号月台装卸 Apron 方框；
  - 彻底清理淘汰遗留历史的对角线交叉混乱轨迹（如 `Neon_Track_East_Dock3_Spur`）。
- **AGV 激光引导轨迹**：
  - **多层工业导引带**：0.24m 宽度深色基础嵌带 + 0.07m 青蓝色荧光超导中心线（`#00f3ff`）；
  - **1.2m 平滑倒角**：转弯节点（东北角、东南角、西南角及 1 号月台接驳 S 弯）全部采用 `1.2m` 工业机器人圆角过渡；
  - **站点指示**：在关键作业工位（接驳装载点、分流卸货点）配备发光环形停靠光圈（`AGV_Waypoint_*`）与定向导流箭头。

---

## 4. 关键算法与业务实现方案

### 4.1 AGV 真实装卸物流全自主闭环
1. **物料流向闭环**：
   - **阶段 1 (接驳装载)**：空载 AGV 巡线至 1 号月台伸缩滚筒线末端工位，自动执行货物装载；
   - **阶段 2 (颜色属性同步)**：伸缩滚筒线上多彩货物（浅灰、青蓝、砖红等）被拾取时，颜色属性实时同步至 AGV 载荷，保持物流实体一致性；
   - **阶段 3 (重载运送)**：AGV 顶升托盘沿激光引导线重载匀速行驶，切线自对齐航向；
   - **阶段 4 (自动卸载与空车回流)**：到达指定立垛货架完成自动化落货，随后以空载状态沿回流轨道循环回驶。

### 4.2 全域双视觉主题引擎 (ThemeEngine)
- **赛博深空全息模式 (Cyber Immersion)**：
  - 背景：`#020617`（太空黑夜）+ 全息网格背景；
  - 地坪：深晶黑物理微晶地面；
  - 光轨：青蓝色超导激光轨迹（`#00f3ff`）开启自发光材质；
  - 厂房：深黑冷色外墙与高折射透明微晶玻璃。
- **白昼展厅沙盘模式 (Studio Day)**：
  - 背景：`#e2e8f0`（柔和浅天灰）；
  - 地坪：浅白灰哑光展台地面（`#f1f5f9`）；
  - 曝光：ACES Filmic 曝光自适应调节，环境半球光强化实体明暗反差。
- 支持顶部导航栏随时一键无损切换，材质属性平滑过渡无缝响应。

### 4.3 3D-to-2D 空间态势投影与防越界算法
1. **射线拾取**：监听画布 PointerUp 事件，通过 `Raycaster` 穿透检测模型网格，向上溯源识别绑定 `userData.entityKey` 的目标构件；
2. **投影变换**：将世界坐标通过相机投影矩阵转换为裁剪空间坐标，再映射为屏幕物理像素 `(rawX, rawY)`；
3. **自适应视口钳夹**：
   - 优先 Placement-Top（物体正上方展开）；
   - 当 `rawY < safeTop + 45` 时自动翻转至下方（Placement-Bottom）；
   - 卡片宽度固定 320px，左右施加弹性安全边距，小三角实时通过偏移量补偿精准指向目标点。

### 4.4 WebGL 独立相机 Dolly 变倍机制
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
