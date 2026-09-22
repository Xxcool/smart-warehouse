<template>
  <div
    v-show="visible && !behindCamera"
    ref="popupEl"
    class="anchored-popup"
    :class="placementClass"
    :style="popupStyle"
  >
    <div class="popup-card">
      <div class="popup-header">
        <div>
          <div class="popup-title">{{ detail?.title }}</div>
          <div class="popup-sub">{{ detail?.sub }}</div>
        </div>
        <div class="header-action-group">
          <span class="popup-tag">{{ detail?.tag }}</span>
          <span class="popup-close" @click="$emit('close')" title="关闭">&times;</span>
        </div>
      </div>

      <div class="popup-content">
        <div v-for="(row, idx) in detail?.rows" :key="idx" class="data-block">
          <div class="data-row">
            <span class="data-label">{{ row.l }}</span>
            <span
              class="data-val"
              :class="{ blue: row.blue, green: row.green }"
            >
              {{ row.v }}
            </span>
          </div>
          <div v-if="row.progress !== undefined" class="progress-wrap">
            <div class="progress-bar" :style="{ width: row.progress + '%' }"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 动态跟踪指示箭头 -->
    <div class="popup-caret" :style="caretStyle"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { EntityDetail } from '../types/warehouse';

const props = defineProps<{
  visible: boolean;
  detail: EntityDetail | null;
  screenX: number;
  screenY: number;
  behindCamera: boolean;
}>();

defineEmits<{
  (e: 'close'): void;
}>();

const popupEl = ref<HTMLElement | null>(null);

const cardW = 320;

const placementClass = computed(() => {
  const safeTop = (props.screenX > 320 && props.screenX < window.innerWidth - 320) ? 115 : 75;
  if (props.screenY < safeTop + 45) {
    return 'placement-bottom';
  }
  return 'placement-top';
});

const isBottom = computed(() => placementClass.value === 'placement-bottom');

const clampedPosition = computed(() => {
  const cardH = popupEl.value?.offsetHeight || 210;
  const safeTop = (props.screenX > 320 && props.screenX < window.innerWidth - 320) ? 115 : 75;
  const safeBottom = window.innerHeight - 24;
  const safeLeft = 20;
  const safeRight = window.innerWidth - 20;

  const halfW = cardW / 2;
  const minX = safeLeft + halfW;
  const maxX = safeRight - halfW;
  const clampedX = Math.max(minX, Math.min(maxX, props.screenX));

  let clampedY = props.screenY;
  if (!isBottom.value) {
    if (clampedY - 14 - cardH < safeTop) {
      clampedY = safeTop + cardH + 14;
    }
  } else {
    if (clampedY + 14 + cardH > safeBottom) {
      clampedY = safeBottom - cardH - 14;
    }
  }

  const caretOffset = props.screenX - clampedX;
  const maxCaretOffset = halfW - 24;
  const clampedCaretOffset = Math.max(-maxCaretOffset, Math.min(maxCaretOffset, caretOffset));

  return {
    x: clampedX,
    y: clampedY,
    caretOffset: clampedCaretOffset
  };
});

const popupStyle = computed(() => {
  return {
    left: `${clampedPosition.value.x}px`,
    top: `${clampedPosition.value.y}px`
  };
});

const caretStyle = computed(() => {
  const rotDeg = isBottom.value ? '225deg' : '45deg';
  return {
    transform: `translateX(calc(-50% + ${clampedPosition.value.caretOffset}px)) rotate(${rotDeg})`
  };
});
</script>

<style scoped>
.anchored-popup {
  position: absolute;
  z-index: 35;
  pointer-events: auto;
  filter: drop-shadow(0 14px 30px rgba(15, 23, 42, 0.20));
  transition: opacity 0.18s ease;
  font-size: 13px;
}

.anchored-popup.placement-top {
  transform: translate(-50%, -100%);
  margin-top: -14px;
}
.anchored-popup.placement-top .popup-caret {
  bottom: -6px;
  top: auto;
  transform: translateX(-50%) rotate(45deg);
  border-right: 1px solid #cbd5e1;
  border-bottom: 1px solid #cbd5e1;
  border-left: none;
  border-top: none;
}

.anchored-popup.placement-bottom {
  transform: translate(-50%, 0);
  margin-top: 14px;
}
.anchored-popup.placement-bottom .popup-caret {
  top: -6px;
  bottom: auto;
  transform: translateX(-50%) rotate(225deg);
  border-right: 1px solid #cbd5e1;
  border-bottom: 1px solid #cbd5e1;
  border-left: none;
  border-top: none;
}

.popup-card {
  width: 320px;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 16px 18px;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.10);
  max-height: calc(100vh - 160px);
  overflow-y: auto;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}
.popup-caret {
  position: absolute;
  left: 50%;
  width: 12px;
  height: 12px;
  background: #ffffff;
  pointer-events: none;
  transition: transform 0.1s ease;
}
.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 10px;
  margin-bottom: 12px;
  gap: 12px;
}
.header-action-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.popup-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 6px;
}
.popup-sub {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
}
.popup-tag {
  font-size: 11px;
  font-weight: 600;
  color: #2563eb;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  padding: 2px 8px;
  border-radius: 12px;
  white-space: nowrap;
}
.popup-close {
  cursor: pointer;
  color: #94a3b8;
  font-size: 18px;
  line-height: 1;
  padding: 2px 4px;
  border-radius: 4px;
  transition: all 0.15s;
}
.popup-close:hover {
  color: #0f172a;
  background: #f1f5f9;
}
.data-block {
  margin-bottom: 8px;
}
.data-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}
.data-label { color: #64748b; }
.data-val { font-weight: 600; color: #1e293b; font-family: ui-monospace, monospace; }
.data-val.blue { color: #2563eb; }
.data-val.green { color: #10b981; }
.progress-wrap {
  width: 100%;
  height: 5px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
  margin-top: 4px;
  margin-bottom: 6px;
}
.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  border-radius: 3px;
  transition: width 0.3s;
}
</style>
