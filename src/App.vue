<template>
  <div class="smart-warehouse-app">
    <!-- 加载指示遮罩 (全息初始化舱) -->
    <LoadingOverlay ref="loadingRef" />

    <!-- 顶部数字化大屏管控中心 Header (52px 极简全息条) -->
    <HeaderBar v-if="!isCleanMode" :theme="currentTheme" @toggle-theme="handleToggleTheme" />

    <!-- 左侧：全息运营态势监控 HUD (吞吐量 / AGV 调度 / 立垛库容) -->
    <LeftTelemetryHud v-if="!isCleanMode" />

    <!-- 右侧：设施负荷监控 + 3D 视角多维控制坞 HUD -->
    <RightEquipmentHud
      v-if="!isCleanMode"
      ref="controlsRef"
      @zoom-in="handleZoomIn"
      @zoom-out="handleZoomOut"
      @reset-view="handleResetView"
      @top-view="handleTopView"
      @toggle-play="handleTogglePlay"
    />

    <!-- 底部操作提示栏 (深色磨砂微晶胶囊) -->
    <TipBar v-if="!isCleanMode" />

    <!-- 3D 实体吸附与自适应防越界弹窗 (暗色微晶科技卡片) -->
    <AnchoredPopup
      :visible="popupVisible"
      :detail="popupDetail"
      :screen-x="popupPos.x"
      :screen-y="popupPos.y"
      :behind-camera="popupBehind"
      :safe-left="safeBounds.left"
      :safe-right="safeBounds.right"
      @close="closePopup"
    />

    <!-- Three.js WebGL 画布容器 -->
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
import { ENTITY_DATA } from './core/constants';
import { EntityDetail, EntityKey } from './types/warehouse';

const canvasContainer = ref<HTMLElement | null>(null);
const loadingRef = ref<InstanceType<typeof LoadingOverlay> | null>(null);
const controlsRef = ref<InstanceType<typeof RightEquipmentHud> | null>(null);

let sceneInstance: WarehouseScene | null = null;

// 弹窗状态
const popupVisible = ref(false);
const popupDetail = ref<EntityDetail | null>(null);
const popupPos = ref({ x: 0, y: 0 });
const popupBehind = ref(false);

const currentTheme = ref<'cyber' | 'studio'>('cyber');
const isCleanMode = ref(typeof window !== 'undefined' && window.location.search.includes('clean=1'));

function handleToggleTheme() {
  if (sceneInstance) {
    currentTheme.value = sceneInstance.toggleTheme();
  }
}

const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1920);

function handleResize() {
  windowWidth.value = window.innerWidth;
}

const safeBounds = computed(() => {
  if (windowWidth.value > 1100) {
    return {
      left: 310,
      right: windowWidth.value - 310
    };
  }
  return {
    left: 20,
    right: windowWidth.value - 20
  };
});

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
  window.addEventListener('resize', handleResize);
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

  if (typeof window !== 'undefined') {
    (window as any).__showEntityPopup = (key: EntityKey = 'pc_workstation') => {
      const data = ENTITY_DATA[key];
      if (data) {
        popupDetail.value = data;
        popupVisible.value = true;
        popupPos.value = { x: 960, y: 520 };
        popupBehind.value = false;
      }
    };
  }

  try {
    await sceneInstance.loadModel((percent, items) => {
      loadingRef.value?.updateProgress(percent, items);
    });

    if (typeof window !== 'undefined' && window.location.search.includes('preview=loading')) {
      loadingRef.value?.updateProgress(68, 74);
      return;
    }

    loadingRef.value?.complete();

    if (typeof window !== 'undefined') {
      if (window.location.search.includes('theme=studio')) {
        sceneInstance.setTheme('studio');
        currentTheme.value = 'studio';
      }
      if (window.location.search.includes('view=top')) {
        sceneInstance.setTopView();
      }
      if (window.location.search.includes('view=screen')) {
        sceneInstance.focusHoloScreen();
      }
      if (window.location.search.includes('preview=popup')) {
        (window as any).__showEntityPopup?.('pc_workstation');
      }
    }
  } catch (err: any) {
    console.error('模型加载失败:', err);
    loadingRef.value?.setError('模型加载失败，请确认资源文件存在');
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
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
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  touch-action: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
  -webkit-text-size-adjust: 100%;
  background: #080d17;
  color: #f1f5f9;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
}

.smart-warehouse-app {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: #080d17;
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
