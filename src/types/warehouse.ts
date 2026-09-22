export interface EntityDataRow {
  l: string;
  v: string;
  blue?: boolean;
  green?: boolean;
  progress?: number;
}

export interface EntityDetail {
  title: string;
  sub: string;
  tag: string;
  rows: EntityDataRow[];
}

export type EntityKey =
  | 'pc_workstation'
  | 'conveyor_dock1'
  | 'pallet_east'
  | 'pallet_south'
  | 'truck_dock1'
  | 'truck_dock2'
  | 'outbound_truck'
  | 'agv_robot'
  | 'cold_storage';

export interface PopupState {
  visible: boolean;
  entityKey: EntityKey | null;
  detail: EntityDetail | null;
  anchorWorldPos: [number, number, number];
  isMoving: boolean;
}

export interface KpiItem {
  icon: string;
  iconBg: string;
  title: string;
  value: string;
  unit: string;
  badge?: string;
  badgeType?: 'green' | 'blue' | 'amber';
  trend?: string;
}
