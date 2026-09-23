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
        <div class="brand-hub">自动化仓储管控中心</div>
        <div class="brand-code">NODE #WH-A01 · 60 FPS 全域数字孪生</div>
      </div>
    </div>

    <!-- 中间：平台主标题与科技装饰轨 -->
    <div class="header-center-group">
      <div class="main-title">智慧仓储数字孪生管控平台</div>
      <div class="sub-title-track">
        <span class="track-deco-left"></span>
        <span class="sub-title">SMART WAREHOUSE DIGITAL TWIN PLATFORM</span>
        <span class="track-deco-right"></span>
      </div>
    </div>

    <!-- 右侧：天气气象、实时时钟与全屏 -->
    <div class="header-right-group">
      <!-- 实时气象感知 -->
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

      <!-- 孪生场景主题切换 (赛博深空 / 白昼沙盘) -->
      <button
        class="theme-toggle-btn"
        @click="$emit('toggle-theme')"
        :title="theme === 'cyber' ? '当前：赛博深空全息模式，点击切换为白昼展厅模式' : '当前：白昼展厅沙盘模式，点击切换为赛博深空模式'"
      >
        <span class="theme-btn-icon">{{ theme === 'cyber' ? '🌙' : '☀️' }}</span>
        <span class="theme-btn-text">{{ theme === 'cyber' ? '赛博深空' : '白昼展厅' }}</span>
      </button>

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

defineProps<{
  theme?: 'cyber' | 'studio';
}>();

defineEmits<{
  (e: 'toggle-theme'): void;
}>();

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
  height: 52px;
  z-index: 25;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  background: linear-gradient(180deg, rgba(9, 14, 24, 0.94) 0%, rgba(11, 18, 30, 0.82) 100%);
  border-bottom: 1px solid rgba(0, 240, 255, 0.22);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45);
  pointer-events: auto;
  user-select: none;
}

/* 顶部全息发光导光线 */
.digital-twin-header::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(0, 240, 255, 0.6) 50%, transparent 100%);
}

.header-left-group {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 270px;
}
.brand-badge {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 4px 9px;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.35);
  border-radius: 20px;
}
.status-pulse-ring {
  position: relative;
  width: 8px;
  height: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.status-dot {
  width: 6px;
  height: 6px;
  background: #10b981;
  border-radius: 50%;
  box-shadow: 0 0 6px #10b981;
  animation: pulseDot 2s infinite ease-in-out;
}
@keyframes pulseDot {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.6; }
}
.live-tag {
  font-size: 10px;
  font-weight: 700;
  color: #34d399;
  letter-spacing: 0.5px;
}
.brand-info {
  display: flex;
  flex-direction: column;
}
.brand-hub {
  font-size: 12px;
  font-weight: 700;
  color: #f1f5f9;
}
.brand-code {
  font-size: 10px;
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
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: #ffffff;
  background: linear-gradient(90deg, #ffffff 0%, #38bdf8 50%, #ffffff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 16px rgba(56, 189, 248, 0.3);
}
.sub-title-track {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}
.sub-title {
  font-size: 9px;
  font-weight: 600;
  color: #38bdf8;
  letter-spacing: 1.8px;
}
.track-deco-left, .track-deco-right {
  width: 28px;
  height: 1px;
  background: linear-gradient(90deg, transparent, #00f0ff);
}
.track-deco-right {
  background: linear-gradient(90deg, #00f0ff, transparent);
}

.header-right-group {
  display: flex;
  align-items: center;
  gap: 14px;
  justify-content: flex-end;
}
.weather-card {
  display: flex;
  align-items: center;
}
.weather-main {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 600;
  color: #cbd5e1;
}
.weather-icon {
  font-size: 15px;
  line-height: 1;
}
.weather-temp {
  color: #38bdf8;
  font-size: 15px;
  font-weight: 700;
  font-family: ui-monospace, monospace;
  display: inline-flex;
  align-items: baseline;
}
.weather-temp .temp-unit {
  font-size: 11px;
  font-weight: 600;
  margin-left: 2px;
}
.weather-cond {
  color: #94a3b8;
  font-size: 11px;
}
.header-v-divider {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.12);
}
.clock-card {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.clock-time {
  font-size: 15px;
  font-weight: 800;
  color: #00f0ff;
  font-family: ui-monospace, monospace;
  letter-spacing: 0.8px;
  text-shadow: 0 0 10px rgba(0, 240, 255, 0.4);
}
.clock-date {
  font-size: 10px;
  color: #64748b;
}
.theme-toggle-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 10px;
  border-radius: 6px;
  background: rgba(0, 240, 255, 0.10);
  border: 1px solid rgba(0, 240, 255, 0.30);
  color: #00f0ff;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.theme-toggle-btn:hover {
  background: rgba(0, 240, 255, 0.20);
  border-color: #00f0ff;
  box-shadow: 0 0 10px rgba(0, 240, 255, 0.35);
  transform: translateY(-1px);
}
.theme-btn-icon {
  font-size: 12px;
}
.fullscreen-btn {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}
.fullscreen-btn:hover {
  background: rgba(0, 240, 255, 0.18);
  color: #00f0ff;
  border-color: rgba(0, 240, 255, 0.5);
  box-shadow: 0 0 10px rgba(0, 240, 255, 0.3);
}
</style>
