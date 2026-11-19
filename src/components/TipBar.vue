<template>
  <div class="tip-bar">
    <span class="tip-icon">💡</span>
    <span class="tip-text"><b>轻点场景设备</b>查看仿真状态 · 使用滚轮或双指缩放场景</span>
  </div>
</template>

<style scoped>
.tip-bar {
  position: absolute;
  bottom: 18px;
  left: 20px;
  z-index: 20;
  background: linear-gradient(135deg, rgba(11, 18, 30, 0.88) 0%, rgba(15, 23, 42, 0.78) 100%);
  border: 1px solid rgba(0, 240, 255, 0.25);
  padding: 7px 16px;
  border-radius: 20px;
  font-size: 11px;
  color: #94a3b8;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45), inset 0 0 10px rgba(0, 240, 255, 0.05);
  pointer-events: none;
  display: flex;
  align-items: center;
  gap: 7px;
  user-select: none;
}
.tip-icon {
  font-size: 13px;
}
.tip-text b {
  color: #00f0ff;
  font-weight: 600;
}
</style>
