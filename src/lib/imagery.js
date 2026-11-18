import { BASEMAPS } from '../lib/constants'
import { latLngToTileFraction } from '../lib/geo'

const TILE_SIZE = 256

export const IMAGERY_TILE_SIZE = TILE_SIZE

export const captureCenteredGrid = async (lat, lng, zoom = 18, grid = 3) => {
  const z = Math.max(0, Math.min(19, Math.floor(zoom)))
  const fraction = latLngToTileFraction(lat, lng, z)
  const baseX = Math.floor(fraction.x)
  const baseY = Math.floor(fraction.y)
  const half = Math.floor(grid / 2)
  const template = (BASEMAPS[0]?.url ?? '').replace('{z}', z)

  const canvas = document.createElement('canvas')
  canvas.width = grid * TILE_SIZE
  canvas.height = grid * TILE_SIZE
  const context = canvas.getContext('2d')

  const tiles = []
  for (let row = -half; row <= half; row += 1) {
    for (let column = -half; column <= half; column += 1) {
      tiles.push({
        x: baseX + column,
        y: baseY + row,
        left: (column + half) * TILE_SIZE,
        top: (row + half) * TILE_SIZE,
      })
    }
  }

  await Promise.all(
    tiles.map(
      (tile) =>
        new Promise((resolve, reject) => {
          const image = new Image()
          image.crossOrigin = 'anonymous'
          image.onload = () => {
            context.drawImage(image, tile.left, tile.top, TILE_SIZE, TILE_SIZE)
            resolve()
          }
          image.onerror = () => reject(new Error('Satellite tile could not be loaded'))
          image.src = template.replace('{x}', tile.x).replace('{y}', tile.y)
        }),
    ),
  )

  return {
    src: canvas.toDataURL('image/jpeg', 0.9),
    width: canvas.width,
    height: canvas.height,
    zoom: z,
    originX: baseX - half,
    originY: baseY - half,
    tileCount: tiles.length,
  }
}

export const captureTileGrid = async (lat, lng, zoom = 18, grid = 3) =>
  (await captureCenteredGrid(lat, lng, zoom, grid)).src

// Unlike captureCenteredGrid, this keeps the requested lat/lng at the exact
// pixel centre of the returned image. That matters when asking Gemini whether
// the structure at the centre is a barn.
export const captureCenteredCrop = async (lat, lng, { zoom = 19, size = 512 } = {}) => {
  const z = Math.max(0, Math.min(19, Math.floor(zoom)))
  const dimension = Math.max(128, Math.floor(size))
  const fraction = latLngToTileFraction(lat, lng, z)
  const centerPxX = fraction.x * TILE_SIZE
  const centerPxY = fraction.y * TILE_SIZE
  const half = dimension / 2
  const minX = Math.floor((centerPxX - half) / TILE_SIZE)
  const maxX = Math.floor((centerPxX + half) / TILE_SIZE)
  const minY = Math.floor((centerPxY - half) / TILE_SIZE)
  const maxY = Math.floor((centerPxY + half) / TILE_SIZE)

  const template = (BASEMAPS[0]?.url ?? '').replace('{z}', z)
  const canvas = document.createElement('canvas')
  canvas.width = dimension
  canvas.height = dimension
  const context = canvas.getContext('2d')

  const tiles = []
  for (let tileY = minY; tileY <= maxY; tileY += 1) {
    for (let tileX = minX; tileX <= maxX; tileX += 1) tiles.push({ x: tileX, y: tileY })
  }

  await Promise.all(
    tiles.map(
      (tile) =>
        new Promise((resolve, reject) => {
          const image = new Image()
          image.crossOrigin = 'anonymous'
          image.onload = () => {
            context.drawImage(
              image,
              tile.x * TILE_SIZE - centerPxX + half,
              tile.y * TILE_SIZE - centerPxY + half,
              TILE_SIZE,
              TILE_SIZE,
            )
            resolve()
          }
          image.onerror = () => reject(new Error('Satellite tile could not be loaded'))
          image.src = template.replace('{x}', tile.x).replace('{y}', tile.y)
        }),
    ),
  )

  return {
    src: canvas.toDataURL('image/jpeg', 0.95),
    width: dimension,
    height: dimension,
    zoom: z,
    originX: (centerPxX - half) / TILE_SIZE,
    originY: (centerPxY - half) / TILE_SIZE,
    centerFraction: fraction,
    tileCount: tiles.length,
  }
}

const tileRangeForBounds = (bounds, zoom) => {
  const northWest = latLngToTileFraction(bounds.north, bounds.west, zoom)
  const southEast = latLngToTileFraction(bounds.south, bounds.east, zoom)
  return {
    minX: Math.floor(Math.min(northWest.x, southEast.x)),
    maxX: Math.floor(Math.max(northWest.x, southEast.x)),
    minY: Math.floor(Math.min(northWest.y, southEast.y)),
    maxY: Math.floor(Math.max(northWest.y, southEast.y)),
  }
}

export const captureBoundsGrid = async (bounds, { zoom = 17, maxTiles = 49 } = {}) => {
  if (!bounds) throw new Error('No scan bounds available')

  let z = Math.max(10, Math.min(19, Math.floor(zoom)))
  let range = tileRangeForBounds(bounds, z)
  // Step down until the whole sector fits in a manageable image for Gemini.
  while ((range.maxX - range.minX + 1) * (range.maxY - range.minY + 1) > maxTiles && z > 10) {
    z -= 1
    range = tileRangeForBounds(bounds, z)
  }

  const columns = range.maxX - range.minX + 1
  const rows = range.maxY - range.minY + 1
  const canvas = document.createElement('canvas')
  canvas.width = columns * TILE_SIZE
  canvas.height = rows * TILE_SIZE
  const context = canvas.getContext('2d')
  const template = (BASEMAPS[0]?.url ?? '').replace('{z}', z)

  await Promise.all(
    Array.from({ length: columns * rows }, (_, index) => {
      const column = index % columns
      const row = Math.floor(index / columns)
      return new Promise((resolve, reject) => {
        const image = new Image()
        image.crossOrigin = 'anonymous'
        image.onload = () => {
          context.drawImage(image, column * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE)
          resolve()
        }
        image.onerror = () => reject(new Error('Satellite tile could not be loaded'))
        image.src = template
          .replace('{x}', range.minX + column)
          .replace('{y}', range.minY + row)
      })
    }),
  )

  return {
    src: canvas.toDataURL('image/jpeg', 0.9),
    width: canvas.width,
    height: canvas.height,
    zoom: z,
    originX: range.minX,
    originY: range.minY,
    tileCount: columns * rows,
  }
}
