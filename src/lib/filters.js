import { PAGE_SIZE, STATUS_ORDER } from './constants'

export const countByStatus = (detections) => {
  const counts = Object.fromEntries(STATUS_ORDER.map((status) => [status, 0]))
  detections.forEach((detection) => {
    if (counts[detection.status] !== undefined) {
      counts[detection.status] += 1
    }
  })
  return counts
}

export const filterDetections = (
  detections,
  { status = 'all', trbState = 'all', reviewBand = 'all', minPriority = 0 },
) =>
  detections.filter((detection) => {
    if (status !== 'all' && detection.status !== status) return false
    if (trbState !== 'all' && detection.trbState !== trbState) return false
    if (reviewBand !== 'all' && detection.reviewBand !== reviewBand) return false
    if (detection.priority < minPriority) return false
    return true
  })

export const paginate = (items, page) => {
  const safePage = Math.max(1, page)
  const start = (safePage - 1) * PAGE_SIZE
  return items.slice(start, start + PAGE_SIZE)
}

export const pageCountFor = (total) => Math.max(1, Math.ceil(total / PAGE_SIZE))

export const statusLabel = (status) => {
  const labels = {
    waiting: 'Waiting approval',
    approved: 'Approved',
    rejected: 'Rejected',
    uncertain: 'Uncertain',
  }
  return labels[status] ?? status
}
