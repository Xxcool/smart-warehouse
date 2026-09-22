<template>
  <div class="smart-warehouse-app">
    <!-- 加载指示遮罩 -->
    <LoadingOverlay ref="loadingRef" />

    <!-- 顶部数字化大屏指挥中心 Header -->
    <HeaderBar />

    <!-- 核心运营态势 KPI 横幅条 -->
    <KpiRibbon />

    <!-- 底部操作提示栏 -->
    <TipBar />

    <!-- 悬浮视角控制坞 -->
    <FloatingControls
      ref="controlsRef"
      @zoom-in="handleZoomIn"
      @zoom-out="handleZoomOut"
      @reset-view="handleResetView"
      @top-view="handleTopView"
      @toggle-play="handleTogglePlay"
    />

    <!-- 3D 实体吸附与自适应防越界弹窗 -->
    <AnchoredPopup
      :visible="popupVisible"
      :detail="popupDetail"
      :screen-x="popupPos.x"
      :screen-y="popupPos.y"
      :behind-camera="popupBehind"
      @close="closePopup"
    />

    <!-- Three.js WebGL 画布容器 -->
    <div ref="canvasContainer" class="canvas-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import HeaderBar from './components/HeaderBar.vue';
import KpiRibbon from './components/KpiRibbon.vue';
import TipBar from './components/TipBar.vue';
import FloatingControls from './components/FloatingControls.vue';
import AnchoredPopup from './components/AnchoredPopup.vue';
import LoadingOverlay from './components/LoadingOverlay.vue';
import { WarehouseScene } from './core/WarehouseScene';
import { ENTITY_DATA } from './core/constants';
import { EntityDetail, EntityKey } from './types/warehouse';

const canvasContainer = ref<HTMLElement | null>(null);
const loadingRef = ref<InstanceType<typeof LoadingOverlay> | null>(null);
const controlsRef = ref<InstanceType<typeof FloatingControls> | null>(null);

let sceneInstance: WarehouseScene | null = null;

// 弹窗状态
const popupVisible = ref(false);
const popupDetail = ref<EntityDetail | null>(null);
const popupPos = ref({ x: 0, y: 0 });
const popupBehind = ref(false);

function closePopup() {
  popupVisible.value = false;
  if (sceneInstance) {
    sceneInstance.clearTrackedAnchor();
  }
}

function handleZoomIn() {
  sceneInstance?.zoomCamera(0.80);
}

function handleZoomOut() {
  sceneInstance?.zoomCamera(1.25);
}

function handleResetView() {
  sceneInstance?.resetCameraView();
  controlsRef.value?.setMode('reset');
}

function handleTopView() {
  sceneInstance?.setTopView();
  controlsRef.value?.setMode('top');
}

function handleTogglePlay() {
  if (sceneInstance && controlsRef.value) {
    const isPaused = sceneInstance.toggleAnimation();
    controlsRef.value.setPaused(isPaused);
  }
}

onMounted(async () => {
  if (!canvasContainer.value) return;

  sceneInstance = new WarehouseScene(canvasContainer.value);

  // 拾取监听
  sceneInstance.onPick((entityKey: EntityKey) => {
    const data = ENTITY_DATA[entityKey];
    if (data) {
      popupDetail.value = data;
      popupVisible.value = true;
    }
  });

  // 空白点击
  sceneInstance.onBlankClick(() => {
    closePopup();
  });

  // 逐帧投影计算
  sceneInstance.onPositionUpdate((x: number, y: number, behind: boolean) => {
    popupPos.value = { x, y };
    popupBehind.value = behind;
  });

  try {
    await sceneInstance.loadModel((percent, items) => {
      loadingRef.value?.updateProgress(percent, items);
    });
    loadingRef.value?.complete();
  } catch (err: any) {
    console.error('模型加载失败:', err);
    loadingRef.value?.setError('模型加载失败，请确认资源文件存在');
  }
});

onUnmounted(() => {
  sceneInstance?.destroy();
  sceneInstance = null;
});
</script>

<style>
/* 全局基础重置与防缩放 */
*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  touch-action: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
  -webkit-text-size-adjust: 100%;
  background: #e7eef6;
  color: #0f172a;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
}

.smart-warehouse-app {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

.canvas-container {
  width: 100vw;
  height: 100vh;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
}
</style>
