export const MAP_CENTER = [-17.9305, 31.099]
export const MAP_ZOOM = 17
export const PAGE_SIZE = 5
export const SCAN_TILES = 12

export const BASEMAPS = [
  {
    id: 'google',
    label: 'Satellite with labels (Google)',
    shortLabel: 'Google+',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: 'Imagery © Google',
    maxNativeZoom: 19,
    maxZoom: 19,
  },
]

export const STATUS_ORDER = ['waiting', 'approved', 'rejected', 'uncertain']

export const STATUS_META = {
  waiting: {
    key: 'waiting',
    label: 'Waiting approval',
    shortLabel: 'Waiting',
    color: '#f59e0b',
    dotClass: 'bg-amber-400',
    textClass: 'text-amber-300',
    borderClass: 'border-amber-500/35',
    softBgClass: 'bg-amber-500/10',
    pillClass: 'border-amber-500/35 bg-amber-500/10 text-amber-300',
    activeCardClass: 'border-amber-500/70 bg-amber-500/10 shadow-[0_0_24px_-6px_rgba(245,158,11,0.65)]',
  },
  approved: {
    key: 'approved',
    label: 'Approved barn',
    shortLabel: 'Approved',
    color: '#3b82f6',
    dotClass: 'bg-blue-500',
    textClass: 'text-blue-300',
    borderClass: 'border-blue-500/35',
    softBgClass: 'bg-blue-500/10',
    pillClass: 'border-blue-500/35 bg-blue-500/10 text-blue-300',
    activeCardClass: 'border-blue-500/70 bg-blue-500/10 shadow-[0_0_24px_-6px_rgba(59,130,246,0.65)]',
  },
  rejected: {
    key: 'rejected',
    label: 'Rejected',
    shortLabel: 'Rejected',
    color: '#ef4444',
    dotClass: 'bg-red-500',
    textClass: 'text-red-300',
    borderClass: 'border-red-500/30',
    softBgClass: 'bg-red-500/10',
    pillClass: 'border-red-500/30 bg-red-500/10 text-red-300',
    activeCardClass: 'border-red-500/60 bg-red-500/10 shadow-[0_0_24px_-6px_rgba(239,68,68,0.55)]',
  },
  uncertain: {
    key: 'uncertain',
    label: 'Uncertain',
    shortLabel: 'Uncertain',
    color: '#a855f7',
    dotClass: 'bg-purple-500',
    textClass: 'text-purple-300',
    borderClass: 'border-purple-500/35',
    softBgClass: 'bg-purple-500/10',
    pillClass: 'border-purple-500/35 bg-purple-500/10 text-purple-300',
    activeCardClass: 'border-purple-500/70 bg-purple-500/10 shadow-[0_0_24px_-6px_rgba(168,85,247,0.6)]',
  },
}

export const MAP_COLORS = {
  trb: '#10b981',
  small: '#f43f5e',
  cyan: '#22d3ee',
  teal: '#14b8a6',
  dim: '#020617',
}

export const TRB_STATES = [
  { value: 'POSSIBLE_EXISTING_MATCH', label: 'Possible existing match' },
  { value: 'ADJACENT_STRUCTURE', label: 'Adjacent structure' },
  { value: 'NO_MATCH', label: 'No match' },
]

export const REVIEW_BANDS = [
  { value: 'STANDARD', label: 'Standard' },
  { value: 'SMALL_STRUCTURE_SCRUTINY', label: 'Small structure scrutiny' },
]

const ZONE_HALF_SPAN = 0.014

const makeZone = (id, name, lat, lng) => ({
  id,
  name,
  center: [lat, lng],
  bounds: [
    [lat - ZONE_HALF_SPAN, lng - ZONE_HALF_SPAN],
    [lat + ZONE_HALF_SPAN, lng + ZONE_HALF_SPAN],
  ],
})

export const ZONES = [
  {
    id: 'kutsaga-research',
    name: 'Kutsaga Research Farm',
    center: [-17.9305, 31.099],
    bounds: [
      [-17.9375, 31.0915],
      [-17.9235, 31.1075],
    ],
  },
  makeZone('chiweshe', 'Chiweshe Farms · Mazowe', -17.34, 31.28),
  makeZone('muzarabani', 'Muzarabani Farms', -16.42, 31.22),
  makeZone('mvurwi', 'Mvurwi Farms', -17.06, 31.05),
  makeZone('mazowe-valley', 'Mazowe Valley Farms', -17.47, 31.55),
  makeZone('bindura', 'Bindura Farms', -17.24, 31.27),
  makeZone('mount-darwin', 'Mount Darwin Farms', -16.79, 31.49),
  makeZone('guruve', 'Guruve Farms', -16.61, 30.7),
  makeZone('hurungwe', 'Hurungwe · Karoi Farms', -16.75, 29.63),
  makeZone('chinhoyi', 'Chinhoyi Farms', -17.43, 30.14),
  makeZone('goromonzi', 'Goromonzi Farms', -17.93, 31.38),
  makeZone('marondera', 'Marondera Farms', -18.12, 31.62),
  makeZone('hwedza', 'Hwedza Farms', -18.11, 31.72),
  makeZone('zviyambe', 'Zviyambe Farms · Hwedza', -18.28, 31.8),
  makeZone('rusape', 'Rusape Farms', -18.48, 32.06),
  makeZone('buhera', 'Buhera Farms', -19.28, 31.6),
  makeZone('chipinge', 'Chipinge Farms', -20.14, 32.55),
  makeZone('honde-valley', 'Honde Valley Farms', -18.41, 32.88),
  makeZone('gokwe', 'Gokwe Farms', -18.24, 28.85),
]

export const formatDateTime = (value, options = {}) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...options,
  }).format(date)
}
