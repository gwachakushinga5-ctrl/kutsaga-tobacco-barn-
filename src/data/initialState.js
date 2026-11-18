export const INITIAL_DETECTIONS = []
export const INITIAL_TRB_REGISTRY = []
export const INITIAL_CURRENT_SCAN_IDS = []
export const INITIAL_SECTORS = []

export const INITIAL_COUNTS = {
  waiting: 0,
  approved: 0,
  rejected: 0,
  uncertain: 0,
  total: 0,
}

export const INITIAL_TELEMETRY = {
  tilesDone: 0,
  tilesTotal: 0,
  percent: 0,
  label: 'No scan yet',
  threshold: 0.65,
  lastScan: null,
}
