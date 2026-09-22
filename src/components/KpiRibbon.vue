<template>
  <div class="kpi-ribbon-bar">
    <div class="kpi-pill">
      <div class="kpi-icon-box blue">📦</div>
      <div class="kpi-content">
        <span class="kpi-pill-title">今日吞吐总量</span>
        <span class="kpi-pill-val">24,580 <small>件</small> <span class="trend-up">↑ 12.8%</span></span>
      </div>
    </div>

    <div class="kpi-pill">
      <div class="kpi-icon-box cyan">🤖</div>
      <div class="kpi-content">
        <span class="kpi-pill-title">AGV 自主巡线</span>
        <span class="kpi-pill-val">7 / 7 <small>台在线</small> <span class="badge-status-green">正常避障</span></span>
      </div>
    </div>

    <div class="kpi-pill">
      <div class="kpi-icon-box amber">🚛</div>
      <div class="kpi-content">
        <span class="kpi-pill-title">月台接卸泊位</span>
        <span class="kpi-pill-val">3 / 3 <small>泊位全开</small> <span class="badge-status-blue">1号伸缩滚筒驳运</span></span>
      </div>
    </div>

    <div class="kpi-pill">
      <div class="kpi-icon-box teal">❄️</div>
      <div class="kpi-content">
        <span class="kpi-pill-title">恒温冷链气密仓</span>
        <span class="kpi-pill-val">-18.2 <small>°C</small> <span class="badge-status-green">温控 100% 达标</span></span>
      </div>
    </div>

    <div class="kpi-pill">
      <div class="kpi-icon-box indigo">🏭</div>
      <div class="kpi-content">
        <span class="kpi-pill-title">高位立体货垛利用率</span>
        <span class="kpi-pill-val">88.4% <small>(708/800托)</small></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Props or dynamic stores can be easily attached here for real-time telemetry
</script>

<style scoped>
.kpi-ribbon-bar {
  position: absolute;
  top: 74px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  gap: 10px;
  pointer-events: auto;
  max-width: calc(100vw - 60px);
  overflow-x: auto;
}
.kpi-pill {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(203, 213, 225, 0.85);
  border-radius: 20px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.05);
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.2s;
}
.kpi-pill:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.09);
  border-color: #60a5fa;
}
.kpi-icon-box {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
}
.kpi-icon-box.blue { background: #eff6ff; }
.kpi-icon-box.cyan { background: #ecfeff; }
.kpi-icon-box.amber { background: #fffbeb; }
.kpi-icon-box.teal { background: #f0fdfa; }
.kpi-icon-box.indigo { background: #eef2ff; }

.kpi-content {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.kpi-pill-title {
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
}
.kpi-pill-val {
  font-size: 12px;
  font-weight: 700;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: ui-monospace, monospace;
}
.kpi-pill-val small {
  font-size: 10px;
  color: #64748b;
  font-weight: normal;
}
.trend-up {
  font-size: 10px;
  color: #16a34a;
  font-weight: 600;
}
.badge-status-green {
  font-size: 10px;
  padding: 1px 5px;
  background: #dcfce7;
  color: #15803d;
  border-radius: 4px;
  font-weight: 600;
}
.badge-status-blue {
  font-size: 10px;
  padding: 1px 5px;
  background: #dbeafe;
  color: #1d4ed8;
  border-radius: 4px;
  font-weight: 600;
}
</style>
