const METERS_PER_DEGREE_LAT = 111320
const toRad = (value) => (value * Math.PI) / 180

const REVIEW_CATEGORY_TO_STATUS = {
  pending: 'waiting',
  approved: 'approved',
  rejected: 'rejected',
  uncertain: 'uncertain',
}

const RAW_STATUS_TO_UI = {
  WAITING_APPROVAL: 'waiting',
  PENDING: 'waiting',
  APPROVED: 'approved',
  CANDIDATE: 'waiting',
  CONFIRMED_DISCOVERY: 'approved',
  CONFIRMED_EXISTING: 'approved',
  REJECTED: 'rejected',
  UNCERTAIN: 'uncertain',
}

export const uiStatus = (properties) =>
  REVIEW_CATEGORY_TO_STATUS[properties?.review_category] ??
  RAW_STATUS_TO_UI[properties?.status] ??
  'waiting'

export const VERDICT_BY_STATUS = {
  approved: 'CONFIRMED_DISCOVERY',
  rejected: 'REJECTED',
  uncertain: 'UNCERTAIN',
}

export const verdictFor = (status, trbState) => {
  if (status === 'approved') {
    return trbState === 'POSSIBLE_EXISTING_MATCH'
      ? 'CONFIRMED_EXISTING'
      : 'CONFIRMED_DISCOVERY'
  }
  return VERDICT_BY_STATUS[status] ?? 'UNCERTAIN'
}

const bboxFromDetections = (detections, lng, lat) => {
  const lngs = []
  const lats = []
  detections.forEach((detection) => {
    detection?.obb?.coordinates?.forEach((ring) => {
      ring.forEach(([x, y]) => {
        if (Number.isFinite(x) && Number.isFinite(y)) {
          lngs.push(x)
          lats.push(y)
        }
      })
    })
  })
  if (!lngs.length) {
    const dLat = 18 / METERS_PER_DEGREE_LAT
    const dLng = 18 / (METERS_PER_DEGREE_LAT * Math.cos(toRad(lat || 0)))
    return {
      south: (lat || 0) - dLat,
      north: (lat || 0) + dLat,
      west: (lng || 0) - dLng,
      east: (lng || 0) + dLng,
    }
  }
  return {
    south: Math.min(...lats),
    north: Math.max(...lats),
    west: Math.min(...lngs),
    east: Math.max(...lngs),
  }
}

const maxConfidence = (detections) =>
  detections.reduce((max, detection) => Math.max(max, detection?.confidence ?? 0), 0)

export const candidateToDetection = (feature) => {
  const properties = feature?.properties ?? {}
  const [lng, lat] = feature?.geometry?.coordinates ?? [0, 0]
  const detections = Array.isArray(properties.detections) ? properties.detections : []
  const barnCount = properties.barn_count ?? detections.length
  const area = properties.total_footprint_m2 ?? 0
  const trbState = properties.trb_match_status ?? 'NO_MATCH'
  const reviewBand = properties.review_band ?? 'STANDARD'

  return {
    id: properties.complex_id,
    complexId: properties.complex_id,
    scanJobId: properties.scan_job_id,
    name: `${barnCount} barn${barnCount === 1 ? '' : 's'}`,
    lat,
    lng,
    confidence: maxConfidence(detections),
    area,
    priority: properties.review_priority_score ?? 0,
    status: uiStatus(properties),
    reviewStatus: properties.review_status,
    trbState,
    reviewBand,
    sector: properties.scan_job_id
      ? `Scan ${String(properties.scan_job_id).slice(0, 8)}`
      : 'Registry',
    detectedAt: properties.last_scanned_at ?? properties.scan_created_at ?? null,
    bbox: bboxFromDetections(detections, lng, lat),
    trbId: properties.nearest_trb_id ?? null,
    trbName:
      properties.nearest_trb_id != null ? `TRB #${properties.nearest_trb_id}` : null,
    trbDistance: properties.nearest_trb_dist_m ?? null,
    small: reviewBand === 'SMALL_STRUCTURE_SCRUTINY' || area < 35,
    rejectionReason: null,
    barnCount,
    detections,
  }
}

export const groundTruthToTrb = (feature) => {
  const properties = feature?.properties ?? {}
  const [lng, lat] = feature?.geometry?.coordinates ?? [0, 0]
  return {
    id: `TRB-${properties.record_id}`,
    recordId: properties.record_id,
    lat,
    lng,
    name: properties.source ?? 'Ground truth',
    registeredAt: null,
  }
}

export const mapCounts = (counts) => ({
  waiting: counts?.waiting_approval ?? 0,
  approved: counts?.approved ?? 0,
  rejected: counts?.rejected ?? 0,
  uncertain: counts?.uncertain ?? 0,
  total: counts?.total ?? 0,
})

const closeRing = (ring) => {
  if (!ring.length) return ring
  const first = ring[0]
  const last = ring[ring.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) return [...ring, first]
  return ring
}

export const aoiPolygonFromPoints = (points) => ({
  type: 'Polygon',
  coordinates: [closeRing(points.map((point) => [point.lng, point.lat]))],
})

export const aoiPolygonFromBounds = (bounds) => ({
  type: 'Polygon',
  coordinates: [
    [
      [bounds.west, bounds.south],
      [bounds.east, bounds.south],
      [bounds.east, bounds.north],
      [bounds.west, bounds.north],
      [bounds.west, bounds.south],
    ],
  ],
})
