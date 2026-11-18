import { BASEMAPS } from '../lib/constants'
import { latLngToTileFraction } from '../lib/geo'

const TILE_SIZE = 256

export const captureTileGrid = async (lat, lng, zoom = 18, grid = 3) => {
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

  return canvas.toDataURL('image/jpeg', 0.9)
}
