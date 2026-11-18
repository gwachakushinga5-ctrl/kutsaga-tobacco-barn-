import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { INITIAL_COUNTS, INITIAL_SECTORS, INITIAL_TELEMETRY } from '../data/initialState'
import { STATUS_META } from '../lib/constants'
import { filterDetections, pageCountFor, paginate } from '../lib/filters'
import { locateBarnsInBounds } from '../lib/geminiLocate'
import { getGeminiKey } from '../services/gemini'
import {
  aoiPolygonFromBounds,
  aoiPolygonFromPoints,
  candidateToDetection,
  groundTruthToTrb,
  mapCounts,
  verdictFor,
} from '../lib/candidates'
import {
  exportRejectedNegatives,
  getCandidateCounts,
  getCandidates,
  getGroundTruth,
  getScanStatus,
  submitScan,
  verifyCandidate,
} from '../services/api'

const CANDIDATE_LIMIT = 500
const POLL_INTERVAL_MS = 1500
const MAX_SCAN_MS = 20 * 60 * 1000
const DISMISSED_KEY = 'kutsaga.dismissedCandidates'

const loadDismissed = () => {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY)
    const ids = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(ids) ? ids : [])
  } catch {
    return new Set()
  }
}

const persistDismissed = (ids) => {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]))
  } catch {
    /* storage unavailable */
  }
}

const sleep = (milliseconds) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })

const clampThreshold = (value) => Math.min(0.95, Math.max(0.1, Number(value) || 0.65))

const hasPointCoordinates = (feature) => {
  const coordinates = feature?.geometry?.coordinates
  return (
    Array.isArray(coordinates) &&
    Number.isFinite(coordinates[0]) &&
    Number.isFinite(coordinates[1])
  )
}

const downloadJson = (payload, filename) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

const mostRecentJobId = (detections, explicitJobId) => {
  if (explicitJobId) return explicitJobId
  let best = null
  let bestTime = -Infinity
  detections.forEach((detection) => {
    if (!detection.scanJobId) return
    const time = detection.detectedAt ? Date.parse(detection.detectedAt) : 0
    if (time >= bestTime) {
      bestTime = time
      best = detection.scanJobId
    }
  })
  return best
}

export const useDashboardState = () => {
  const [detections, setDetections] = useState([])
  const [scanDetections, setScanDetections] = useState([])
  const [trbRegistry, setTrbRegistry] = useState([])
  const [sectors, setSectors] = useState(INITIAL_SECTORS)
  const [activeTab, setActiveTab] = useState('global')
  const [statusFilter, setStatusFilter] = useState('waiting')
  const [trbFilter, setTrbFilter] = useState('all')
  const [bandFilter, setBandFilter] = useState('all')
  const [minPriority, setMinPriority] = useState(0)
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState(null)
  const [dismissedIds, setDismissedIds] = useState(loadDismissed)
  const [scanStatus, setScanStatus] = useState('IDLE')
  const [scanJobId, setScanJobId] = useState(null)
  const [telemetry, setTelemetry] = useState(INITIAL_TELEMETRY)
  const [countsByScope, setCountsByScope] = useState({
    global: INITIAL_COUNTS,
    current: INITIAL_COUNTS,
  })
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState([])
  const [taxonomyOpen, setTaxonomyOpen] = useState(false)
  const [geminiLocate, setGeminiLocate] = useState(() => Boolean(getGeminiKey()))
  const [geminiStatus, setGeminiStatus] = useState(() =>
    getGeminiKey() ? 'Gemini-only mode ready' : 'Model detector active (Gemini off)',
  )
  const [exporting, setExporting] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const toastTimers = useRef(new Map())

  useEffect(() => {
    const onKeyChange = (event) => {
      const key = event.detail ?? ''
      if (key) {
        setGeminiLocate(true)
        setGeminiStatus('Gemini-only mode ready')
      } else {
        setGeminiLocate(false)
        setGeminiStatus('Model detector active (Gemini off)')
      }
    }
    window.addEventListener('kutsaga:geminiKey', onKeyChange)
    return () => window.removeEventListener('kutsaga:geminiKey', onKeyChange)
  }, [])

  const toggleGeminiLocate = useCallback(() => {
    const next = !geminiLocate
    setGeminiLocate(next)
    setGeminiStatus(
      next
        ? getGeminiKey()
          ? 'Gemini-only mode ready'
          : 'Gemini: no API key — locate skipped'
        : 'Model detector active (Gemini off)',
    )
  }, [geminiLocate])

  // Gemini-only mode: the model detector keeps running for scan bookkeeping,
  // but its candidates are hidden. Only Gemini-confirmed barns reach the UI.
  const scopedDetections = useMemo(() => {
    const scope = activeTab === 'current' ? scanDetections : detections
    return geminiLocate ? scope.filter((detection) => detection.source === 'gemini') : scope
  }, [activeTab, detections, geminiLocate, scanDetections])

  const allDetections = useMemo(
    () => scopedDetections.filter((detection) => !dismissedIds.has(detection.id)),
    [dismissedIds, scopedDetections],
  )

  const counts = useMemo(() => {
    const base = geminiLocate
      ? {
          waiting: scopedDetections.filter((item) => item.status === 'waiting').length,
          approved: scopedDetections.filter((item) => item.status === 'approved').length,
          rejected: scopedDetections.filter((item) => item.status === 'rejected').length,
          uncertain: scopedDetections.filter((item) => item.status === 'uncertain').length,
          total: scopedDetections.length,
        }
      : activeTab === 'current'
        ? countsByScope.current
        : countsByScope.global
    const adjusted = { ...base }
    scopedDetections.forEach((detection) => {
      if (!dismissedIds.has(detection.id)) return
      if (adjusted[detection.status] != null) {
        adjusted[detection.status] = Math.max(0, adjusted[detection.status] - 1)
      }
      if (adjusted.total != null) {
        adjusted.total = Math.max(0, adjusted.total - 1)
      }
    })
    return adjusted
  }, [activeTab, countsByScope, dismissedIds, geminiLocate, scopedDetections])

  const filteredDetections = useMemo(
    () =>
      filterDetections(allDetections, {
        status: statusFilter,
        trbState: trbFilter,
        reviewBand: bandFilter,
        minPriority,
      }),
    [allDetections, bandFilter, minPriority, statusFilter, trbFilter],
  )

  const pageCount = pageCountFor(filteredDetections.length)
  const safePage = Math.min(page, pageCount)
  const pageRows = useMemo(
    () => paginate(filteredDetections, safePage),
    [filteredDetections, safePage],
  )
  const selectedDetection = useMemo(
    () =>
      detections.find(
        (detection) => detection.id === selectedId && !dismissedIds.has(detection.id),
      ) ??
      scanDetections.find(
        (detection) => detection.id === selectedId && !dismissedIds.has(detection.id),
      ) ??
      null,
    [detections, dismissedIds, scanDetections, selectedId],
  )

  useEffect(() => {
    setPage(1)
  }, [activeTab, statusFilter, trbFilter, bandFilter, minPriority])

  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  useEffect(
    () => () => {
      toastTimers.current.forEach((timer) => clearTimeout(timer))
    },
    [],
  )

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
    const timer = toastTimers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      toastTimers.current.delete(id)
    }
  }, [])

  const addToast = useCallback((message, type = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts((current) => [...current.slice(-3), { id, message, type }])
    const timer = setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
      toastTimers.current.delete(id)
    }, 4200)
    toastTimers.current.set(id, timer)
  }, [])

  const loadCandidates = useCallback(
    async (params) => {
      const data = await getCandidates({ limit: CANDIDATE_LIMIT, ...params })
      return (data?.features ?? [])
        .filter((feature) => hasPointCoordinates(feature) && feature?.properties?.complex_id)
        .map(candidateToDetection)
    },
    [],
  )

  const loadCounts = useCallback(async (params) => {
    const data = await getCandidateCounts(params)
    return mapCounts(data)
  }, [])

  const refresh = useCallback(
    async (jobId = scanJobId) => {
      setLoading(true)
      try {
        const [globalList, globalCounts, groundTruth] = await Promise.all([
          loadCandidates({ scope: 'all' }),
          loadCounts({ scope: 'all' }),
          getGroundTruth({ limit: 5000 }),
        ])

        setDetections(globalList)
        setCountsByScope((current) => ({ ...current, global: globalCounts }))
        setTrbRegistry(
          (groundTruth?.features ?? [])
            .filter(hasPointCoordinates)
            .map(groundTruthToTrb),
        )

        const currentJobId = mostRecentJobId(globalList, jobId)
        if (currentJobId) {
          const [currentList, currentCounts] = await Promise.all([
            loadCandidates({ scan_job_id: currentJobId }),
            loadCounts({ scan_job_id: currentJobId }),
          ])
          setScanDetections(currentList)
          setCountsByScope((current) => ({ ...current, current: currentCounts }))
        } else {
          setScanDetections([])
          setCountsByScope((current) => ({ ...current, current: INITIAL_COUNTS }))
        }
      } catch (error) {
        addToast(error.message || 'Failed to load registry data', 'error')
      } finally {
        setLoading(false)
      }
    },
    [addToast, loadCandidates, loadCounts, scanJobId],
  )

  useEffect(() => {
    refresh(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const runScan = useCallback(
    async ({ label, points, bounds, confidence }) => {
      if (scanStatus === 'RUNNING') return false
      if (!points?.length && !bounds) {
        addToast('Unable to determine a scan sector', 'error')
        return false
      }

      const aoi =
        points?.length >= 3 ? aoiPolygonFromPoints(points) : aoiPolygonFromBounds(bounds)
      const threshold = clampThreshold(confidence)

      setScanStatus('RUNNING')
      setTelemetry((current) => ({
        ...current,
        tilesDone: 0,
        tilesTotal: 0,
        percent: 0,
        label,
        threshold,
      }))

      try {
        const submission = await submitScan({
          name: label,
          aoi,
          confidenceThreshold: threshold,
        })
        setScanJobId(submission.job_id)
        setTelemetry((current) => ({
          ...current,
          tilesTotal: submission.total_tiles ?? 0,
        }))

        const startedAt = Date.now()
        let status = submission.status ?? 'PENDING'
        let job = null
        while (status === 'PENDING' || status === 'RUNNING') {
          await sleep(POLL_INTERVAL_MS)
          job = await getScanStatus(submission.job_id)
          status = job.status
          const total = job.total_tiles || submission.total_tiles || 0
          setTelemetry((current) => ({
            ...current,
            tilesDone: job.processed_tiles ?? 0,
            tilesTotal: total,
            percent: total ? Math.round(((job.processed_tiles ?? 0) / total) * 100) : 0,
          }))
          if (Date.now() - startedAt > MAX_SCAN_MS) break
        }

        if (status === 'FAILED' || status === 'CANCELLED') {
          setScanStatus('IDLE')
          addToast(`Scan ${status.toLowerCase()}`, 'error')
          return false
        }

        const completedAt = new Date().toISOString()
        setSectors((current) => [
          {
            id: `SECTOR-${Date.now()}`,
            name: label,
            timestamp: completedAt,
            status: 'COMPLETED',
            bounds,
          },
          ...current,
        ])
        setTelemetry((current) => ({
          ...current,
          tilesDone: current.tilesTotal,
          percent: 100,
          lastScan: completedAt,
          label,
          threshold,
        }))

        await refresh(submission.job_id)

        let geminiCount = 0
        if (geminiLocate) {
          const apiKey = getGeminiKey()
          if (!apiKey) {
            setGeminiStatus('Gemini: no API key — model detections hidden')
            addToast('Gemini-only mode is on but no API key is saved', 'info')
          } else {
            setGeminiStatus('Gemini: checking candidate barns…')
            try {
              const located = await locateBarnsInBounds({
                bounds,
                label,
                apiKey,
                trbRegistry,
              })
              geminiCount = located.length
              setGeminiStatus(
                located.length
                  ? `Gemini: ${located.length} barn${located.length === 1 ? '' : 's'} confirmed`
                  : 'Gemini: no barns confirmed',
              )
              if (located.length) {
                setScanDetections((current) => [...located, ...current])
                setCountsByScope((current) => ({
                  ...current,
                  current: {
                    ...current.current,
                    waiting: (current.current.waiting ?? 0) + located.length,
                    total: (current.current.total ?? 0) + located.length,
                  },
                }))
              }
            } catch (error) {
              setGeminiStatus(`Gemini: error — ${error.message}`)
              addToast(`Gemini locate skipped: ${error.message}`, 'info')
            }
          }
        } else {
          setGeminiStatus('Model detector active (Gemini off)')
        }

        setActiveTab('current')
        setStatusFilter('all')
        setScanStatus('IDLE')

        const found = geminiLocate ? geminiCount : (job?.detected_complexes ?? 0) + geminiCount
        addToast(
          geminiLocate
            ? geminiCount
              ? `Gemini confirmed ${geminiCount} barn${geminiCount === 1 ? '' : 's'}`
              : 'Gemini found no confirmed barns in this scan'
            : found
              ? `${found} candidate structure${found === 1 ? '' : 's'} flagged for review${
                  geminiCount ? ` (${geminiCount} by Gemini)` : ''
                }`
              : 'Scan complete — no detections returned. Inspect the imagery manually.',
          found ? 'success' : 'info',
        )
        return true
      } catch (error) {
        setScanStatus('IDLE')
        addToast(error.message || 'Scan request failed', 'error')
        return false
      }
    },
    [addToast, geminiLocate, refresh, scanStatus, trbRegistry],
  )

  const clearScan = useCallback(() => {
    setActiveTab('global')
    setStatusFilter('waiting')
    setScanStatus('IDLE')
    setTelemetry((current) => ({
      ...current,
      tilesDone: 0,
      percent: 0,
      label: 'No sector selected',
      lastScan: null,
    }))
  }, [])

  const selectStatusFilter = useCallback((status) => {
    setStatusFilter((current) => (current === status ? 'all' : status))
  }, [])

  const removeDetection = useCallback(
    (detectionId) => {
      setDismissedIds((current) => {
        if (current.has(detectionId)) return current
        const next = new Set(current)
        next.add(detectionId)
        persistDismissed(next)
        return next
      })
      setSelectedId((current) => (current === detectionId ? null : current))
      addToast('Wrongly mapped barn removed from the approval queue', 'info')
    },
    [addToast],
  )

  const removeAllDetections = useCallback(() => {
    const all = [...detections, ...scanDetections]
    const visible = geminiLocate ? all.filter((item) => item.source === 'gemini') : all
    if (!visible.length) return
    setDismissedIds((current) => {
      const next = new Set(current)
      visible.forEach((detection) => next.add(detection.id))
      persistDismissed(next)
      return next
    })
    setSelectedId(null)
    addToast(
      `${visible.length} barn${visible.length === 1 ? '' : 's'} removed from the approval queue`,
      'info',
    )
  }, [addToast, detections, geminiLocate, scanDetections])

  const resetFilters = useCallback(() => {
    setStatusFilter('all')
    setTrbFilter('all')
    setBandFilter('all')
    setMinPriority(0)
    setPage(1)
  }, [])

  const deleteSector = useCallback(
    (sectorId) => {
      setSectors((current) => current.filter((sector) => sector.id !== sectorId))
      addToast('Pre-scanned sector removed', 'info')
    },
    [addToast],
  )

  const submitReview = useCallback(
    async (detectionId, status, reason = null) => {
      const detection =
        detections.find((item) => item.id === detectionId) ??
        scanDetections.find((item) => item.id === detectionId)
      if (!detection) {
        addToast('Detection not found', 'error')
        return false
      }
      if (status === 'rejected' && !reason) {
        addToast('Select a frozen rejection reason first', 'error')
        return false
      }

      const isGeminiLocal = detection.source === 'gemini'
      setReviewing(true)
      try {
        if (!isGeminiLocal) {
          await verifyCandidate(detectionId, {
            verdict: verdictFor(status, detection.trbState),
            rejection_reason: status === 'rejected' ? reason : null,
            detection_id: null,
            notes: null,
          })
        }

        const patch = (item) =>
          item.id === detectionId
            ? {
                ...item,
                status,
                rejectionReason: status === 'rejected' ? reason : null,
              }
            : item

        setDetections((current) => current.map(patch))
        setScanDetections((current) => current.map(patch))

        if (!isGeminiLocal) {
          Promise.allSettled([
            loadCounts({ scope: 'all' }).then((value) =>
              setCountsByScope((current) => ({ ...current, global: value })),
            ),
            scanJobId
              ? loadCounts({ scan_job_id: scanJobId }).then((value) =>
                  setCountsByScope((current) => ({ ...current, current: value })),
                )
              : Promise.resolve(),
          ])
        }

        addToast(
          `${detectionId.slice(0, 8)} marked ${STATUS_META[status]?.shortLabel ?? status}`,
          status === 'rejected' ? 'info' : 'success',
        )
        return true
      } catch (error) {
        addToast(error.message || 'Review request failed', 'error')
        return false
      } finally {
        setReviewing(false)
      }
    },
    [addToast, detections, loadCounts, scanDetections, scanJobId],
  )

  const exportRejectedToLearning = useCallback(async () => {
    setExporting(true)
    try {
      const result = await exportRejectedNegatives()
      const rejected = [...detections, ...scanDetections].filter(
        (detection) => detection.status === 'rejected',
      )
      if (rejected.length) {
        downloadJson(
          {
            exportedAt: new Date().toISOString(),
            purpose: 'active-learning',
            server: result,
            count: rejected.length,
            detections: rejected.map((detection) => ({
              complexId: detection.complexId,
              lat: detection.lat,
              lng: detection.lng,
              bbox: detection.bbox,
              area: detection.area,
              confidence: detection.confidence,
              priority: detection.priority,
              rejectionReason: detection.rejectionReason,
              sector: detection.sector,
              detectedAt: detection.detectedAt,
            })),
          },
          `kutsaga-rejected-${new Date().toISOString().slice(0, 10)}.json`,
        )
      }
      addToast(
        `Exported ${result?.exported_new ?? 0} new hard negatives (${result?.evaluated ?? 0} evaluated)`,
        'success',
      )
    } catch (error) {
      addToast(error.message || 'Export request failed', 'error')
    } finally {
      setExporting(false)
    }
  }, [addToast, detections, scanDetections])

  return {
    detections,
    scanDetections,
    allDetections,
    filteredDetections,
    trbRegistry,
    sectors,
    activeTab,
    setActiveTab,
    statusFilter,
    selectStatusFilter,
    setStatusFilter,
    trbFilter,
    setTrbFilter,
    bandFilter,
    setBandFilter,
    minPriority,
    setMinPriority,
    page: safePage,
    pageCount,
    setPage,
    pageRows,
    counts,
    loading,
    refresh,
    selectedDetection,
    selectedId,
    selectDetection: setSelectedId,
    clearSelection: () => setSelectedId(null),
    removeDetection,
    removeAllDetections,
    scanJobId,
    scanStatus,
    telemetry,
    runScan,
    clearScan,
    toasts,
    addToast,
    dismissToast,
    taxonomyOpen,
    setTaxonomyOpen,
    geminiLocate,
    setGeminiLocate,
    geminiStatus,
    toggleGeminiLocate,
    exporting,
    exportRejectedToLearning,
    reviewing,
    submitReview,
    deleteSector,
    resetFilters,
  }
}
