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
          <span class="status-text">INITIALIZING DIGITAL TWIN NODE #WH-A01</span>
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
      <div class="progress-container">
        <div class="progress-info-row">
          <span class="phase-desc">{{ currentPhaseText }}</span>
          <span class="progress-pct">{{ progress }}<small>%</small></span>
        </div>

        <div class="progress-track">
          <div class="progress-bar-fill" :style="{ width: progress + '%' }"></div>
        </div>

        <div class="resource-meta-row">
          <span v-if="error" class="text-error">{{ error }}</span>
          <span v-else class="resource-text">
            <span>资源项: <b>{{ items }}/109</b></span>
            <span class="meta-divider">|</span>
            <span>着色管线: <b>PBR Physical</b></span>
            <span class="meta-divider">|</span>
            <span>帧率目标: <b>60 FPS</b></span>
          </span>
        </div>
      </div>

      <!-- 底部通信握手指示 -->
      <div class="loading-footer">
        <span>CONNECTING TO WMS/WCS TELEMETRY BUS · REAL-TIME 60 FPS TWIN</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const visible = ref(true);
const isFading = ref(false);
const progress = ref(0);
const items = ref(0);
const error = ref('');

const currentPhaseText = computed(() => {
  if (error.value) return '初始化遇到异常，请检查网络或资源文件';
  if (progress.value < 35) return '【阶段 1/3】解构 3D 几何拓扑与物理材质 (GLTF/PBR)...';
  if (progress.value < 75) return '【阶段 2/3】规划 AGV 激光巡线轨迹与闭环状态机...';
  if (progress.value < 99) return '【阶段 3/3】装配全息双态势 HUD 与微晶反射管线...';
  return '【就绪】全域数字孪生完成握手，即将进入监控大屏...';
});

function updateProgress(p: number, it: number) {
  progress.value = p;
  items.value = it;
}

function complete() {
  progress.value = 100;
  items.value = 109;
  setTimeout(() => {
    isFading.value = true;
    setTimeout(() => {
      visible.value = false;
    }, 450);
  }, 250);
}

function setError(msg: string) {
  error.value = msg;
}

defineExpose({
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
  width: 100vw;
  height: 100vh;
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
  width: 480px;
  background: linear-gradient(135deg, rgba(11, 18, 30, 0.96) 0%, rgba(15, 23, 42, 0.92) 100%);
  border: 1px solid rgba(0, 240, 255, 0.28);
  border-radius: 14px;
  padding: 26px 32px 22px;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(0, 240, 255, 0.12);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
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
  font-size: 10px;
  color: #64748b;
  font-family: ui-monospace, monospace;
}
.resource-text {
  display: flex;
  align-items: center;
  gap: 8px;
}
.resource-text b {
  color: #cbd5e1;
}
.meta-divider {
  color: rgba(255, 255, 255, 0.15);
}
.text-error {
  color: #ef4444;
}

/* 底部状态 */
.loading-footer {
  text-align: center;
  font-size: 9px;
  color: #475569;
  font-family: ui-monospace, monospace;
  letter-spacing: 0.8px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding-top: 10px;
}
</style>
