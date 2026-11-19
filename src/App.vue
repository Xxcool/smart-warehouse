<template>
  <div class="smart-warehouse-app" :class="{ 'is-compact': isCompact }">
    <LoadingOverlay ref="loadingRef" @retry="initializeScene" />

    <div v-if="!isCleanMode" class="hud-layer" :inert="!sceneReady">
      <HeaderBar :theme="currentTheme" @toggle-theme="handleToggleTheme" />
      <LeftTelemetryHud :fleet="fleet" :is-paused="isPaused" :expanded="openPanel === 'operations'" />
      <RightEquipmentHud
        :current-mode="viewMode"
        :is-paused="isPaused"
        :expanded="openPanel === 'facilities'"
        @zoom-in="handleZoom(0.80)"
        @zoom-out="handleZoom(1.25)"
        @reset-view="handleResetView"
        @top-view="handleTopView"
        @toggle-play="handleTogglePlay"
      />
      <nav v-if="isCompact" class="compact-panel-switcher" aria-label="仓储指标面板">
        <button
          type="button"
          aria-controls="warehouse-operations"
          :aria-expanded="openPanel === 'operations'"
          @click="togglePanel('operations')"
        >运营态势</button>
        <button
          type="button"
          aria-controls="warehouse-facilities"
          :aria-expanded="openPanel === 'facilities'"
          @click="togglePanel('facilities')"
        >设施与冷链</button>
      </nav>
      <TipBar />
    </div>

    <AnchoredPopup
      :visible="popupDetail !== null"
      :detail="popupDetail"
      :screen-x="popupPos.x"
      :screen-y="popupPos.y"
      :behind-camera="popupBehind"
      :safe-left="safeBounds.left"
      :safe-right="safeBounds.right"
      :safe-bottom="safeBounds.bottom"
      @close="closePopup"
    />

    <div ref="canvasContainer" class="canvas-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import HeaderBar from './components/HeaderBar.vue';
import LeftTelemetryHud from './components/LeftTelemetryHud.vue';
import RightEquipmentHud from './components/RightEquipmentHud.vue';
import TipBar from './components/TipBar.vue';
import AnchoredPopup from './components/AnchoredPopup.vue';
import LoadingOverlay from './components/LoadingOverlay.vue';
import { WarehouseScene } from './core/WarehouseScene';
import { AGV_PHASE_LABELS } from './core/agvSimulation';
import { ENTITY_DATA } from './core/constants';
import type { AgvFleet, EntityDetail, EntityKey, EntitySelection, ViewMode } from './types/warehouse';

type CompactPanel = 'operations' | 'facilities';
const params = new URLSearchParams(window.location.search);
const isCleanMode = params.get('clean') === '1';
const canvasContainer = ref<HTMLElement | null>(null);
const loadingRef = ref<InstanceType<typeof LoadingOverlay> | null>(null);
const sceneReady = ref(false);
const viewMode = ref<ViewMode>('reset');
const isPaused = ref(false);
const currentTheme = ref<'cyber' | 'studio'>('cyber');
const openPanel = ref<CompactPanel | null>(null);
const fleet = ref<AgvFleet>({ vehicles: [], speed: 0, lapSeconds: 0 });
let sceneInstance: WarehouseScene | null = null;

const selection = ref<EntitySelection | null>(null);
const popupPos = ref({ x: 0, y: 0 });
const popupBehind = ref(false);
const popupDetail = computed<EntityDetail | null>(() => {
  const selected = selection.value;
  if (!selected) return null;
  if (selected.key !== 'agv_robot') return ENTITY_DATA[selected.key];

  const vehicle = fleet.value.vehicles.find(({ id }) => id === selected.agvId);
  if (!vehicle) return null;

  const phase = AGV_PHASE_LABELS[vehicle.phase];
  const speed = isPaused.value ? 0 : fleet.value.speed;
  return {
    title: 'AGV 搬运机器人',
    sub: '闭环搬运仿真',
    tag: isPaused.value ? '已暂停' : phase,
    rows: [
      { l: '设备编号', v: 'AGV-RoboCarrier-' + String(vehicle.id).padStart(2, '0'), blue: true },
      { l: '当前工序', v: phase },
      { l: '载货状态', v: vehicle.hasCargo ? '载货' : '空载', green: vehicle.hasCargo },
      { l: '运行速度', v: speed.toFixed(2) + ' m/s' }
    ]
  };
});

const viewport = ref({ width: window.innerWidth, height: window.innerHeight });
const isCompact = computed(() => viewport.value.width <= 1050 || viewport.value.height <= 680);
const safeBounds = computed(() => {
  const margin = isCompact.value || isCleanMode ? 12 : 344;
  return {
    left: margin,
    right: viewport.value.width - margin,
    bottom: viewport.value.height - (isCompact.value && !isCleanMode ? 138 : 24)
  };
});

function handleResize() {
  viewport.value = { width: window.innerWidth, height: window.innerHeight };
  if (!isCompact.value) openPanel.value = null;
}

function closePopup() {
  selection.value = null;
  sceneInstance?.clearTrackedAnchor();
}

function togglePanel(panel: CompactPanel) {
  openPanel.value = openPanel.value === panel ? null : panel;
  closePopup();
}

function handleToggleTheme() {
  if (sceneInstance) currentTheme.value = sceneInstance.toggleTheme();
}

function handleZoom(ratio: number) {
  sceneInstance?.zoomCamera(ratio);
  if (viewMode.value === 'reset') viewMode.value = 'custom';
}

function handleResetView() {
  sceneInstance?.resetCameraView();
  viewMode.value = 'reset';
}

function handleTopView() {
  sceneInstance?.setTopView();
  viewMode.value = 'top';
}

function handleTogglePlay() {
  if (!sceneReady.value || !sceneInstance) return;
  isPaused.value = !isPaused.value;
  sceneInstance.setAnimationPaused(isPaused.value);
}

function handleKeydown(event: KeyboardEvent) {
  if (!sceneReady.value || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
  const target = event.target;
  if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable]')) return;

  if (event.code === 'Space') {
    // 聚焦按钮时让其使用原生的空格点击逻辑，避免触发两次。
    if (target instanceof HTMLElement && target.closest('button, a, [role="button"]')) return;
    event.preventDefault();
    if (!event.repeat) handleTogglePlay();
    return;
  }

  switch (event.key.toLowerCase()) {
    case 't':
      handleTopView();
      break;
    case '0':
    case 'r':
      handleResetView();
      break;
    case '+':
    case '=':
      handleZoom(0.85);
      break;
    case '-':
      handleZoom(1.18);
      break;
    case 'escape':
      openPanel.value = null;
      closePopup();
      break;
  }
}

async function initializeScene() {
  if (!canvasContainer.value || sceneInstance) return;
  loadingRef.value?.reset();

  let scene: WarehouseScene;
  try {
    scene = new WarehouseScene(canvasContainer.value);
  } catch (error) {
    console.error('图形初始化失败', error);
    loadingRef.value?.setError('无法启动 WebGL。请启用浏览器硬件加速或换用支持 WebGL 2 的浏览器，然后重试。');
    return;
  }

  sceneInstance = scene;
  scene.onPick((entity) => {
    openPanel.value = null;
    selection.value = entity;
    viewMode.value = 'custom';
  });
  scene.onFleetUpdate((snapshot) => { fleet.value = snapshot; });
  scene.onManualView(() => { viewMode.value = 'custom'; });
  scene.onBlankClick(closePopup);
  scene.onPositionUpdate((x, y, behind) => {
    popupPos.value = { x, y };
    popupBehind.value = behind;
  });

  try {
    await scene.loadModel((percent) => loadingRef.value?.updateProgress(percent));
    if (scene !== sceneInstance) return;

    if (params.get('preview') === 'loading') {
      scene.setAnimationPaused(true);
      loadingRef.value?.updateProgress(68);
      return;
    }

    sceneReady.value = true;
    loadingRef.value?.complete();

    if (params.get('theme') === 'studio') {
      scene.setTheme('studio');
      currentTheme.value = 'studio';
    }
    if (params.get('view') === 'top') handleTopView();
    if (params.get('view') === 'screen') {
      scene.focusHoloScreen();
      viewMode.value = 'custom';
    }
    if (params.get('focus') === 'truck') {
      scene.focusOnEntity('truck_dock2', [20.04, 1.5, 3.0]);
      viewMode.value = 'custom';
    }
    if (params.get('focus') === 'cockpit') {
      scene.focusOnTruckCockpit();
      viewMode.value = 'custom';
    }
    if (params.get('preview') === 'popup') {
      scene.selectEntityByKey((params.get('target') || 'pc_workstation') as EntityKey);
    }
  } catch (error) {
    if (scene !== sceneInstance) return;
    console.error('模型加载失败', error);
    scene.destroy();
    sceneInstance = null;
    sceneReady.value = false;
    loadingRef.value?.setError('仓库模型加载失败。请检查网络后重试。');
  }
}

const previewWindow = window as Window & { __showEntityPopup?: (key?: EntityKey) => void };

onMounted(() => {
  window.addEventListener('resize', handleResize);
  window.addEventListener('keydown', handleKeydown);
  previewWindow.__showEntityPopup = (key = 'pc_workstation') => sceneInstance?.selectEntityByKey(key);
  void initializeScene();
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('keydown', handleKeydown);
  delete previewWindow.__showEntityPopup;
  sceneInstance?.destroy();
  sceneInstance = null;
});
</script>

<style>
/* 全局基础重置与暗色主题背景 */
*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
  -webkit-text-size-adjust: 100%;
  background: #080d17;
  color: #f1f5f9;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
}

.smart-warehouse-app {
  width: 100%;
  height: 100vh;
  height: 100dvh;
  position: relative;
  overflow: hidden;
  background: #080d17;
}

.canvas-container {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.hud-layer {
  display: contents;
}

.smart-warehouse-app button:focus-visible {
  outline: 2px solid #91f3ff;
  outline-offset: 2px;
}

.smart-warehouse-app.is-compact {
  --hud-top-inset: env(safe-area-inset-top, 0px);
  --hud-bottom-inset: env(safe-area-inset-bottom, 0px);
  --hud-rail-width: min(480px, calc(100% - 24px));
}

.smart-warehouse-app.is-compact .digital-twin-header {
  gap: 8px;
  height: calc(54px + var(--hud-top-inset));
  padding: var(--hud-top-inset) max(12px, env(safe-area-inset-right)) 0 max(12px, env(safe-area-inset-left));
}

.smart-warehouse-app.is-compact .header-left-group,
.smart-warehouse-app.is-compact .sub-title-track,
.smart-warehouse-app.is-compact .weather-card,
.smart-warehouse-app.is-compact .header-v-divider,
.smart-warehouse-app.is-compact .clock-card,
.smart-warehouse-app.is-compact .tip-bar {
  display: none;
}

.smart-warehouse-app.is-compact .header-center-group {
  position: static;
  align-items: flex-start;
  transform: none;
  min-width: 0;
}

.smart-warehouse-app.is-compact .main-title {
  font-size: clamp(13px, 4vw, 17px);
  letter-spacing: 0;
}

.smart-warehouse-app.is-compact .header-right-group {
  flex-shrink: 0;
  gap: 6px;
}

.smart-warehouse-app.is-compact .theme-toggle-btn,
.smart-warehouse-app.is-compact .fullscreen-btn {
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
}

.smart-warehouse-app.is-compact .theme-btn-text {
  display: none;
}

.smart-warehouse-app.is-compact .right-equipment-hud {
  display: contents;
}

.smart-warehouse-app.is-compact .left-telemetry-hud,
.smart-warehouse-app.is-compact .equipment-metrics {
  display: none;
  position: absolute;
  inset: calc(62px + var(--hud-top-inset)) auto auto 50%;
  transform: translateX(-50%);
  z-index: 23;
  width: var(--hud-rail-width);
  max-height: calc(100% - 184px - var(--hud-top-inset) - var(--hud-bottom-inset));
  overflow-y: auto;
  overscroll-behavior: contain;
  touch-action: pan-y;
  pointer-events: auto;
}

.smart-warehouse-app.is-compact .left-telemetry-hud.panel-open,
.smart-warehouse-app.is-compact .equipment-metrics.panel-open {
  display: flex;
}

.smart-warehouse-app.is-compact .left-telemetry-hud .hud-card,
.smart-warehouse-app.is-compact .equipment-metrics .hud-card {
  flex-shrink: 0;
}

.smart-warehouse-app.is-compact .controls-card,
.compact-panel-switcher {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  z-index: 24;
  width: var(--hud-rail-width);
}

.smart-warehouse-app.is-compact .controls-card {
  bottom: calc(58px + var(--hud-bottom-inset));
  display: flex;
  gap: 6px;
  padding: 6px;
}

.smart-warehouse-app.is-compact .controls-card .hud-card-header,
.smart-warehouse-app.is-compact .playback-label {
  display: none;
}

.smart-warehouse-app.is-compact .controls-action-grid {
  flex: 1;
  min-width: 0;
  margin: 0;
}

.smart-warehouse-app.is-compact .ctrl-btn,
.smart-warehouse-app.is-compact .playback-btn {
  min-height: 44px;
}

.smart-warehouse-app.is-compact .playback-btn {
  width: auto;
  min-width: 64px;
  gap: 4px;
  padding-inline: 6px;
}

.smart-warehouse-app.is-compact .playback-label-short {
  display: inline;
}

.compact-panel-switcher {
  bottom: calc(8px + var(--hud-bottom-inset));
  display: flex;
  gap: 6px;
}

.compact-panel-switcher button {
  flex: 1;
  min-height: 44px;
  border: 1px solid rgba(93, 133, 158, 0.45);
  border-radius: 9px;
  background: #101a29;
  color: #e2e8f0;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.compact-panel-switcher button[aria-expanded="true"] {
  border-color: #67e8f9;
  background: #103044;
  color: #b8f7ff;
}
</style>
