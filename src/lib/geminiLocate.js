import { analyzeBarnImage, verifyBarnAtCenter } from '../services/gemini'
import {
  captureBoundsGrid,
  captureCenteredCrop,
  IMAGERY_TILE_SIZE,
} from './imagery'
import {
  geodesicArea,
  haversineMeters,
  isPointInBounds,
  tileFractionToLatLng,
} from './geo'

const CONFIDENCE_SCORE = { high: 0.92, medium: 0.72, low: 0.52 }
const MAX_REFINEMENTS = 12
const MIN_BARN_AREA = 25
const MAX_BARN_AREA = 2500

const normalizeBoxValue = (value) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  const scaled = number >= 0 && number <= 1 ? number * 1000 : number
  return Math.min(1000, Math.max(0, scaled))
}

const closestBox = (items, targetX = 500, targetY = 500) =>
  items
    .map((item) => {
      const values = (item?.box_2d ?? []).map(normalizeBoxValue)
      if (values.length !== 4) return null
      let [yMin, xMin, yMax, xMax] = values
      if (xMax <= xMin || yMax <= yMin) [xMin, yMin, xMax, yMax] = values
      if (xMax <= xMin || yMax <= yMin) return null
      return {
        xMin,
        yMin,
        xMax,
        yMax,
        confidence: item.confidence ?? 'low',
        distance: Math.hypot((xMin + xMax) / 2 - targetX, (yMin + yMax) / 2 - targetY),
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.distance - b.distance)[0] ?? null

// For the centred crop the candidate is at (500,500). Require the chosen box
// to actually cover that point and have a plausible barn footprint.
const CENTER_TOLERANCE = 60
const MIN_LONG_EDGE = 45
const MIN_SHORT_EDGE = 18
const MAX_ASPECT = 5

const centeredBox = (items, targetX = 500, targetY = 500) =>
  items
    .map((item) => {
      const values = (item?.box_2d ?? []).map(normalizeBoxValue)
      if (values.length !== 4) return null
      let [yMin, xMin, yMax, xMax] = values
      if (xMax <= xMin || yMax <= yMin) [xMin, yMin, xMax, yMax] = values
      if (xMax <= xMin || yMax <= yMin) return null

      const width = xMax - xMin
      const height = yMax - yMin
      const longEdge = Math.max(width, height)
      const shortEdge = Math.min(width, height)
      if (longEdge < MIN_LONG_EDGE || shortEdge < MIN_SHORT_EDGE) return null
      if (longEdge / shortEdge > MAX_ASPECT) return null
      if (
        xMin - CENTER_TOLERANCE > targetX ||
        xMax + CENTER_TOLERANCE < targetX ||
        yMin - CENTER_TOLERANCE > targetY ||
        yMax + CENTER_TOLERANCE < targetY
      ) {
        return null
      }

      return {
        xMin,
        yMin,
        xMax,
        yMax,
        confidence: item.confidence ?? 'low',
        distance: Math.hypot((xMin + xMax) / 2 - targetX, (yMin + yMax) / 2 - targetY),
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.distance - b.distance)[0] ?? null

const gridToLocation = (box, grid) => {
  const toLatLng = (x, y) => {
    const fractionX = grid.originX + (x / 1000) * (grid.width / IMAGERY_TILE_SIZE)
    const fractionY = grid.originY + (y / 1000) * (grid.height / IMAGERY_TILE_SIZE)
    return tileFractionToLatLng(fractionX, fractionY, grid.zoom)
  }
  const center = toLatLng((box.xMin + box.xMax) / 2, (box.yMin + box.yMax) / 2)
  const southWest = toLatLng(box.xMin, box.yMax)
  const northEast = toLatLng(box.xMax, box.yMin)
  const bbox = {
    south: southWest.lat,
    north: northEast.lat,
    west: southWest.lng,
    east: northEast.lng,
  }
  const area = geodesicArea([
    { lat: bbox.south, lng: bbox.west },
    { lat: bbox.south, lng: bbox.east },
    { lat: bbox.north, lng: bbox.east },
    { lat: bbox.north, lng: bbox.west },
  ])
  return {
    center,
    bbox,
    area,
    confidence: CONFIDENCE_SCORE[box.confidence] ?? CONFIDENCE_SCORE.low,
  }
}

const nearestTrb = (lat, lng, registry) =>
  registry.reduce(
    (best, item) => {
      const distance = haversineMeters(lat, lng, item.lat, item.lng)
      return distance < best.distance ? { item, distance } : best
    },
    { item: null, distance: Infinity },
  )

const applyLocation = (detection, location, trbRegistry, verification) => {
  const match = nearestTrb(location.center.lat, location.center.lng, trbRegistry)
  const trbMatch = match.distance <= 55
  return {
    ...detection,
    lat: location.center.lat,
    lng: location.center.lng,
    bbox: location.bbox,
    area: location.area,
    confidence: location.confidence,
    priority: location.confidence,
    status: 'waiting',
    reviewStatus: null,
    trbState: trbMatch ? 'POSSIBLE_EXISTING_MATCH' : 'NO_MATCH',
    trbId: trbMatch ? match.item.id : null,
    trbName: trbMatch ? match.item.name : null,
    trbDistance: Number.isFinite(match.distance) ? match.distance : null,
    reviewBand: location.area < 35 ? 'SMALL_STRUCTURE_SCRUTINY' : 'STANDARD',
    small: location.area < 35,
    geminiVerified: true,
    geminiReason: verification?.reason ?? 'Confirmed barn at candidate centre',
  }
}

const verifyCandidate = async (detection, apiKey, trbRegistry) => {
  const crop = await captureCenteredCrop(detection.lat, detection.lng, { zoom: 19 })
  const verification = await verifyBarnAtCenter(crop.src, apiKey)
  if (!verification.isBarn) return null

  const items = await analyzeBarnImage(crop.src, apiKey)
  const box = centeredBox(items)
  if (!box) return null

  const location = gridToLocation(box, crop)
  if (!isPointInBounds(location.center.lat, location.center.lng, detection.bounds)) return null
  if (location.area < MIN_BARN_AREA || location.area > MAX_BARN_AREA) return null

  return applyLocation(detection, location, trbRegistry, verification)
}

const refineDetections = async (detections, apiKey, trbRegistry) => {
  const refined = []
  for (let index = 0; index < detections.length; index += 3) {
    const batch = detections.slice(index, index + 3)
    const results = await Promise.all(
      batch.map(async (detection) => {
        try {
          return await verifyCandidate(detection, apiKey, trbRegistry)
        } catch {
          // A candidate that cannot be re-captured or verified is dropped
          // instead of being shown as a possible barn.
          return null
        }
      }),
    )
    refined.push(...results.filter(Boolean))
  }
  return refined
}

export const locateBarnsInBounds = async ({
  bounds,
  label,
  apiKey,
  trbRegistry = [],
  zoom = 18,
  maxTiles = 64,
}) => {
  if (!apiKey) throw new Error('Add a Gemini API key first')
  if (!bounds) throw new Error('No scan bounds available')

  const grid = await captureBoundsGrid(bounds, { zoom, maxTiles })
  const items = await analyzeBarnImage(grid.src, apiKey)

  const stamp = Date.now()
  const coarse = items
    .map((item, index) => {
      const box = closestBox([item])
      if (!box) return null
      const location = gridToLocation(box, grid)
      if (!isPointInBounds(location.center.lat, location.center.lng, bounds)) return null
      return {
        id: `GEMINI-${stamp}-${index}`,
        complexId: `GEMINI-${stamp}-${index}`,
        name: 'Gemini barn',
        lat: location.center.lat,
        lng: location.center.lng,
        confidence: location.confidence,
        area: location.area,
        priority: location.confidence,
        status: 'waiting',
        reviewStatus: null,
        trbState: 'NO_MATCH',
        reviewBand: location.area < 35 ? 'SMALL_STRUCTURE_SCRUTINY' : 'STANDARD',
        sector: label,
        detectedAt: new Date(stamp).toISOString(),
        bbox: location.bbox,
        trbId: null,
        trbName: null,
        trbDistance: null,
        small: location.area < 35,
        rejectionReason: null,
        barnCount: 1,
        detections: [],
        source: 'gemini',
        bounds,
      }
    })
    .filter(Boolean)
    .slice(0, MAX_REFINEMENTS)

  const refined = await refineDetections(coarse, apiKey, trbRegistry)
  return refined.map((detection) => {
    const { bounds: _bounds, ...rest } = detection
    return rest
  })
}
