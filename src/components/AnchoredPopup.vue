<template>
  <div
    v-show="visible && !behindCamera"
    ref="popupEl"
    class="anchored-popup"
    role="region"
    aria-label="设备详情"
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
          <button type="button" class="popup-close" @click="$emit('close')" aria-label="关闭设备详情">&times;</button>
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { EntityDetail } from '../types/warehouse';

const props = defineProps<{
  visible: boolean;
  detail: EntityDetail | null;
  screenX: number;
  screenY: number;
  behindCamera: boolean;
  safeLeft: number;
  safeRight: number;
  safeBottom: number;
}>();

defineEmits<{
  (e: 'close'): void;
}>();

const popupEl = ref<HTMLElement | null>(null);
const cardHeight = ref(0);
let observer: ResizeObserver | undefined;

onMounted(() => {
  if (!popupEl.value) return;
  observer = new ResizeObserver(([entry]) => { cardHeight.value = entry.contentRect.height; });
  observer.observe(popupEl.value);
});

onUnmounted(() => observer?.disconnect());

const clampedPosition = computed(() => {
  const safeTop = 64;
  const gap = 14;
  const width = Math.min(310, props.safeRight - props.safeLeft);
  const maxHeight = Math.max(0, props.safeBottom - safeTop);
  const cardH = Math.min(cardHeight.value || 200, maxHeight);
  const halfW = width / 2;
  const minX = props.safeLeft + halfW;
  const maxX = props.safeRight - halfW;
  const clampedX = Math.max(minX, Math.min(maxX, props.screenX));
  const roomAbove = props.screenY - safeTop - gap;
  const roomBelow = props.safeBottom - props.screenY - gap;
  const isBottom = roomAbove < cardH && roomBelow > roomAbove;
  const desiredTop = isBottom ? props.screenY + gap : props.screenY - gap - cardH;
  const cardTop = Math.max(safeTop, Math.min(props.safeBottom - cardH, desiredTop));
  const caretOffset = props.screenX - clampedX;
  const maxCaretOffset = halfW - 24;
  const clampedCaretOffset = Math.max(-maxCaretOffset, Math.min(maxCaretOffset, caretOffset));

  return {
    x: clampedX,
    y: isBottom ? cardTop - gap : cardTop + cardH + gap,
    width,
    maxHeight,
    isBottom,
    caretOffset: clampedCaretOffset
  };
});

const placementClass = computed(() => clampedPosition.value.isBottom ? 'placement-bottom' : 'placement-top');

const popupStyle = computed(() => {
  return {
    left: `${clampedPosition.value.x}px`,
    top: `${clampedPosition.value.y}px`,
    width: `${clampedPosition.value.width}px`,
    '--popup-max-height': `${clampedPosition.value.maxHeight}px`
  };
});

const caretStyle = computed(() => {
  const rotDeg = clampedPosition.value.isBottom ? '225deg' : '45deg';
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
  filter: drop-shadow(0 14px 35px rgba(0, 0, 0, 0.6));
  transition: opacity 0.18s ease;
  font-size: 12px;
  user-select: none;
}

.anchored-popup.placement-top {
  transform: translate(-50%, -100%);
  margin-top: -14px;
}
.anchored-popup.placement-top .popup-caret {
  bottom: -6px;
  top: auto;
  transform: translateX(-50%) rotate(45deg);
  border-right: 1px solid rgba(0, 240, 255, 0.4);
  border-bottom: 1px solid rgba(0, 240, 255, 0.4);
  border-left: none;
  border-top: none;
  background: rgba(11, 18, 30, 0.96);
}

.anchored-popup.placement-bottom {
  transform: translate(-50%, 0);
  margin-top: 14px;
}
.anchored-popup.placement-bottom .popup-caret {
  top: -6px;
  bottom: auto;
  transform: translateX(-50%) rotate(225deg);
  border-right: 1px solid rgba(0, 240, 255, 0.4);
  border-bottom: 1px solid rgba(0, 240, 255, 0.4);
  border-left: none;
  border-top: none;
  background: rgba(11, 18, 30, 0.96);
}

.popup-card {
  width: 100%;
  background: linear-gradient(135deg, rgba(11, 18, 30, 0.94) 0%, rgba(15, 23, 42, 0.90) 100%);
  border: 1px solid rgba(0, 240, 255, 0.35);
  border-radius: 12px;
  padding: 14px 16px;
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.65), inset 0 0 16px rgba(0, 240, 255, 0.06);
  max-height: var(--popup-max-height);
  overflow-y: auto;
  overscroll-behavior: contain;
  touch-action: pan-y;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}
.popup-caret {
  position: absolute;
  left: 50%;
  width: 12px;
  height: 12px;
  pointer-events: none;
  transition: transform 0.1s ease;
}
.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 8px;
  margin-bottom: 10px;
  gap: 12px;
}
.header-action-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.popup-title {
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 6px;
}
.popup-sub {
  font-size: 10px;
  color: #94a3b8;
  margin-top: 2px;
  font-family: ui-monospace, monospace;
}
.popup-tag {
  font-size: 10px;
  font-weight: 700;
  color: #00f0ff;
  background: rgba(0, 240, 255, 0.12);
  border: 1px solid rgba(0, 240, 255, 0.35);
  padding: 2px 7px;
  border-radius: 10px;
  white-space: nowrap;
}
.popup-close {
  cursor: pointer;
  color: #94a3b8;
  font-size: 18px;
  line-height: 1;
  padding: 2px 5px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  transition: all 0.15s;
}
.popup-close:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.12);
}
.data-block {
  margin-bottom: 7px;
}
.data-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
}
.data-label { color: #94a3b8; }
.data-val { font-weight: 600; color: #f1f5f9; font-family: ui-monospace, monospace; }
.data-val.blue { color: #38bdf8; }
.data-val.green { color: #34d399; }
.progress-wrap {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 4px;
  margin-bottom: 5px;
}
.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #0284c7, #00f0ff);
  border-radius: 2px;
  box-shadow: 0 0 6px rgba(0, 240, 255, 0.5);
  transition: width 0.3s;
}
</style>
