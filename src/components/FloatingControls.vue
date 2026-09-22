<template>
  <aside class="floating-controls-dock" aria-label="3D视角控制面板">
    <div class="dock-title">视角控制</div>
    
    <button class="dock-btn" @click="$emit('zoom-in')" title="拉近相机视角 (快捷键 +)">
      <span class="dock-icon">＋</span>
      <span class="dock-label">放大</span>
    </button>

    <button class="dock-btn" @click="$emit('zoom-out')" title="拉远相机视角 (快捷键 -)">
      <span class="dock-icon">－</span>
      <span class="dock-label">缩小</span>
    </button>

    <div class="dock-divider"></div>

    <button
      class="dock-btn"
      :class="{ active: currentMode === 'reset' }"
      @click="handleReset"
      title="复位为标准等轴测视角 (快捷键 0 / R)"
    >
      <span class="dock-icon">⟲</span>
      <span class="dock-label">复位视角</span>
    </button>

    <button
      class="dock-btn"
      :class="{ active: currentMode === 'top' }"
      @click="handleTopView"
      title="切换为顶部平面俯视 (快捷键 T)"
    >
      <span class="dock-icon">📐</span>
      <span class="dock-label">顶视图</span>
    </button>

    <div class="dock-divider"></div>

    <button
      class="dock-btn"
      :class="{ active: isPaused }"
      @click="handleTogglePlay"
      title="暂停/恢复场景内运动动画 (快捷键 空格)"
    >
      <span class="dock-icon">{{ isPaused ? '▶' : '⏸' }}</span>
      <span class="dock-label">{{ isPaused ? '恢复运动' : '暂停运动' }}</span>
    </button>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  (e: 'zoom-in'): void;
  (e: 'zoom-out'): void;
  (e: 'reset-view'): void;
  (e: 'top-view'): void;
  (e: 'toggle-play'): void;
}>();

const currentMode = ref<'reset' | 'top' | 'custom'>('reset');
const isPaused = ref(false);

function handleReset() {
  currentMode.value = 'reset';
  emit('reset-view');
}

function handleTopView() {
  currentMode.value = 'top';
  emit('top-view');
}

function handleTogglePlay() {
  isPaused.value = !isPaused.value;
  emit('toggle-play');
}

defineExpose({
  setPaused(paused: boolean) {
    isPaused.value = paused;
  },
  setMode(mode: 'reset' | 'top' | 'custom') {
    currentMode.value = mode;
  }
});
</script>

<style scoped>
.floating-controls-dock {
  position: absolute;
  right: 28px;
  bottom: 28px;
  z-index: 25;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(203, 213, 225, 0.85);
  border-radius: 14px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.10);
  pointer-events: auto;
}
.dock-title {
  font-size: 10px;
  font-weight: 700;
  color: #94a3b8;
  text-align: center;
  padding: 2px 0 4px;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #f1f5f9;
  margin-bottom: 2px;
}
.dock-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #334155;
  cursor: pointer;
  transition: all 0.16s ease;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
.dock-btn:hover {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #1d4ed8;
  transform: translateX(-2px);
}
.dock-btn:active {
  transform: scale(0.96);
}
.dock-btn.active {
  background: #2563eb;
  border-color: #2563eb;
  color: #ffffff;
}
.dock-icon {
  font-size: 14px;
  font-weight: bold;
  width: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dock-divider {
  height: 1px;
  background: #e2e8f0;
  margin: 2px 0;
}
</style>
