<template>
  <div v-if="visible" class="loading-overlay" :class="{ 'fade-out': isFading }">
    <!-- 赛博深空背景光网与环境微光 -->
    <div class="cyber-bg-glow"></div>
    <div class="cyber-scan-grid"></div>

    <div class="loading-card">
      <!-- 科技角标装饰 -->
      <div class="corner-bracket top-left"></div>
      <div class="corner-bracket top-right"></div>
      <div class="corner-bracket bottom-left"></div>
      <div class="corner-bracket bottom-right"></div>

      <!-- 顶部长条状态呼吸指示 -->
      <div class="card-status-bar">
        <div class="status-pulse-group">
          <span class="pulse-dot"></span>
          <span class="status-text">{{ error ? 'SCENE UNAVAILABLE' : 'INITIALIZING DIGITAL TWIN' }}</span>
        </div>
        <div class="system-engine-tag">THREE.JS · WEBGL 2.0</div>
      </div>

      <!-- 中心全息旋转雷达与平台主标题 -->
      <div class="brand-hero-section">
        <div class="radar-scan-box">
          <div class="radar-circle outer"></div>
          <div class="radar-circle inner"></div>
          <div class="radar-scanner"></div>
          <span class="radar-core-icon">📦</span>
        </div>
        <div class="brand-titles">
          <div class="brand-main">智慧仓储数字孪生管控平台</div>
          <div class="brand-sub">SMART WAREHOUSE DIGITAL TWIN SYSTEM</div>
        </div>
      </div>

      <!-- 进度条与阶段状态解析 -->
      <div v-if="!error" class="progress-container" role="status">
        <div class="progress-info-row">
          <span class="phase-desc">{{ currentPhaseText }}</span>
          <span class="progress-pct">{{ progress }}<small>%</small></span>
        </div>

        <div class="progress-track">
          <div class="progress-bar-fill" :style="{ width: progress + '%' }"></div>
        </div>

        <div class="resource-meta-row">仓库场景 · 本地仿真</div>
      </div>

      <div v-else class="loading-error">
        <p class="text-error" role="alert">{{ error }}</p>
        <button type="button" class="retry-button" @click="$emit('retry')">重试</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';

defineEmits<{ (e: 'retry'): void }>();

const visible = ref(true);
const isFading = ref(false);
const progress = ref(0);
const error = ref('');
let hideTimer = 0;

const currentPhaseText = computed(() => {
  if (progress.value === 0) return '初始化图形渲染器';
  if (progress.value < 75) return '下载仓库模型';
  if (progress.value < 100) return '装配场景与 AGV 仿真';
  return '场景已就绪';
});

function updateProgress(p: number) {
  progress.value = p;
}

function reset() {
  window.clearTimeout(hideTimer);
  error.value = '';
  progress.value = 0;
  visible.value = true;
  isFading.value = false;
}

function complete() {
  progress.value = 100;
  hideTimer = window.setTimeout(() => {
    isFading.value = true;
    hideTimer = window.setTimeout(() => {
      visible.value = false;
    }, 450);
  }, 250);
}

function setError(msg: string) {
  reset();
  error.value = msg;
}

onUnmounted(() => window.clearTimeout(hideTimer));

defineExpose({
  reset,
  updateProgress,
  complete,
  setError
});
</script>

<style scoped>
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(6, 10, 18, 0.94);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  transition: opacity 0.45s ease, visibility 0.45s;
  user-select: none;
  overflow: hidden;
}

.loading-overlay.fade-out {
  opacity: 0;
  pointer-events: none;
}

/* 赛博背景光影 */
.cyber-bg-glow {
  position: absolute;
  width: 700px;
  height: 700px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0, 240, 255, 0.12) 0%, rgba(56, 189, 248, 0.04) 45%, transparent 70%);
  pointer-events: none;
  animation: pulseGlow 4s ease-in-out infinite alternate;
}
@keyframes pulseGlow {
  0% { transform: scale(0.9); opacity: 0.6; }
  100% { transform: scale(1.15); opacity: 1; }
}

.cyber-scan-grid {
  position: absolute;
  width: 100vw;
  height: 100vh;
  background-image:
    linear-gradient(rgba(0, 240, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 240, 255, 0.03) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
}

/* 主载入卡片 */
.loading-card {
  width: min(480px, calc(100% - 24px));
  max-height: calc(100% - 24px);
  background: linear-gradient(135deg, rgba(11, 18, 30, 0.96) 0%, rgba(15, 23, 42, 0.92) 100%);
  border: 1px solid rgba(0, 240, 255, 0.28);
  border-radius: 14px;
  padding: 26px 32px 22px;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(0, 240, 255, 0.12);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: auto;
}

/* 科技直角边框角标 */
.corner-bracket {
  position: absolute;
  width: 10px;
  height: 10px;
  border-color: #00f0ff;
  pointer-events: none;
}
.corner-bracket.top-left {
  top: 6px;
  left: 6px;
  border-top: 2px solid #00f0ff;
  border-left: 2px solid #00f0ff;
}
.corner-bracket.top-right {
  top: 6px;
  right: 6px;
  border-top: 2px solid #00f0ff;
  border-right: 2px solid #00f0ff;
}
.corner-bracket.bottom-left {
  bottom: 6px;
  left: 6px;
  border-bottom: 2px solid #00f0ff;
  border-left: 2px solid #00f0ff;
}
.corner-bracket.bottom-right {
  bottom: 6px;
  right: 6px;
  border-bottom: 2px solid #00f0ff;
  border-right: 2px solid #00f0ff;
}

/* 状态顶栏 */
.card-status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 10px;
  margin-bottom: 18px;
}
.status-pulse-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pulse-dot {
  width: 7px;
  height: 7px;
  background: #00f0ff;
  border-radius: 50%;
  box-shadow: 0 0 8px #00f0ff;
  animation: pulseDot 1.5s infinite ease-in-out;
}
@keyframes pulseDot {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.4); opacity: 0.4; }
}
.status-text {
  font-size: 10px;
  font-weight: 700;
  color: #38bdf8;
  letter-spacing: 0.8px;
  font-family: ui-monospace, monospace;
}
.system-engine-tag {
  font-size: 9px;
  color: #64748b;
  font-family: ui-monospace, monospace;
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
}

/* 中心标题与雷达 */
.brand-hero-section {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 22px;
}
.radar-scan-box {
  position: relative;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.radar-circle.outer {
  position: absolute;
  width: 46px;
  height: 46px;
  border: 1px dashed rgba(0, 240, 255, 0.5);
  border-radius: 50%;
  animation: rotateClockwise 8s linear infinite;
}
.radar-circle.inner {
  position: absolute;
  width: 32px;
  height: 32px;
  border: 1px solid rgba(0, 240, 255, 0.3);
  border-radius: 50%;
}
.radar-scanner {
  position: absolute;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: conic-gradient(from 0deg, transparent 70%, rgba(0, 240, 255, 0.4) 100%);
  animation: rotateClockwise 2.5s linear infinite;
}
@keyframes rotateClockwise {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.radar-core-icon {
  font-size: 18px;
  z-index: 2;
}

.brand-titles {
  display: flex;
  flex-direction: column;
}
.brand-main {
  font-size: 19px;
  font-weight: 800;
  letter-spacing: 1.2px;
  color: #ffffff;
  background: linear-gradient(90deg, #ffffff 0%, #38bdf8 50%, #ffffff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 18px rgba(56, 189, 248, 0.35);
}
.brand-sub {
  font-size: 9px;
  color: #64748b;
  font-family: ui-monospace, monospace;
  letter-spacing: 1.5px;
  margin-top: 3px;
}

/* 进度条板块 */
.progress-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 8px;
  padding: 12px 14px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.progress-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.phase-desc {
  font-size: 11px;
  color: #94a3b8;
}
.progress-pct {
  font-size: 18px;
  font-weight: 800;
  color: #00f0ff;
  font-family: ui-monospace, monospace;
  text-shadow: 0 0 10px rgba(0, 240, 255, 0.5);
}
.progress-pct small {
  font-size: 12px;
  color: #38bdf8;
  margin-left: 2px;
}

.progress-track {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  overflow: hidden;
  position: relative;
}
.progress-bar-fill {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, #0284c7 0%, #00f0ff 60%, #38bdf8 100%);
  border-radius: 3px;
  box-shadow: 0 0 12px rgba(0, 240, 255, 0.8);
  transition: width 0.1s linear;
}

.resource-meta-row {
  font-size: 11px;
  color: #94a3b8;
  font-family: ui-monospace, monospace;
}

.loading-error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.text-error {
  color: #fecaca;
  font-size: 14px;
  line-height: 1.5;
}

.retry-button {
  min-height: 44px;
  padding: 0 20px;
  border: 1px solid #67e8f9;
  border-radius: 6px;
  background: #103044;
  color: #b8f7ff;
  font: inherit;
  cursor: pointer;
}

@media (max-width: 480px) {
  .loading-card {
    padding: 20px 16px;
  }

  .system-engine-tag {
    display: none;
  }
}
</style>
