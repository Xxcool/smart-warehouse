<template>
  <div class="tip-bar">
    <span>💡</span>
    <span>提示：<b>轻点工位电脑、托盘堆、冷库门、AGV小车、传送带或货车</b>即可查看实时传感数据 · 滚轮/手势缩放仅改变 3D 相机</span>
  </div>
</template>

<style scoped>
.tip-bar {
  position: absolute;
  bottom: 24px;
  left: 28px;
  z-index: 20;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(203, 213, 225, 0.8);
  padding: 8px 18px;
  border-radius: 20px;
  font-size: 12px;
  color: #475569;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);
  pointer-events: none;
  display: flex;
  align-items: center;
  gap: 6px;
}
.tip-bar b {
  color: #2563eb;
}
</style>
