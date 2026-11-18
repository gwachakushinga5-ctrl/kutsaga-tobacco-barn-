const EARTH_RADIUS = 6378137
const METERS_PER_DEGREE_LAT = 111320

const toRad = (value) => (value * Math.PI) / 180

export const metersToLat = (meters) => meters / METERS_PER_DEGREE_LAT

export const metersToLng = (meters, lat) =>
  meters / (METERS_PER_DEGREE_LAT * Math.cos(toRad(lat)))

export const offsetLatLng = (lat, lng, northMeters = 0, eastMeters = 0) => [
  lat + metersToLat(northMeters),
  lng + metersToLng(eastMeters, lat),
]

export const bboxFromCenter = (lat, lng, widthMeters, heightMeters) => {
  const halfLat = metersToLat(heightMeters / 2)
  const halfLng = metersToLng(widthMeters / 2, lat)
  return {
    south: lat - halfLat,
    north: lat + halfLat,
    west: lng - halfLng,
    east: lng + halfLng,
  }
}

export const areaFromDimensions = (widthMeters, heightMeters) =>
  Number((widthMeters * heightMeters).toFixed(1))

export const haversineMeters = (lat1, lng1, lat2, lng2) => {
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(a))
}

export const geodesicArea = (points) => {
  if (!points || points.length < 3) return 0
  let total = 0
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]
    const next = points[(index + 1) % points.length]
    total +=
      toRad(next.lng - current.lng) *
      (2 + Math.sin(toRad(current.lat)) + Math.sin(toRad(next.lat)))
  }
  return Math.abs((total * EARTH_RADIUS * EARTH_RADIUS) / 2)
}

export const formatArea = (squareMeters) => {
  if (!Number.isFinite(squareMeters) || squareMeters <= 0) return '—'
  if (squareMeters < 10000) return `${Math.round(squareMeters)} m²`
  return `${(squareMeters / 10000).toFixed(2)} ha`
}

export const boundsOfPoints = (points) => {
  const lats = points.map((point) => point.lat)
  const lngs = points.map((point) => point.lng)
  return {
    south: Math.min(...lats),
    north: Math.max(...lats),
    west: Math.min(...lngs),
    east: Math.max(...lngs),
  }
}

export const boundsToLatLngs = (bounds) => [
  [bounds.south, bounds.west],
  [bounds.south, bounds.east],
  [bounds.north, bounds.east],
  [bounds.north, bounds.west],
]

export const boundsFromLeaflet = (leafletBounds) => ({
  south: leafletBounds.getSouth(),
  west: leafletBounds.getWest(),
  north: leafletBounds.getNorth(),
  east: leafletBounds.getEast(),
})

export const isPointInBounds = (lat, lng, bounds) => {
  if (!bounds) return true
  return lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east
}

export const lngToTileFraction = (lng, zoom) => ((lng + 180) / 360) * 2 ** zoom

export const latToTileFraction = (lat, zoom) => {
  const rad = toRad(lat)
  return (
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** zoom
  )
}

export const latLngToTileFraction = (lat, lng, zoom) => ({
  x: lngToTileFraction(lng, zoom),
  y: latToTileFraction(lat, zoom),
})
