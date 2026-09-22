<template>
  <div v-if="visible" class="loading-overlay" :class="{ 'fade-out': isFading }">
    <div class="loading-card">
      <div class="progress-track">
        <div class="progress-bar-fill" :style="{ width: progress + '%' }"></div>
      </div>
      <div class="loading-title">数字孪生场景加载中</div>
      <div class="loading-resource-info">
        <span v-if="error" class="text-error">{{ error }}</span>
        <span v-else>{{ progress }}% · {{ items }}/109 项资源</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const visible = ref(true);
const isFading = ref(false);
const progress = ref(0);
const items = ref(0);
const error = ref('');

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
    }, 400);
  }, 200);
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
  background: rgba(11, 15, 25, 0.82);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  transition: opacity 0.4s ease, visibility 0.4s;
}
.loading-overlay.fade-out {
  opacity: 0;
  pointer-events: none;
}
.loading-card {
  width: 440px;
  background: rgba(13, 17, 23, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 24px 30px 26px;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(34, 197, 94, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}
.progress-track {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 18px;
}
.progress-bar-fill {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, #22c55e 0%, #eab308 65%, #facc15 100%);
  border-radius: 2px;
  box-shadow: 0 0 12px rgba(74, 222, 128, 0.8);
  transition: width 0.06s linear;
}
.loading-title {
  font-size: 18px;
  font-weight: 600;
  color: #fef08a;
  letter-spacing: 2px;
  margin-bottom: 8px;
  text-align: center;
}
.loading-resource-info {
  font-size: 13px;
  color: #94a3b8;
  letter-spacing: 0.8px;
  font-family: ui-monospace, SFMono-Regular, monospace;
  text-align: center;
}
.text-error {
  color: #ef4444;
}
</style>
