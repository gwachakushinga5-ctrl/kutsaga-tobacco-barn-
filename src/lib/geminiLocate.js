import { analyzeBarnImage } from '../services/gemini'
import { captureBoundsGrid, IMAGERY_TILE_SIZE } from './imagery'
import {
  geodesicArea,
  haversineMeters,
  isPointInBounds,
  tileFractionToLatLng,
} from './geo'

const CONFIDENCE_SCORE = { high: 0.92, medium: 0.72, low: 0.52 }

const normalizeBoxValue = (value) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  const scaled = number >= 0 && number <= 1 ? number * 1000 : number
  return Math.min(1000, Math.max(0, scaled))
}

const nearestTrb = (lat, lng, registry) =>
  registry.reduce(
    (best, item) => {
      const distance = haversineMeters(lat, lng, item.lat, item.lng)
      return distance < best.distance ? { item, distance } : best
    },
    { item: null, distance: Infinity },
  )

export const locateBarnsInBounds = async ({
  bounds,
  label,
  apiKey,
  trbRegistry = [],
  zoom = 17,
  maxTiles = 49,
}) => {
  if (!apiKey) throw new Error('Add a Gemini API key first')
  if (!bounds) throw new Error('No scan bounds available')

  const grid = await captureBoundsGrid(bounds, { zoom, maxTiles })
  const boxes = await analyzeBarnImage(grid.src, apiKey)

  const toLatLng = (x, y) => {
    const fractionX = grid.originX + (x / 1000) * (grid.width / IMAGERY_TILE_SIZE)
    const fractionY = grid.originY + (y / 1000) * (grid.height / IMAGERY_TILE_SIZE)
    return tileFractionToLatLng(fractionX, fractionY, grid.zoom)
  }

  const stamp = Date.now()
  return boxes
    .map((item, index) => {
      const [yMin, xMin, yMax, xMax] = (item.box_2d ?? []).map(normalizeBoxValue)
      if (xMax <= xMin || yMax <= yMin) return null

      const center = toLatLng((xMin + xMax) / 2, (yMin + yMax) / 2)
      if (!isPointInBounds(center.lat, center.lng, bounds)) return null

      const southWest = toLatLng(xMin, yMax)
      const northEast = toLatLng(xMax, yMin)
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
      const confidence = CONFIDENCE_SCORE[item.confidence] ?? CONFIDENCE_SCORE.low
      const match = nearestTrb(center.lat, center.lng, trbRegistry)
      const trbMatch = match.distance <= 55

      return {
        id: `GEMINI-${stamp}-${index}`,
        complexId: `GEMINI-${stamp}-${index}`,
        name: 'Gemini barn',
        lat: center.lat,
        lng: center.lng,
        confidence,
        area,
        priority: confidence,
        status: 'waiting',
        reviewStatus: null,
        trbState: trbMatch ? 'POSSIBLE_EXISTING_MATCH' : 'NO_MATCH',
        reviewBand: area < 35 ? 'SMALL_STRUCTURE_SCRUTINY' : 'STANDARD',
        sector: label,
        detectedAt: new Date(stamp).toISOString(),
        bbox,
        trbId: trbMatch ? match.item.id : null,
        trbName: trbMatch ? match.item.name : null,
        trbDistance: Number.isFinite(match.distance) ? match.distance : null,
        small: area < 35,
        rejectionReason: null,
        barnCount: 1,
        detections: [],
        source: 'gemini',
      }
    })
    .filter(Boolean)
}
