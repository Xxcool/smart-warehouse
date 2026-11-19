import type { AgvPhase } from '../types/warehouse';

export const AGV_LAPS_PER_SECOND = 0.035;
const BELT_TRAVEL_SECONDS = 9;
const BELT_TRANSFER_SECONDS = 0.65;
const PICKUP_ZONE_RADIUS = 0.45;

export const AGV_PHASE_LABELS: Record<AgvPhase, string> = {
  pickup: '月台接驳',
  loaded: '重载运输',
  returning: '空车回流'
};

export function getAgvFrame(
  elapsed: number, id: number, offset: number, routeLength: number, unloadProgress: number
) {
  const lap = elapsed * AGV_LAPS_PER_SECOND + offset;
  const cycle = Math.floor(lap);
  const progress = lap - cycle;
  const hasCargo = progress < unloadProgress;
  const nearPickup = Math.min(progress, 1 - progress) * routeLength <= PICKUP_ZONE_RADIUS;
  const phase: AgvPhase = nearPickup ? 'pickup' : (hasCargo ? 'loaded' : 'returning');

  // 传送带上的货箱用于车辆的下一次到站。跨过同一个圈界时，由车上的货箱接替。
  const secondsToPickup = (1 - progress) / AGV_LAPS_PER_SECOND;
  return {
    progress,
    hasCargo,
    phase,
    cargoIsKraft: (id - 1 + cycle) % 2 === 0,
    beltProgress: 1 - secondsToPickup / BELT_TRAVEL_SECONDS,
    beltTransfer: Math.max(0, 1 - secondsToPickup / BELT_TRANSFER_SECONDS)
  };
}
