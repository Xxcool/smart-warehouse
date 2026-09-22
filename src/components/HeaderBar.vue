<template>
  <header class="digital-twin-header">
    <!-- 左侧：节点编号与运行态指示 -->
    <div class="header-left-group">
      <div class="brand-badge">
        <div class="status-pulse-ring">
          <div class="status-dot"></div>
        </div>
        <span class="live-tag">LIVE 实时孪生</span>
      </div>
      <div class="brand-info">
        <div class="brand-hub">智慧冷链仓储物流自动化中心</div>
        <div class="brand-code">NODE #WH-A01 · 60 FPS 动态孪生</div>
      </div>
    </div>

    <!-- 中间：平台主标题与科技装饰轨 -->
    <div class="header-center-group">
      <div class="main-title">智能立体冷链与智慧仓储数字孪生管控平台</div>
      <div class="sub-title-track">
        <span class="track-deco-left"></span>
        <span class="sub-title">SMART COLD-CHAIN & LOGISTICS DIGITAL TWIN MANAGEMENT CENTER</span>
        <span class="track-deco-right"></span>
      </div>
    </div>

    <!-- 右侧：天气气象、实时时钟与全屏 -->
    <div class="header-right-group">
      <!-- 实时气象感知 (精简大屏风格) -->
      <div class="weather-card">
        <div class="weather-main">
          <span class="weather-icon">⛅</span>
          <span class="weather-temp">24<span class="temp-unit">°C</span></span>
          <span class="weather-cond">晴间多云</span>
        </div>
      </div>

      <div class="header-v-divider"></div>

      <!-- 实时秒级跳动高精度时钟 -->
      <div class="clock-card">
        <div class="clock-time">{{ currentTime }}</div>
        <div class="clock-date">{{ currentDate }}</div>
      </div>

      <!-- 全屏沉浸按钮 -->
      <button class="fullscreen-btn" @click="toggleFullscreen" title="切换全屏沉浸大屏">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
        </svg>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const currentTime = ref('');
const currentDate = ref('');
let timer: number | null = null;

function updateClock() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const week = weekdays[now.getDay()];
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');

  currentTime.value = `${hh}:${mm}:${ss}`;
  currentDate.value = `${y}年${m}月${d}日 ${week}`;
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

onMounted(() => {
  updateClock();
  timer = window.setInterval(updateClock, 1000);
});

onUnmounted(() => {
  if (timer !== null) clearInterval(timer);
});
</script>

<style scoped>
.digital-twin-header {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 68px;
  z-index: 25;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 28px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(255, 255, 255, 0.88) 85%, rgba(255, 255, 255, 0.4) 100%);
  border-bottom: 1px solid rgba(203, 213, 225, 0.7);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05);
  pointer-events: auto;
}

.header-left-group {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 280px;
}
.brand-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 20px;
}
.status-pulse-ring {
  position: relative;
  width: 10px;
  height: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.status-dot {
  width: 8px;
  height: 8px;
  background: #16a34a;
  border-radius: 50%;
  box-shadow: 0 0 8px #22c55e;
  animation: pulseDot 2s infinite ease-in-out;
}
@keyframes pulseDot {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.6; }
}
.live-tag {
  font-size: 11px;
  font-weight: 700;
  color: #15803d;
  letter-spacing: 0.5px;
}
.brand-info {
  display: flex;
  flex-direction: column;
}
.brand-hub {
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
}
.brand-code {
  font-size: 11px;
  color: #64748b;
  font-family: ui-monospace, monospace;
}

.header-center-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}
.main-title {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 1.2px;
  color: #0f172a;
  background: linear-gradient(90deg, #0f172a 0%, #1e40af 50%, #0f172a 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 2px 10px rgba(37, 99, 235, 0.1);
}
.sub-title-track {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 3px;
}
.sub-title {
  font-size: 10px;
  font-weight: 600;
  color: #3b82f6;
  letter-spacing: 2px;
}
.track-deco-left, .track-deco-right {
  width: 32px;
  height: 1px;
  background: linear-gradient(90deg, transparent, #3b82f6);
}
.track-deco-right {
  background: linear-gradient(90deg, #3b82f6, transparent);
}

.header-right-group {
  display: flex;
  align-items: center;
  gap: 16px;
  justify-content: flex-end;
}
.weather-card {
  display: flex;
  align-items: center;
}
.weather-main {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
}
.weather-icon {
  font-size: 16px;
  line-height: 1;
}
.weather-temp {
  color: #0284c7;
  font-size: 16px;
  font-weight: 700;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
  letter-spacing: -0.2px;
  display: inline-flex;
  align-items: baseline;
}
.weather-temp .temp-unit {
  font-size: 13px;
  font-weight: 600;
  margin-left: 2px;
}
.weather-cond {
  color: #475569;
  font-size: 13px;
  font-weight: 600;
}
.header-v-divider {
  width: 1px;
  height: 28px;
  background: #cbd5e1;
}
.clock-card {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.clock-time {
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  letter-spacing: 0.8px;
}
.clock-date {
  font-size: 11px;
  color: #64748b;
}
.fullscreen-btn {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}
.fullscreen-btn:hover {
  background: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
}
</style>
